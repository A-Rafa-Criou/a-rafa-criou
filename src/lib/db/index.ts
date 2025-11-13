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
    config({ path: resolve(process.cwd(), '.env') });
  } catch {
    // Ignora erro se dotenv não estiver disponível
  }
}

// Configuração da conexão com o banco
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
}

// Cliente postgres para queries com configuração otimizada para ALTA CONCORRÊNCIA
// 
// 🚀 ESTRATÉGIA PARA 1000+ USUÁRIOS SIMULTÂNEOS:
// - Neon Serverless Driver usa connection pooling externo (Neon Proxy)
// - Cada Edge Function pode ter até 10 conexões simultâneas
// - Com cache Redis, apenas 5-10% das requests vão pro banco
// - 1000 users → 50-100 requests ao banco (resto vem do cache)
const client = postgres(connectionString, {
  max: 10, // 🔥 AUMENTADO: Máximo de conexões por worker (Neon suporta bem isso)
  idle_timeout: 20, // Fechar conexões ociosas rapidamente (libera recursos)
  max_lifetime: 60 * 15, // 🔥 OTIMIZADO: Reciclar conexões a cada 15 minutos (evita conexões estagnadas)
  connect_timeout: 10, // Timeout de 10s para conectar
  ssl: 'require', // SSL obrigatório no Neon
  prepare: false, // Desabilita prepared statements (necessário para Neon)
  
  // 🚀 CONFIGURAÇÕES ADICIONAIS PARA PERFORMANCE:
  fetch_types: false, // Não buscar tipos do banco (economiza roundtrips)
  connection: {
    application_name: 'a-rafa-criou', // Identificar app no Neon dashboard
  },
});

// Instância do Drizzle
export const db = drizzle(client, { schema });

// Exportar cliente para uso direto se necessário
export { client };
