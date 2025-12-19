# 📚 INSTRUÇÕES PARA REPLICAR ESTE PROJETO

## 🎯 VISÃO GERAL DO PROJETO

Este é um **scaffold moderno para aplicações financeiras** construído com Next.js 15, TypeScript, Tailwind CSS 4, Prisma, Supabase e Socket.IO. O projeto serve como base para criar aplicações web profissionais com autenticação, banco de dados e comunicação em tempo real.

---

## 🏗️ ARQUITETURA DO PROJETO

### 1. **FRAMEWORK E ESTRUTURA BASE**

#### Next.js 15 com App Router

```typescript
// Estrutura de pastas App Router:
src/app/
  ├── layout.tsx          // Layout raiz da aplicação
  ├── page.tsx            // Página inicial
  ├── globals.css         // Estilos globais
  ├── api/                // API Routes
  │   └── health/         // Health check endpoint
  └── auth/               // Rotas de autenticação
      ├── layout.tsx      // Layout das páginas de auth
      ├── login/          // Página de login
      └── callback/       // Callback do Supabase
```

**COMO REPLICAR:**

1. Crie um projeto Next.js: `npx create-next-app@latest nome-projeto`
2. Escolha: TypeScript, App Router, Tailwind CSS
3. Configure o `next.config.ts` para standalone output se precisar de server customizado

---

### 2. **SISTEMA DE AUTENTICAÇÃO COM SUPABASE**

#### Componentes de Autenticação

```typescript
// Arquitetura de Auth:
src/components/auth/
  ├── AuthProvider.tsx    // Context Provider para auth
  ├── ProtectedRoute.tsx  // HOC para proteger rotas
  └── AuthHeader.tsx      // Header com info do usuário
```

#### AuthProvider - Context de Autenticação

```typescript
// FUNÇÃO: Gerenciar estado global de autenticação
// IMPLEMENTAÇÃO:
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// 1. Criar Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. Hook customizado para usar o context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// 3. Provider Component
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listener para mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Métodos de autenticação
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**COMO IMPLEMENTAR:**

1. Instale: `npm install @supabase/supabase-js`
2. Crie client do Supabase em `src/integrations/supabase/client.ts`
3. Configure variáveis de ambiente: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Envolva toda aplicação com `<AuthProvider>` no `layout.tsx` raiz

---

### 3. **SISTEMA DE UI COM SHADCN/UI**

#### Estrutura de Componentes

```typescript
// Componentes UI organizados:
src/components/ui/
  ├── button.tsx          // Botões com variants
  ├── input.tsx           // Inputs estilizados
  ├── card.tsx            // Cards para conteúdo
  ├── dialog.tsx          // Modais
  ├── dropdown-menu.tsx   // Menus dropdown
  ├── form.tsx            // Formulários com React Hook Form
  ├── table.tsx           // Tabelas responsivas
  ├── toast.tsx           // Notificações
  └── ... (40+ componentes)
```

**COMO IMPLEMENTAR:**

1. Inicialize shadcn/ui: `npx shadcn@latest init`
2. Configure `components.json` com seus paths
3. Adicione componentes conforme necessário: `npx shadcn@latest add button`
4. Todos os componentes são customizáveis via Tailwind

**EXEMPLO DE USO:**

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MyPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Título do Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Clique aqui</Button>
      </CardContent>
    </Card>
  );
}
```

---

### 4. **BANCO DE DADOS COM PRISMA**

#### Schema do Prisma

```prisma
// prisma/schema.prisma
// FUNÇÃO: Define estrutura do banco de dados

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Cliente Prisma

```typescript
// src/lib/db.ts
// FUNÇÃO: Singleton do Prisma Client

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**COMO IMPLEMENTAR:**

1. Instale: `npm install prisma @prisma/client`
2. Inicialize: `npx prisma init`
3. Configure `DATABASE_URL` no `.env`
4. Defina seus models no `schema.prisma`
5. Execute: `npx prisma migrate dev --name init`
6. Execute: `npx prisma generate`

**COMANDOS ÚTEIS:**

```bash
npm run db:push      # Push schema para DB sem migrations
npm run db:migrate   # Criar e aplicar migration
npm run db:generate  # Gerar Prisma Client
npm run db:reset     # Resetar database
```

---

### 5. **WEBSOCKET COM SOCKET.IO**

#### Servidor Customizado

```typescript
// server.ts
// FUNÇÃO: Next.js + Socket.IO no mesmo servidor

import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const port = 4000;
const hostname = '0.0.0.0';

async function createCustomServer() {
  // 1. Criar Next.js app
  const nextApp = next({ dev, dir: process.cwd() });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  // 2. Criar HTTP server
  const server = createServer((req, res) => {
    // Pular rotas do socket.io
    if (req.url?.startsWith('/api/socketio')) return;
    return handle(req, res);
  });

  // 3. Configurar Socket.IO
  const io = new Server(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // 4. Setup socket handlers
  setupSocket(io);

  // 5. Iniciar servidor
  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

createCustomServer();
```

