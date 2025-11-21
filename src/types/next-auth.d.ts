import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    phone?: string | null;
    image?: string | null;
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      phone?: string | null;
      image?: string | null;
      role?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
  }
}
