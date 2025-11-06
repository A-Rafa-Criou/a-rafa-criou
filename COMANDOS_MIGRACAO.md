# 🎯 COMANDOS PRONTOS - MIGRAÇÃO

## ⚙️ 1. PREPARAÇÃO

### Instalar dependências

```powershell
npm install @aws-sdk/client-s3 cloudinary csv-parse
```

### Criar diretórios necessários

```powershell
mkdir -p C:\Users\eddua\a-rafa-criou\data\wordpress-files
mkdir -p C:\Users\eddua\a-rafa-criou\data\migration
```

---

## 📦 2. MIGRAÇÃO DE PDFs PARA R2

### Verificar arquivos atuais

```powershell
npx tsx scripts/check-files-table.ts
```

### Executar upload para R2

```powershell
npx tsx scripts/migration/upload-pdfs-to-r2.ts
```

### Validar após upload

```powershell
npx tsx scripts/check-files-table.ts
npx tsx scripts/check-download-availability.ts
```

---

## 🎨 3. MIGRAÇÃO DE IMAGENS PARA CLOUDINARY

### Verificar imagens atuais

```powershell
npx tsx scripts/migration/check-product-images.ts
```

### Executar upload para Cloudinary

```powershell
npx tsx scripts/migration/upload-images-to-cloudinary.ts
```

### Validar após upload

```powershell
npx tsx scripts/migration/check-product-images.ts
```

---

## ✅ 4. VALIDAÇÃO COMPLETA

### Testar tudo

```powershell
# 1. Verificar arquivos
npx tsx scripts/check-files-table.ts

# 2. Verificar imagens
npx tsx scripts/migration/check-product-images.ts

# 3. Verificar downloads
npx tsx scripts/check-download-availability.ts

# 4. Iniciar servidor
npm run dev
```

### Testar no navegador

```
1. Acesse: http://localhost:3000/conta/pedidos
2. Clique em um pedido completado
3. Verifique botão "Fazer Download"
4. Baixe o arquivo
5. Confirme que funcionou

6. Acesse: http://localhost:3000/produtos
7. Verifique se imagens aparecem
8. Confirme otimização WebP
```

---

## 🧹 5. LIMPEZA (APÓS MIGRAÇÃO BEM-SUCEDIDA)

### Remover arquivos locais temporários

```powershell
# ATENÇÃO: Só execute após confirmar que tudo funcionou!
Remove-Item -Recurse -Force C:\Users\eddua\a-rafa-criou\data\wordpress-files
Remove-Item -Recurse -Force C:\Users\eddua\a-rafa-criou\data\migration
```

### Limpar arquivos do WordPress (via SSH)

```bash
# ATENÇÃO: Faça backup antes!
ssh usuario@arafacriou.com.br
cd /var/www/html/wp-content/uploads
tar -czf backup-uploads-$(date +%Y%m%d).tar.gz woocommerce_uploads/
# rm -rf woocommerce_uploads/ # Descomentar só após confirmar migração
```

---

## 🆘 TROUBLESHOOTING

### Se upload falhar

```powershell
# Limpar e tentar novamente
npx tsx scripts/clear-files-table.ts
npx tsx scripts/migration/upload-pdfs-to-r2.ts
```

### Se imagens não aparecerem

```powershell
# Verificar URLs no banco
npx tsx scripts/migration/check-product-images.ts

# Re-executar upload
npx tsx scripts/migration/upload-images-to-cloudinary.ts
```

### Backup antes de qualquer operação

```powershell
# Exportar banco completo
pg_dump $env:DATABASE_URL > backup-$(Get-Date -Format "yyyyMMdd-HHmmss").sql
```

---

## 📝 CHECKLIST RÁPIDO

```
PREPARAÇÃO:
[ ] Dependências instaladas
[ ] Diretórios criados
[ ] Credenciais no .env.local
[ ] PDFs baixados do WordPress
[ ] CSV de imagens exportado

MIGRAÇÃO PDFs:
[ ] Script executado
[ ] 89 arquivos no R2
[ ] Tabela files atualizada
[ ] Download testado ✅

MIGRAÇÃO IMAGENS:
[ ] Script executado
[ ] 440 imagens no Cloudinary
[ ] URLs atualizadas
[ ] Imagens no site ✅

VALIDAÇÃO:
[ ] Todos os scripts passaram
[ ] Botão de download aparece
[ ] Downloads funcionam
[ ] Imagens carregam
[ ] Performance OK

LIMPEZA:
[ ] Backup criado
[ ] Arquivos locais removidos
[ ] WordPress limpo (opcional)
```

---

## 🚀 ORDEM DE EXECUÇÃO RECOMENDADA

```powershell
# 1. Preparação
npm install @aws-sdk/client-s3 cloudinary csv-parse

# 2. Verificar estado atual
npx tsx scripts/check-files-table.ts
npx tsx scripts/migration/check-product-images.ts

# 3. Migrar PDFs
npx tsx scripts/migration/upload-pdfs-to-r2.ts

# 4. Migrar Imagens
npx tsx scripts/migration/upload-images-to-cloudinary.ts

# 5. Validar tudo
npx tsx scripts/check-files-table.ts
npx tsx scripts/migration/check-product-images.ts
npx tsx scripts/check-download-availability.ts

# 6. Testar no navegador
npm run dev
# Acesse: http://localhost:3000

# 7. Sucesso! 🎉
```

Copie e cole os comandos conforme necessário! 🚀
