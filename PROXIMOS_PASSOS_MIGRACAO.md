# 🚀 PRÓXIMOS PASSOS - MIGRAÇÃO COMPLETA

## ✅ O QUE JÁ ESTÁ PRONTO

- ✅ Sistema de downloads implementado (tabelas + scripts)
- ✅ 1376 usuários importados  
- ✅ Pedidos importados
- ✅ CSV `downloads-permissions.csv` existe
- ✅ Scripts de importação prontos

## ❌ O QUE FALTA (ORDEM DE EXECUÇÃO)

### 1️⃣ EXPORTAR PRODUTOS DO WORDPRESS (fazer agora)

**📁 Arquivo pronto:** `scripts/migration/export-produtos-adminer.sql`

**No Adminer (web interface do WordPress):**

1. **Acesse:** `https://seu-site.com/adminer` (ou localhost se for local)

2. **Faça login** com as credenciais do MySQL do WordPress

3. **Selecione o banco de dados** do WordPress

4. **Clique em "SQL command"** (Comando SQL)

5. **Abra o arquivo:** `scripts/migration/export-produtos-adminer.sql`

6. **Copie e cole** a query completa no Adminer

7. **Clique em "Execute"** (Executar)

8. **Aguarde** (pode levar 10-30 segundos dependendo da quantidade de produtos)

9. **Quando aparecer a tabela de resultados:**
   - Clique em **"Export"** (ícone de download no topo)
   - Escolha **Format: CSV**
   - Escolha **Output: save** (salvar arquivo)
   - Escolha **Encoding: UTF-8 with BOM** ⚠️ IMPORTANTE!
   
10. **Baixe o arquivo**

11. **Renomeie para:** `produtos-completo.csv`

12. **Coloque em:** `C:\Users\eddua\a-rafa-criou\data\test\produtos-completo.csv`

---

**⚠️ IMPORTANTE:** 
- Use **UTF-8 with BOM** no encoding (senão dá erro de caracteres especiais)
- NÃO use OUTFILE (você não tem permissão, por isso o erro 1045)
- O arquivo pode ter 500-2000 linhas (produtos + variações)

---

### 2️⃣ IMPORTAR PRODUTOS NO NEXT.JS

Depois de ter o CSV:

```bash
npx tsx scripts/migration/import-products-completo.ts data/test/produtos-completo.csv
```

**O que esse script faz:**
- Importa produtos principais
- Importa variações de produtos
- Cria categorias automaticamente
- Limpa descrições HTML
- Gera slugs únicos

---

### 3️⃣ CRIAR PERMISSÕES DE DOWNLOAD

**OPÇÃO A: Criar automaticamente** (recomendado para testes)

```bash
npx tsx scripts/migration/create-download-permissions.ts
```

Cria permissões para TODOS os pedidos completed/processing:
- ✅ Downloads ilimitados
- ✅ Sem expiração
- ✅ Baseado nos orderItems já importados

**OPÇÃO B: Importar do WordPress** (dados reais)

```bash
npx tsx scripts/migration/import-downloads.ts data/test/downloads-permissions.csv
```

Usa os dados EXATOS do WooCommerce:
- ✅ Limites de download originais
- ✅ Datas de expiração originais  
- ✅ Histórico de downloads

---

## 🔍 VERIFICAÇÃO FINAL

Depois de tudo importado, verifique:

```bash
# 1. Verificar produtos importados
npx tsx -e "
import { db } from './src/lib/db/index.js';
import { products } from './src/lib/db/schema.js';
const count = await db.select().from(products);
console.log('✅ Produtos:', count.length);
process.exit(0);
"

# 2. Verificar permissões de download
npx tsx -e "
import { db } from './src/lib/db/index.js';
import { downloadPermissions } from './src/lib/db/schema.js';
const count = await db.select().from(downloadPermissions);
console.log('✅ Permissões:', count.length);
process.exit(0);
"
```

---

## 📊 RESUMO DA MIGRAÇÃO

| Item | Status | Quantidade |
|------|--------|-----------|
| Usuários | ✅ Importado | 1376 |
| Pedidos | ✅ Importado | ? |
| Order Items | ✅ Importado | ? |
| **Produtos** | ❌ **PENDENTE** | 0 |
| **Permissões** | ❌ **PENDENTE** | 0 |

---

## ⚠️ IMPORTANTE

1. **Ordem correta:** Produtos → Permissões (permissões dependem de produtos)
2. **CSV de produtos:** DEVE ter colunas: `product_id`, `name`, `slug`, `price`, `product_type`, `parent_id`
3. **UTF-8 BOM:** Exportar CSV com encoding UTF-8 BOM no Adminer/phpMyAdmin
4. **Backup:** Sempre faça backup do banco antes de importar

---

## 🆘 SE DER ERRO

### "Produto WP #XXXX não encontrado no banco"
→ Significa que você pulou a importação de produtos. Execute o passo 2.

### "CSV não encontrado"
→ Verifique o caminho do arquivo. Deve estar em `data/test/`

### "Erro de encoding" 
→ Reexporte o CSV como UTF-8 com BOM

---

## ✨ DEPOIS DE TUDO

Teste o fluxo completo:

1. Login com usuário migrado ✅
2. Ver pedidos na conta ✅  
3. Gerar link de download ✅
4. Baixar PDF ✅
5. Verificar limite de downloads ✅

---

**Criado em:** 2025-01-XX  
**Sistema:** WordPress/WooCommerce → Next.js + Cloudflare R2