#### Socket Handlers

```typescript
// src/lib/socket.ts
// FUNÇÃO: Lógica de eventos do WebSocket

import { Server } from 'socket.io';

export const setupSocket = (io: Server) => {
  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

    // Enviar mensagem de boas-vindas
    socket.emit('message', {
      text: 'Welcome to WebSocket Server!',
      senderId: 'system',
      timestamp: new Date().toISOString(),
    });

    // Listener para mensagens
    socket.on('message', msg => {
      // Broadcast para todos
      io.emit('message', {
        text: msg.text,
        senderId: msg.senderId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
```

**COMO IMPLEMENTAR:**

1. Instale: `npm install socket.io socket.io-client`
2. Crie `server.ts` na raiz do projeto
3. Configure script no `package.json`: `"dev": "tsx server.ts"`
4. Use `tsx` para rodar TypeScript: `npm install tsx --save-dev`

---

### 6. **GERENCIAMENTO DE ESTADO**

#### Zustand para Estado Global

```typescript
// Exemplo de store com Zustand
import { create } from 'zustand';

interface Store {
  count: number;
  increment: () => void;
  decrement: () => void;
}

export const useStore = create<Store>(set => ({
  count: 0,
  increment: () => set(state => ({ count: state.count + 1 })),
  decrement: () => set(state => ({ count: state.count - 1 })),
}));

// Usar no componente:
const { count, increment } = useStore();
```

#### TanStack Query para Data Fetching

```typescript
// Exemplo de query
import { useQuery } from '@tanstack/react-query';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
  });
}

// Usar no componente:
const { data, isLoading, error } = useUsers();
```

**COMO IMPLEMENTAR:**

1. Instale: `npm install zustand @tanstack/react-query`
2. Configure Query Client no layout raiz
3. Crie stores e hooks customizados conforme necessário

---

### 7. **FORMULÁRIOS COM REACT HOOK FORM + ZOD**

```typescript
// Exemplo completo de formulário
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// 1. Definir schema de validação
const formSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  // 2. Criar form com validação
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 3. Handler de submit
  const onSubmit = async (values: FormValues) => {
    try {
      // Lógica de submit
      console.log(values);
    } catch (error) {
      console.error(error);
    }
  };

  // 4. Renderizar formulário
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="seu@email.com" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" placeholder="******" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </Form>
  );
}
```

---

### 8. **ESTILIZAÇÃO COM TAILWIND CSS 4**

#### Configuração

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... mais cores
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

#### Variáveis CSS

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... mais variáveis */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... versões dark */
  }
}
```

---

### 9. **ESTRUTURA DE LAYOUT**

#### Layout Raiz

```typescript
// src/app/layout.tsx
// FUNÇÃO: Wrapper global da aplicação

import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seu App",
  description: "Descrição do app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

### 10. **API ROUTES**

```typescript
// src/app/api/health/route.ts
// FUNÇÃO: Health check endpoint

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
```

---

## 📦 DEPENDÊNCIAS PRINCIPAIS

### Core

- **next**: ^15.5.9 - Framework React
- **react**: ^19.0.0 - Biblioteca UI
- **typescript**: ^5 - TypeScript

### UI & Styling

- **tailwindcss**: ^4 - CSS framework
- **shadcn/ui**: Componentes (via CLI)
- **lucide-react**: ^0.525.0 - Ícones
- **framer-motion**: ^12.23.2 - Animações

### Forms & Validation

- **react-hook-form**: ^7.60.0 - Formulários
- **zod**: ^4.0.2 - Validação
- **@hookform/resolvers**: ^5.1.1 - Integração

### State & Data

- **zustand**: ^5.0.6 - Estado global
- **@tanstack/react-query**: ^5.82.0 - Data fetching
- **axios**: ^1.10.0 - HTTP client

### Database & Backend

- **prisma**: ^6.11.1 - ORM
- **@prisma/client**: ^6.11.1 - Prisma client
- **@supabase/supabase-js**: ^2.45.4 - Supabase client

### Real-time

- **socket.io**: ^4.8.1 - WebSocket server
- **socket.io-client**: ^4.8.1 - WebSocket client

### Advanced UI

- **@tanstack/react-table**: ^8.21.3 - Tabelas
- **recharts**: ^2.15.4 - Gráficos
- **@dnd-kit/core**: ^6.3.1 - Drag and drop

---

## 🚀 PASSO A PASSO COMPLETO PARA REPLICAR

### 1. Criar Projeto Base

```bash
npx create-next-app@latest meu-projeto
# Selecione: TypeScript, App Router, Tailwind CSS
cd meu-projeto
```

### 2. Instalar Dependências Core

