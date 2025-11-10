#!/bin/bash
set -e

echo "🔄 Aplicando migrações do banco de dados..."
npm run db:push

echo "🏗️ Iniciando build do Next.js..."
npm run build

echo "✅ Build concluído com sucesso!"
