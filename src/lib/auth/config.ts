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
            console.log(`🔄 Verificando senha WordPress para: ${dbUser.email}`);
            console.log(`   Tipo: ${dbUser.legacyPasswordType}`);

            // Hash do WordPress pode ser:
            // 1. phpass tradicional ($P$ ou $H$) - 34 chars
            // 2. bcrypt moderno ($2y$) - usado por alguns plugins
            const hash = dbUser.legacyPasswordHash;
            console.log(`   Hash original: ${hash.substring(0, 20)}... (${hash.length} chars)`);

            if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
              // phpass tradicional
              console.log(`   Formato: phpass tradicional`);
              isPasswordValid = verifyWordPressPassword(credentials.password, hash);
            } else if (hash.startsWith('$wp$')) {
              // Hash com prefixo $wp$ - chamar WordPress API para validar
              console.log(`   Formato: WordPress com prefixo $wp$ - chamando API...`);

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
                      console.log(`✅ WordPress API validou senha com sucesso!`);
                      console.log(
                        `   Hash recebido da API: ${data.hash.substring(0, 20)}... (${data.hash.length} chars)`
                      );

                      // IMPORTANTE: NÃO usar o hash do WordPress (pode estar corrompido)
                      // Gerar um hash NOVO com bcrypt usando a senha que o usuário digitou
                      const newHash = await bcrypt.hash(credentials.password, 10);
                      console.log(
                        `   Hash novo gerado: ${newHash.substring(0, 20)}... (${newHash.length} chars)`
                      );

                      // Atualizar com hash NOVO gerado com bcrypt
                      await db
                        .update(users)
                        .set({
                          password: newHash, // ✅ Hash NOVO gerado com bcrypt
                          legacyPasswordHash: null,
                          legacyPasswordType: null,
                        })
                        .where(eq(users.id, dbUser.id));

                      console.log(`✅ Hash atualizado no banco! Usuário migrado automaticamente.`);
                      isPasswordValid = true;
                    } else {
                      console.log(`❌ WordPress API retornou senha inválida`);
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
              console.log(`   Formato: bcrypt moderno (${hash.substring(0, 10)}...)`);

              isPasswordValid = await bcrypt.compare(credentials.password, hash);
              console.log(`   Resultado bcrypt.compare: ${isPasswordValid}`);
            } else {
              console.log(`⚠️  Formato de hash desconhecido: ${hash.substring(0, 10)}...`);
            }

            // Se senha correta, gerar hash novo e limpar campos legados
            if (isPasswordValid) {
              console.log(`✅ Senha WordPress válida! Gerando hash bcrypt novo...`);

              // IMPORTANTE: NÃO usar o hash do WordPress (pode estar corrompido)
              // Gerar um hash NOVO com bcrypt usando a senha que o usuário digitou
              const newHash = await bcrypt.hash(credentials.password, 10);
              console.log(
                `   Hash novo gerado: ${newHash.substring(0, 20)}... (${newHash.length} chars)`
              );

              await db
                .update(users)
                .set({
                  password: newHash, // Hash NOVO gerado com bcrypt
                  legacyPasswordHash: null,
                  legacyPasswordType: null,
                })
                .where(eq(users.id, dbUser.id));

              console.log(`✅ Migração concluída: ${dbUser.email}`);
            } else {
              console.log(`❌ Senha inválida para: ${dbUser.email}`);
            }
          }
          // Verificar senha bcrypt normal
          else if (dbUser.password) {
            console.log(`🔑 Verificando senha bcrypt normal para: ${dbUser.email}`);
            isPasswordValid = await bcrypt.compare(credentials.password, dbUser.password);
            console.log(`   Resultado: ${isPasswordValid}`);
          } else {
            console.log(`❌ Usuário sem senha: ${dbUser.email}`);
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
      }
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
  secret: process.env.AUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler };
