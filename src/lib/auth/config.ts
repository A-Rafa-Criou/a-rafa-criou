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

          // MIGRAÇÃO WORDPRESS: Verificar se é senha legada do WordPress
          if (dbUser.legacyPasswordType === 'wordpress_phpass' && dbUser.legacyPasswordHash) {
            console.log(`🔄 Verificando senha WordPress para: ${dbUser.email}`);
            
            isPasswordValid = verifyWordPressPassword(
              credentials.password,
              dbUser.legacyPasswordHash
            );

            // Se senha correta, converter para bcrypt (mais seguro)
            if (isPasswordValid) {
              console.log(`✅ Senha WordPress válida! Convertendo para bcrypt...`);
              
              const newHash = await bcrypt.hash(credentials.password, 10);
              
              await db.update(users).set({
                password: newHash,
                legacyPasswordHash: null,
                legacyPasswordType: null,
              }).where(eq(users.id, dbUser.id));

              console.log(`✅ Senha convertida para bcrypt: ${dbUser.email}`);
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
