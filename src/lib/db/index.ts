import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Carrega .env.local se não for Next.js runtime (para scripts standalone)
if (!process.env.NEXT_RUNTIME && !process.env.DATABASE_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { config } = require('dotenv');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { resolve } = require('path');
    config({ path: resolve(process.cwd(), '.env.local') });
  } catch {
    // Ignora erro se dotenv não estiver disponível
  }
}

// Configuração da conexão com o banco
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
}

// Cliente postgres para queries com configuração SSL adequada para Neon
const client = postgres(connectionString, {
  max: 10,
  ssl: 'require',
  prepare: false,
  connect_timeout: 10,
});

// Instância do Drizzle
export const db = drizzle(client, { schema });

// Exportar cliente para uso direto se necessário
export { client };
