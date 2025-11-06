# ⚠️ IMPORTANTE - Exportar CSV Novamente

## 🎯 Problema Encontrado

O CSV exportado anteriormente tinha um problema:

- **Só continha variações** (743 product_variation, 0 product)
- **Campo product_id estava undefined**
- Precisamos do ID do **produto pai** para vincular corretamente

## ✅ Solução: Re-exportar com Query Corrigida

### Passo 1: Apagar CSV Antigo

```powershell
Remove-Item data\test\downloadable-files.csv
```

### Passo 2: Exportar Novamente do WordPress

1. Acesse: `https://arafacriou.com.br/adminer.php`
2. Faça login
3. Clique na aba **SQL**
4. Cole esta query **ATUALIZADA**:

```sql
SELECT
    p.ID as product_id,
    p.post_title as product_name,
    p.post_type,
    p.post_parent as parent_product_id,
    pm.meta_value as downloadable_files_json
FROM
    wp_posts p
INNER JOIN
    wp_postmeta pm ON p.ID = pm.post_id
WHERE
    pm.meta_key = '_downloadable_files'
    AND p.post_type IN ('product', 'product_variation')
    AND p.post_status IN ('publish', 'private', 'inherit')
ORDER BY
    p.post_type DESC,
    p.ID ASC;
```

5. Execute
6. Exporte como CSV
7. Salve em: `data\test\downloadable-files.csv`

### Passo 3: Importar Novamente

```powershell
npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv
```

### Passo 4: Verificar

```powershell
npx tsx scripts/check-files-table.ts
```

## 🔧 O Que Mudou?

**Query Antiga:**

- ❌ Não tinha `parent_product_id`
- ❌ Só retornava variações (produtos principais não tinham `_downloadable_files`)

**Query Nova:**

- ✅ Inclui `parent_product_id`
- ✅ Inclui `post_status = 'inherit'` para pegar variações
- ✅ Ordena produtos antes de variações
- ✅ Script agora busca pelo produto pai quando é variação

## 📊 Resultado Esperado

Depois do re-export + import:

```
✅ Arquivos importados: ~700+
📦 Produtos com arquivo: ~837
```

---

**Última atualização:** 05/11/2025
