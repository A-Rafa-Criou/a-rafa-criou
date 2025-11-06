# 🚀 GUIA RÁPIDO: MIGRAÇÃO DE ARQUIVOS E IMAGENS

## ✅ PRÉ-REQUISITOS

### 1. Variáveis de Ambiente
Adicione ao `.env.local`:

```env
# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=arafacriou-files

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. Instalar Dependências

```powershell
npm install @aws-sdk/client-s3 cloudinary csv-parse
```

---

## 📦 PARTE 1: MIGRAR PDFs PARA R2

### Passo 1: Baixar PDFs do WordPress

**Via FileZilla/WinSCP:**
1. Conecte-se ao servidor: `arafacriou.com.br`
2. Navegue até: `/wp-content/uploads/woocommerce_uploads/`
3. Baixe todos os arquivos `.pdf`
4. Salve em: `C:\Users\eddua\a-rafa-criou\data\wordpress-files\`

**Via SSH (alternativa):**
```bash
ssh usuario@arafacriou.com.br
cd /var/www/html/wp-content/uploads/woocommerce_uploads/
find . -name "*.pdf" -type f | tar -czf pdfs-backup.tar.gz -T -
```

Depois baixe:
```powershell
scp usuario@arafacriou.com.br:/path/to/pdfs-backup.tar.gz C:\Users\eddua\a-rafa-criou\data\
```

### Passo 2: Criar Bucket no Cloudflare R2

1. Acesse: https://dash.cloudflare.com/ > R2
2. **Create Bucket**
3. Nome: `arafacriou-files`
4. Região: Automatic
5. **Manage R2 API Tokens** > Create API Token
6. Permissões: Admin Read & Write
7. Copie as credenciais para `.env.local`

### Passo 3: Executar Upload

```powershell
npx tsx scripts/migration/upload-pdfs-to-r2.ts
```

**O que o script faz:**
- ✅ Escaneia pasta `data/wordpress-files/`
- ✅ Verifica arquivos já existentes no R2
- ✅ Faz upload dos PDFs
- ✅ Atualiza tabela `files` com novos paths
- ✅ Mostra progresso em tempo real

**Resultado esperado:**
```
📊 Arquivos encontrados: 89
💾 Tamanho total: 180.50 MB

☁️  Iniciando upload para Cloudflare R2...

[1/89] ✅ arquivo1.pdf - 2048 KB
[2/89] ✅ arquivo2.pdf - 1512 KB
...

📊 Resumo do Upload:
   ✅ Enviados: 89
   ⏭️  Pulados: 0
   ❌ Erros: 0

📊 Resumo da Atualização:
   ✅ Atualizados: 89
   ⚠️  Não encontrados: 0

✅ Migração de PDFs concluída!
```

---

## 🎨 PARTE 2: MIGRAR IMAGENS PARA CLOUDINARY

### Passo 1: Criar Conta no Cloudinary

1. Acesse: https://cloudinary.com/
2. Crie conta gratuita
3. Dashboard > Product Environment Credentials
4. Copie:
   - Cloud Name
   - API Key
   - API Secret
5. Cole no `.env.local`

### Passo 2: Exportar URLs das Imagens

1. Acesse phpMyAdmin/Adminer do WordPress
2. Execute a query: `scripts/migration/export-product-images.sql`
3. Exporte resultado como **CSV**
4. Salve em: `C:\Users\eddua\a-rafa-criou\data\migration\product-images.csv`

### Passo 3: Executar Upload

```powershell
npx tsx scripts/migration/upload-images-to-cloudinary.ts
```

**O que o script faz:**
- ✅ Lê CSV de imagens
- ✅ Faz upload direto das URLs do WordPress
- ✅ Converte para WebP automaticamente
- ✅ Otimiza qualidade
- ✅ Limita tamanho (1200x1200)
- ✅ Atualiza campo `wpImageUrl` no banco

**Resultado esperado:**
```
📊 Total de registros no CSV: 837
🖼️  Produtos com imagem: 440
⚠️  Produtos sem imagem: 397