```bash
npm install @supabase/supabase-js prisma @prisma/client
npm install socket.io socket.io-client
npm install zustand @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod
npm install axios date-fns
npm install tsx --save-dev
```

### 3. Configurar shadcn/ui

```bash
npx shadcn@latest init
npx shadcn@latest add button input card form dialog toast
```

### 4. Configurar Prisma

```bash
npx prisma init
# Edite prisma/schema.prisma
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Criar Estrutura de Pastas

```bash
mkdir -p src/components/auth
mkdir -p src/components/ui
mkdir -p src/integrations/supabase
mkdir -p src/lib
mkdir -p src/hooks
```

### 6. Criar Arquivo de Servidor

```bash
# Copie o conteúdo do server.ts
# Configure scripts no package.json
```

### 7. Configurar Variáveis de Ambiente

```env
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXT_PUBLIC_SUPABASE_URL="sua-url-supabase"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anon"
```

### 8. Implementar Autenticação

- Criar `src/integrations/supabase/client.ts`
- Criar `src/components/auth/AuthProvider.tsx`
- Criar `src/components/auth/ProtectedRoute.tsx`

### 9. Configurar Layout Raiz

- Adicionar AuthProvider no `src/app/layout.tsx`
- Configurar fontes e metadata

### 10. Testar

```bash
npm run dev
# Acesse http://localhost:4000
```

---

## 🎨 PATTERNS E BOAS PRÁTICAS

### 1. Organização de Componentes

```
- Componentes pequenos e focados (Single Responsibility)
- Client Components: 'use client' no topo
- Server Components: por padrão no App Router
```

### 2. Tratamento de Erros

```typescript
try {
  await action();
} catch (error) {
  console.error(error);
  toast({
    title: 'Erro',
    description: error.message,
    variant: 'destructive',
  });
}
```

### 3. Loading States

```typescript
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    await action();
  } finally {
    setLoading(false);
  }
};
```

### 4. TypeScript Strict

```typescript
// Sempre tipar props e retornos
interface Props {
  title: string;
  onClose: () => void;
}

export function MyComponent({ title, onClose }: Props) {
  // ...
}
```

---

## 🔧 SCRIPTS ÚTEIS

```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "next build",
    "start": "NODE_ENV=production tsx server.ts",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset"
  }
}
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Criar projeto Next.js
- [ ] Instalar dependências
- [ ] Configurar Tailwind CSS
- [ ] Setup shadcn/ui
- [ ] Configurar Prisma
- [ ] Criar cliente Supabase
- [ ] Implementar AuthProvider
- [ ] Criar servidor customizado com Socket.IO
- [ ] Configurar variáveis de ambiente
- [ ] Criar estrutura de pastas
- [ ] Implementar layouts
- [ ] Adicionar componentes UI
- [ ] Testar autenticação
- [ ] Testar WebSocket
- [ ] Configurar ESLint

---

## 🎯 PRÓXIMOS PASSOS APÓS REPLICAÇÃO

1. **Personalizar Design**: Ajuste cores no `tailwind.config.ts` e `globals.css`
2. **Adicionar Funcionalidades**: Implemente suas features específicas
3. **Criar Models**: Defina seus schemas no Prisma
4. **Implementar API Routes**: Crie endpoints necessários
5. **Deploy**: Configure para Vercel, Railway, ou outro provedor

---

## 📚 RECURSOS E DOCUMENTAÇÃO

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Socket.IO Docs](https://socket.io/docs/)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

---

## ⚠️ NOTAS IMPORTANTES

1. **Segurança**: Nunca commite arquivos `.env` com credentials reais
2. **TypeScript**: Use tipos estritos para evitar bugs
3. **Validação**: Sempre valide dados no servidor E no cliente
4. **Performance**: Use Server Components quando possível
5. **Acessibilidade**: shadcn/ui já inclui ARIA labels, mas teste com screen readers

---

## 🎓 CONCEITOS CHAVE

### Server vs Client Components

- **Server**: Renderiza no servidor, sem JavaScript no cliente
- **Client**: 'use client', para interatividade e hooks

### App Router vs Pages Router

- Este projeto usa **App Router** (Next.js 13+)
- Layouts aninhados, Server Components por padrão

### Prisma Workflow

1. Edite `schema.prisma`
2. `npx prisma migrate dev` - Cria migration
3. `npx prisma generate` - Atualiza client

### Supabase Auth Flow

1. Usuário faz login
2. Supabase retorna sessão
3. AuthProvider armazena em state
4. useAuth() acessa em qualquer componente

---

## ✅ CONCLUSÃO

Este scaffold fornece uma base sólida para aplicações modernas. Todos os componentes foram pensados para serem:

- **Modulares**: Fácil adicionar/remover
- **Escaláveis**: Arquitetura para crescimento
- **Manuteníveis**: Código limpo e organizado
- **Type-safe**: TypeScript em tudo

**Boa sorte com seu projeto! 🚀**
