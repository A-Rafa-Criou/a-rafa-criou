import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// EmailProvider temporariamente desabilitado - requer configuração adicional de adapter
// import EmailProvider from 'next-auth/providers/email';
// import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { verifyWordPressPassword } from '@/lib/auth/wordpress-password';
// import { Resend } from 'resend';

// const resend = new Resend(process.env.RESEND_API_KEY);

export const authOptions: NextAuthOptions = {
  // Adapter necessário para EmailProvider - será implementado em versão futura
  // adapter: DrizzleAdapter(db, {
  //   usersTable: users,
  //   accountsTable: accounts,
  //   sessionsTable: sessions,
  //   verificationTokensTable: verificationTokens,
  // }),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Buscar usuário no banco
          const user = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (user.length === 0) {
            return null;
          }

          const dbUser = user[0];

          let isPasswordValid = false;

          // MIGRAÇÃO WORDPRESS: Verificar senha legada
          if (dbUser.legacyPasswordType === 'wordpress_phpass' && dbUser.legacyPasswordHash) {
            // Hash do WordPress pode ser:
            // 1. phpass tradicional ($P$ ou $H$) - 34 chars
            // 2. bcrypt moderno ($2y$) - usado por alguns plugins
            const hash = dbUser.legacyPasswordHash;

            if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
              // phpass tradicional
              isPasswordValid = verifyWordPressPassword(credentials.password, hash);
            } else if (hash.startsWith('$wp$')) {
              // Hash com prefixo $wp$ - chamar WordPress API para validar

              try {
                const wpApiUrl =
                  process.env.WORDPRESS_API_URL ||
                  'https://arafacriou.com.br/wp-json/nextjs/v1/validate-password';
                const wpApiKey = process.env.WORDPRESS_API_KEY;

                if (!wpApiKey) {
                  console.error('❌ WORDPRESS_API_KEY não configurada!');
                  isPasswordValid = false;
                } else {
                  const response = await fetch(wpApiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-API-Key': wpApiKey,
                    },
                    body: JSON.stringify({
                      email: credentials.email,
                      password: credentials.password,
                    }),
                  });

                  if (response.ok) {
                    const data = await response.json();

                    if (data.valid && data.hash) {
                      // IMPORTANTE: NÃO usar o hash do WordPress (pode estar corrompido)
                      // Gerar um hash NOVO com bcrypt usando a senha que o usuário digitou
                      const newHash = await bcrypt.hash(credentials.password, 10);

                      // Atualizar com hash NOVO gerado com bcrypt
                      await db
                        .update(users)
                        .set({
                          password: newHash, // ✅ Hash NOVO gerado com bcrypt
                          legacyPasswordHash: null,
                          legacyPasswordType: null,
                        })
                        .where(eq(users.id, dbUser.id));

                      isPasswordValid = true;
                    } else {
                      isPasswordValid = false;
                    }
                  } else {
                    console.error(
                      `❌ Erro na WordPress API: ${response.status} ${response.statusText}`
                    );
                    isPasswordValid = false;
                  }
                }
              } catch (error) {
                console.error('❌ Erro ao chamar WordPress API:', error);
                isPasswordValid = false;
              }
            } else if (hash.startsWith('$2y$') || hash.startsWith('$2b$')) {
              // bcrypt (WordPress moderno ou WooCommerce)

              isPasswordValid = await bcrypt.compare(credentials.password, hash);
            } else {
              console.warn('Formato de hash desconhecido');
            }

            // Se senha correta, gerar hash novo e limpar campos legados
            if (isPasswordValid) {
              // IMPORTANTE: NÃO usar o hash do WordPress (pode estar corrompido)
              // Gerar um hash NOVO com bcrypt usando a senha que o usuário digitou
              const newHash = await bcrypt.hash(credentials.password, 10);

              await db
                .update(users)
                .set({
                  password: newHash, // Hash NOVO gerado com bcrypt
                  legacyPasswordHash: null,
                  legacyPasswordType: null,
                })
                .where(eq(users.id, dbUser.id));
            }
          }
          // Verificar senha bcrypt normal
          else if (dbUser.password) {
            isPasswordValid = await bcrypt.compare(credentials.password, dbUser.password);
          } else {
            // Usuário sem senha
            return null;
          }

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name || undefined,
            role: dbUser.role,
            // NÃO incluir image aqui - será buscada no callback session
          };
        } catch {
          return null;
        }
      },
    }),
    // EmailProvider temporariamente desabilitado - requer adapter database-session
    // Será implementado em versão futura
    // EmailProvider({
    //   server: '',
    //   from: 'A Rafa Criou <noreply@arafacriou.com.br>',
    //   async sendVerificationRequest({ identifier: email, url }) {
    //     // Implementation here
    //   },
    // }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      if (token?.sub && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role as string;

        // Buscar dados atualizados do usuário do banco (incluindo imagem)
        // Isso evita colocar base64 no JWT token (causa HTTP 431)
        try {
          const [dbUser] = await db
            .select({
              name: users.name,
              email: users.email,
              image: users.image,
            })
            .from(users)
            .where(eq(users.id, token.sub))
            .limit(1);

          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            session.user.image = dbUser.image;
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário na sessão:', error);
        }
      }
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.role = user.role;
        // NÃO salvar image no token - causa HTTP 431 com base64
      }
      return token;
    },
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler };
