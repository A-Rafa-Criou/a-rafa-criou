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
            // 2. bcrypt moderno ($2y$/$2b$) - usado por WordPress moderno
            const hash = dbUser.legacyPasswordHash;

            console.log(`🔐 Login de usuário com senha legada: ${credentials.email}`);
            console.log(`   Tipo de hash: ${hash.substring(0, 4)}...`);

            if (hash.startsWith('$P$') || hash.startsWith('$H$')) {
              // phpass tradicional do WordPress antigo
              console.log('   Validando phpass tradicional localmente...');
              isPasswordValid = verifyWordPressPassword(credentials.password, hash);
              if (isPasswordValid) {
                console.log('   ✅ phpass válido!');
              }
            } else if (hash.startsWith('$wp$')) {
              // Hash com prefixo $wp$ do CSV
              // Remover o prefixo e tentar validar com bcrypt
              console.log('   Detectado prefixo $wp$ - removendo para validação...');
              const hashWithoutPrefix = hash.replace(/^\$wp\$/, '$');

              try {
                isPasswordValid = await bcrypt.compare(credentials.password, hashWithoutPrefix);
                if (isPasswordValid) {
                  console.log('   ✅ Senha válida após remover prefixo $wp$!');
                } else {
                  console.log(
                    '   ❌ Senha inválida - usuário precisará usar "Esqueci minha senha"'
                  );
                }
              } catch (error) {
                console.log('   ❌ Erro na validação:', error);
              }
            } else if (hash.startsWith('$2y$') || hash.startsWith('$2b$')) {
              // bcrypt do WordPress moderno
              // Tentar validar localmente (WordPress não existe mais)
              console.log('   Validando bcrypt localmente...');

              try {
                isPasswordValid = await bcrypt.compare(credentials.password, hash);
                if (isPasswordValid) {
                  console.log('   ✅ Hash bcrypt válido localmente!');
                } else {
                  console.log(
                    '   ❌ Hash bcrypt inválido - usuário precisará usar "Esqueci minha senha"'
                  );
                }
              } catch (error) {
                console.log('   ❌ Erro na validação bcrypt:', error);
              }
            } else {
              console.log(`   ⚠️  Formato de hash desconhecido: ${hash.substring(0, 10)}...`);
            }

            // Se senha correta, gerar hash novo e limpar campos legados
            if (isPasswordValid) {
              console.log('   🔄 Gerando hash novo com bcrypt...');
              // IMPORTANTE: Gerar um hash NOVO com bcrypt usando a senha que o usuário digitou
              const newHash = await bcrypt.hash(credentials.password, 10);

              await db
                .update(users)
                .set({
                  password: newHash, // Hash NOVO gerado com bcrypt
                  legacyPasswordHash: null,
                  legacyPasswordType: null,
                })
                .where(eq(users.id, dbUser.id));

              console.log('   ✅ Senha migrada com sucesso!');
            } else {
              console.log('   ❌ Senha inválida');
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
              phone: users.phone,
              image: users.image,
            })
            .from(users)
            .where(eq(users.id, token.sub))
            .limit(1);

          if (dbUser) {
            session.user.name = dbUser.name;
            session.user.email = dbUser.email;
            session.user.phone = dbUser.phone;
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