☁️  Iniciando upload para Cloudinary...

[1/440] 📤 Uploading "PRODUTO 1"...
[1/440] ✅ "PRODUTO 1"
         → https://res.cloudinary.com/.../product-7713.webp

...

📊 Resumo do Upload:
   ✅ Enviados: 440
   🔄 Atualizados no banco: 440
   ⏭️  Pulados: 0
   ❌ Erros: 0

✅ Migração de imagens concluída!
```

---

## 🧪 VALIDAÇÃO

### Testar Downloads de PDFs

```powershell
# Verificar arquivos no banco
npx tsx scripts/check-files-table.ts

# Testar download no navegador
# 1. Acesse: http://localhost:3000/conta/pedidos
# 2. Clique em qualquer pedido completado
# 3. Clique no botão "Fazer Download"
# 4. Deve baixar o PDF do R2
```

### Testar Imagens

```powershell
# Verificar imagens
npx tsx scripts/migration/check-product-images.ts

# Visualizar no frontend
# 1. Acesse: http://localhost:3000/produtos
# 2. Imagens devem aparecer do Cloudinary
# 3. Formato WebP otimizado
```

---

## 📊 ESTATÍSTICAS ESPERADAS

### PDFs (Cloudflare R2)
- **Arquivos**: 89
- **Tamanho**: ~180 MB
- **Custo**: R$ 0 (free tier até 10 GB)
- **Tempo**: ~15 minutos

### Imagens (Cloudinary)
- **Imagens**: 440
- **Tamanho**: ~220 MB
- **Formato**: WebP otimizado
- **Custo**: R$ 0 (free tier até 25 GB)
- **Tempo**: ~20 minutos

---

## ⚠️ TROUBLESHOOTING

### Erro: "Pasta não encontrada"
```
❌ Pasta não encontrada: C:\Users\eddua\a-rafa-criou\data\wordpress-files
```

**Solução:**
1. Crie a pasta: `mkdir C:\Users\eddua\a-rafa-criou\data\wordpress-files`
2. Baixe os PDFs do WordPress
3. Execute novamente

### Erro: "CSV não encontrado"
```
❌ Arquivo CSV não encontrado
```

**Solução:**
1. Execute query SQL no WordPress
2. Exporte como CSV
3. Salve no caminho correto

### Erro: "Invalid credentials"
```
❌ AccessDenied: Invalid credentials
```

**Solução:**
1. Verifique credenciais no `.env.local`
2. Regere tokens se necessário
3. Certifique-se que não há espaços extras

---

## ✅ CHECKLIST FINAL

### Antes de Começar
- [ ] `.env.local` configurado
- [ ] Dependências instaladas
- [ ] PDFs baixados do WordPress
- [ ] CSV de imagens exportado

### PDFs para R2
- [ ] Bucket R2 criado
- [ ] API tokens configurados
- [ ] Script executado com sucesso
- [ ] 89 arquivos no R2
- [ ] Tabela `files` atualizada
- [ ] Download testado

### Imagens para Cloudinary
- [ ] Conta Cloudinary criada
- [ ] Credenciais configuradas
- [ ] CSV exportado
- [ ] Script executado com sucesso
- [ ] 440 imagens no Cloudinary
- [ ] Imagens aparecendo no site

---

## 🎉 PRÓXIMOS PASSOS

Após concluir:
1. ✅ Remover PDFs do servidor WordPress (economizar espaço)
2. ✅ Configurar domínio customizado no R2 (opcional)
3. ✅ Adicionar watermark nos PDFs (proteção extra)
4. ✅ Implementar lazy loading de imagens
5. ✅ Monitorar uso de bandwidth

Precisa de ajuda? Revise o `GUIA_MIGRACAO_ARQUIVOS.md` completo!
