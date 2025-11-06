# 🎯 GUIA RÁPIDO: Exportar Produtos do WordPress

## ❌ ERRO QUE VOCÊ TEVE

```
Access denied for user 'arafa7579363_wp57488'@'localhost' (using password: YES)
```

**Causa:** Você não tem permissão para usar `INTO OUTFILE` (exportação direta pelo SQL).

**Solução:** Usar interface web do Adminer para exportar manualmente.

---

## ✅ PASSO A PASSO CORRETO

### 1. Abrir Adminer

Acesse no navegador:

- **Produção:** `https://arafacriou.com/adminer` (ou o caminho do seu Adminer)
- **Local:** `http://localhost/adminer.php`

### 2. Fazer Login

Use as credenciais do MySQL que estão no `wp-config.php`:

- **Usuário:** `arafa7579363_wp57488` (ou seu usuário)
- **Senha:** A senha do banco de dados
- **Database:** Nome do banco WordPress

### 3. Executar Query

1. Clique em **"SQL command"** no menu superior
2. Abra o arquivo: `scripts/migration/export-produtos-adminer.sql`
3. Copie TODO o conteúdo da query
4. Cole no campo de texto do Adminer
5. Clique em **"Execute"** (botão verde)

**⏱️ Aguarde:** Pode levar 10-30 segundos (dependendo da quantidade de produtos)

### 4. Exportar Resultado

Quando a tabela de resultados aparecer:

1. **Clique em "Export"** (ícone de seta para baixo no topo)
2. **Configure:**
   - Format: **CSV**
   - Output: **save** (ou "gzip" se o arquivo for muito grande)
   - Encoding: **UTF-8** ✅ (ou UTF-8 with BOM)

3. **Clique em "Export"** (botão no final da página)
4. **Baixe o arquivo** (ex: `produtos.csv`)

### 5. Salvar no Projeto

1. Renomeie o arquivo para: `produtos-completo.csv`
2. Coloque em: `C:\Users\eddua\a-rafa-criou\data\test\produtos-completo.csv`

---

## 🔍 VERIFICAÇÃO ANTES DE EXPORTAR

Para saber quantos produtos você tem, execute esta query primeiro:

```sql
SELECT
  post_type,
  COUNT(*) as total
FROM wp_posts
WHERE post_type IN ('product', 'product_variation')
  AND post_status = 'publish'
GROUP BY post_type;
```

**Resultado esperado:**

```
product           | 150   ← Produtos principais
product_variation | 450   ← Variações (cores, tamanhos, etc)
```

---

## ✅ DEPOIS DE EXPORTAR

Execute o script de importação:

```powershell
npx tsx scripts/migration/import-products-completo.ts data/test/produtos-completo.csv
```

---

## 🆘 PROBLEMAS COMUNS

### "Query muito grande" / "Timeout"

**Solução:** Exporte em partes:

```sql
-- Produtos principais (sem variações)
SELECT ... WHERE p.post_type = 'product' ...

-- Variações (separado)
SELECT ... WHERE p.post_type = 'product_variation' ...
```

### "Caracteres estranhos" (�, ã vira Ã£)

**Solução:** Use **UTF-8 with BOM** no encoding da exportação

### "Adminer não carrega"

**Solução:**

1. Verifique se existe em: `https://seu-site.com/adminer.php`
2. Ou baixe: https://www.adminer.org/latest.php
3. Faça upload via FTP para a raiz do WordPress

---

## 📊 ARQUIVOS NECESSÁRIOS

Você JÁ TEM:

- ✅ `downloads-permissions.csv` (2223 permissões)
- ✅ `pedidos-completo.csv` (pedidos)
- ✅ `order-items-completo.csv` (itens)
- ✅ `all-customers.csv` (1376 usuários)

Você PRECISA:

- ❌ `produtos-completo.csv` ← **FAZER AGORA**

---

## ⏭️ PRÓXIMO PASSO

Depois de ter o `produtos-completo.csv`:

```powershell
# 1. Importar produtos
npx tsx scripts/migration/import-products-completo.ts data/test/produtos-completo.csv

# 2. Criar permissões de download
npx tsx scripts/migration/create-download-permissions.ts
```

---

**Tempo estimado:** 5-10 minutos  
**Dificuldade:** Fácil (só copiar e colar)
