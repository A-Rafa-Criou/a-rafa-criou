# 📦 Guia: Importar Arquivos para Download do WordPress

## ✅ Pré-requisitos

- Acesso ao banco de dados WordPress (phpMyAdmin ou Adminer)
- Produtos já importados no novo sistema
- Arquivos já devem estar no Cloudflare R2 (ou migrar depois)

## 📋 Passo 1: Exportar Metadados do WordPress

### 1.1. Acesse o banco de dados WordPress

- **phpMyAdmin**: `https://seu-site.com/phpmyadmin`
- **Adminer**: `https://seu-site.com/adminer.php`

### 1.2. Execute a query SQL

1. Abra a aba **SQL**
2. Copie e cole o conteúdo de `scripts/migration/export-downloadable-files.sql`
3. Clique em **Executar** ou **Go**

### 1.3. Exporte o resultado

1. Após executar a query, você verá uma tabela com os resultados
2. Clique em **Exportar** ou **Export**
3. Formato: **CSV**
4. Configurações:
   - Delimitador de campos: `,` (vírgula)
   - Delimitador de string: `"` (aspas duplas)
   - Incluir nomes de colunas: **SIM**
5. Salve o arquivo como: `downloadable-files.csv`

### 1.4. Mova o arquivo para o projeto

Coloque o arquivo CSV em:
```
data/test/downloadable-files.csv
```

## 📥 Passo 2: Importar Arquivos no Novo Sistema

### 2.1. Execute o script de importação

```powershell
npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv
```

### 2.2. O que o script faz?

1. ✅ Lê o CSV exportado do WordPress
2. ✅ Desserializa os arrays PHP (`_downloadable_files`)
3. ✅ Busca os produtos no novo banco (via `wp_product_id`)
4. ✅ Extrai nome e caminho de cada arquivo
5. ✅ Detecta MIME type pela extensão
6. ✅ Insere na tabela `files`
7. ⏭️ **PULA variações** (não têm `wpVariationId` no schema)

### 2.3. Resultado esperado

```
📦 Importando arquivos para download do WordPress...

📊 Total de registros no CSV: 150

✅ Arquivo importado: Meu PDF.pdf (Produto WP #123)
✅ Arquivo importado: Outro Arquivo.pdf (Produto WP #456)
⏭️  Variação WP #789 - variações não suportadas ainda - SKIP
⏭️  Produto WP #999 não encontrado - SKIP

📊 Resumo da importação:
   ✅ Arquivos importados: 120
   ⏭️  Registros ignorados: 25
   ❌ Erros: 5
   📦 Total processado: 150
```

## 🔍 Passo 3: Verificar Importação

Execute o script de verificação:

```powershell
npx tsx scripts/check-files-table.ts
```

Você deve ver algo como:

```
📊 Total de arquivos na tabela files: 120
📊 Arquivos vinculados a produtos: 120
📊 Produtos SEM arquivo: 717
```

## ⚠️ IMPORTANTE: Migrar Arquivos Físicos

Os metadados foram importados, mas os **arquivos físicos ainda estão no servidor WordPress**.

### Opção A: Manter URLs do WordPress (temporário)

O campo `path` agora contém a URL do WordPress:
- Exemplo: `https://old-site.com/wp-content/uploads/2024/01/arquivo.pdf`
- **Funciona**, mas depende do servidor antigo

### Opção B: Migrar para Cloudflare R2 (recomendado)

1. **Baixar todos os PDFs do WordPress**:
   ```bash
   wget -r -np -nd -A pdf https://old-site.com/wp-content/uploads/
   ```

2. **Upload para R2 via Wrangler**:
   ```bash
   wrangler r2 object put a-rafa-criou/pdfs/arquivo.pdf --file=arquivo.pdf
   ```

3. **Atualizar paths no banco**:
   ```sql
   UPDATE files 
   SET path = REPLACE(path, 'https://old-site.com/wp-content/uploads/', 'pdfs/')
   WHERE path LIKE 'https://old-site.com/wp-content/uploads/%';
   ```

## 🐛 Problemas Comuns

### ❌ "Produto WP #XXX não encontrado"

**Causa**: Produto não foi importado ou tem ID diferente

**Solução**:
1. Verifique se o produto existe: `SELECT * FROM products WHERE wp_product_id = XXX`
2. Se não existir, re-importe produtos: `npx tsx scripts/migration/import-products-completo.ts`

### ❌ "Erro ao desserializar JSON"

**Causa**: Dado corrompido no `_downloadable_files` do WordPress

**Solução**: Verifique manualmente no WordPress Admin → Produtos → Downloadable Files

### ❌ "Variação não suportada"

**Causa**: Variações não têm `wpVariationId` no schema atual

**Solução**: 
1. Adicionar campo ao schema:
   ```typescript
   wpVariationId: integer('wp_variation_id').unique(),
   ```
2. Rodar migração
3. Atualizar script de importação

## ✅ Próximos Passos

Após importar os arquivos:

1. ✅ Testar download no frontend (`/conta/pedidos/[id]`)
2. ✅ Verificar se botão de download aparece
3. ✅ Clicar e verificar se arquivo baixa
4. 🔄 Migrar arquivos físicos para R2 (se ainda não fez)
5. 🔐 Configurar assinatura de URLs (já implementado)

## 📚 Arquivos Relacionados

- `scripts/migration/export-downloadable-files.sql` - Query SQL para exportar
- `scripts/migration/import-downloadable-files.ts` - Script de importação
- `scripts/check-files-table.ts` - Verificação de arquivos
- `src/lib/db/schema.ts` - Schema da tabela `files`
- `src/app/api/orders/download/route.ts` - API de download
