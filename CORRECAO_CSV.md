# 🔧 CORREÇÃO URGENTE - Re-exportar CSV

## ❌ Problema Detectado

Você exportou o CSV, mas teve um problema:

**Resultado da importação:**
```
✅ Arquivos importados: 0
⏭️  Registros ignorados: 743 (todos eram variações com ID inválido)
```

**Causa:** A query SQL estava faltando o campo `parent_product_id`.

## ✅ Solução Imediata

### 1. Apague o CSV antigo

```powershell
Remove-Item data\test\downloadable-files.csv
```

### 2. Volte no Adminer/phpMyAdmin

Use a **query CORRIGIDA** de `scripts/migration/export-downloadable-files.sql`:

**A query agora inclui `parent_product_id`!**

### 3. Execute a nova query

```sql
SELECT 
    p.ID as product_id,
    p.post_title as product_name,
    p.post_type,
    p.post_parent as parent_product_id,  ← NOVO!
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

### 4. Exporte e importe novamente

```powershell
# Depois de salvar o novo CSV em data/test/downloadable-files.csv
npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv
```

### 5. Verifique

```powershell
npx tsx scripts/check-files-table.ts
```

**Resultado esperado:**
```
📊 Total de arquivos na tabela files: 700+
📊 Produtos SEM arquivo: 100-
```

## 🎯 O Que Foi Corrigido

1. ✅ Script agora processa variações corretamente
2. ✅ Usa `parent_product_id` para encontrar produto pai
3. ✅ Ignora IDs inválidos (NaN)
4. ✅ Query SQL atualizada com novo campo

## ⏱️ Tempo Estimado

- Apagar CSV: 10 segundos
- Re-exportar: 3-5 minutos
- Re-importar: 2-5 minutos
- **Total: ~10 minutos**

---

**Arquivo atualizado:** `scripts/migration/export-downloadable-files.sql`  
**Script atualizado:** `scripts/migration/import-downloadable-files.ts`
