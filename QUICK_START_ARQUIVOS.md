# 🚀 QUICK START - Importar Arquivos do WordPress

## 1️⃣ Exportar do WordPress (Adminer/phpMyAdmin)

Execute esta query e exporte como CSV:

```sql
SELECT 
    p.ID as product_id,
    p.post_title as product_name,
    p.post_type,
    pm.meta_value as downloadable_files_json
FROM 
    wp_posts p
INNER JOIN 
    wp_postmeta pm ON p.ID = pm.post_id
WHERE 
    pm.meta_key = '_downloadable_files'
    AND p.post_type IN ('product', 'product_variation')
    AND p.post_status IN ('publish', 'private')
ORDER BY 
    p.ID ASC;
```

**Salve como**: `data/test/downloadable-files.csv`

## 2️⃣ Importar no Novo Sistema

```powershell
npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv
```

## 3️⃣ Verificar

```powershell
npx tsx scripts/check-files-table.ts
```

Deve mostrar arquivos importados! ✅

---

**Documentação completa**: `docs/IMPORTAR_ARQUIVOS_WORDPRESS.md`
