# 📦 GUIA COMPLETO: MIGRAÇÃO DE ARQUIVOS E IMAGENS

## 🎯 Objetivo

Migrar todos os arquivos PDF para **Cloudflare R2** e todas as imagens para **Cloudinary**.

---

## 📊 Status Atual

### Arquivos PDF (Files Table)

- ✅ **89 arquivos** mapeados no banco de dados
- ⚠️ Arquivos ainda estão no servidor WordPress
- 🔗 Paths relativos: `2025/04/arquivo.pdf`
- 📍 Localização atual: `https://arafacriou.com.br/wp-content/uploads/woocommerce_uploads/`

### Imagens dos Produtos

- ✅ **440 produtos** (52.6%) com URL de imagem
- ❌ **397 produtos** (47.4%) sem imagem
- 🔗 URLs completas: `https://arafacriou.com.br/wp-content/uploads/2025/11/imagem.webp`

---

## 🚀 PARTE 1: MIGRAÇÃO DOS PDFs PARA CLOUDFLARE R2

### Passo 1: Baixar todos os PDFs do WordPress

**Opção A: Via FTP/SFTP**

```bash
# Conecte-se ao servidor WordPress via FileZilla ou WinSCP
# Navegue até: /wp-content/uploads/woocommerce_uploads/
# Baixe toda a pasta para: C:\Users\eddua\a-rafa-criou\data\wordpress-files\
```

**Opção B: Via SSH (se disponível)**

```bash
# Compactar no servidor
ssh usuario@arafacriou.com.br
cd /var/www/html/wp-content/uploads/woocommerce_uploads/
tar -czf pdfs-backup.tar.gz *.pdf

# Baixar para máquina local
scp usuario@arafacriou.com.br:/path/to/pdfs-backup.tar.gz C:\Users\eddua\a-rafa-criou\data\

# Extrair
cd C:\Users\eddua\a-rafa-criou\data
tar -xzf pdfs-backup.tar.gz
```

### Passo 2: Configurar Cloudflare R2

1. **Criar Bucket R2**
   - Acesse: https://dash.cloudflare.com/
   - R2 > Create Bucket
   - Nome: `arafacriou-files` (ou outro nome)
   - Região: Automatic

2. **Gerar API Tokens**
   - R2 > Manage R2 API Tokens
   - Create API Token
   - Permissões: Admin Read & Write
   - Copie:
     - `Account ID`
     - `Access Key ID`
     - `Secret Access Key`

3. **Adicionar ao `.env.local`**

```env
# Cloudflare R2
R2_ACCOUNT_ID=seu_account_id
R2_ACCESS_KEY_ID=seu_access_key
R2_SECRET_ACCESS_KEY=seu_secret_key
R2_BUCKET_NAME=arafacriou-files
R2_PUBLIC_URL=https://files.arafacriou.com.br
```

### Passo 3: Instalar Dependências

```powershell
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Passo 4: Executar Script de Upload

Vou criar o script a seguir...

---

## 🎨 PARTE 2: MIGRAÇÃO DAS IMAGENS PARA CLOUDINARY

### Passo 1: Criar Conta Cloudinary

1. Acesse: https://cloudinary.com/
2. Crie conta gratuita (25 GB de storage, 25 GB de bandwidth)
3. Copie suas credenciais do Dashboard:
   - Cloud Name
   - API Key
   - API Secret

### Passo 2: Configurar Cloudinary

Adicione ao `.env.local`:

```env
# Cloudinary
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
CLOUDINARY_UPLOAD_PRESET=arafacriou-products
```

### Passo 3: Instalar SDK do Cloudinary

```powershell
npm install cloudinary
```

### Passo 4: Exportar URLs das Imagens do WordPress

1. Execute no phpMyAdmin/Adminer:
   - Arquivo: `scripts/migration/export-product-images.sql`
   - Exportar como CSV
   - Salvar em: `data/migration/product-images.csv`

### Passo 5: Executar Script de Upload

Vou criar o script a seguir...

---

## 📋 CHECKLIST DE EXECUÇÃO

### PDFs para R2

- [ ] Criar bucket no Cloudflare R2
- [ ] Gerar API tokens
- [ ] Adicionar credenciais ao `.env.local`
- [ ] Baixar PDFs do WordPress via FTP/SSH
- [ ] Instalar `@aws-sdk/client-s3`
- [ ] Executar script de upload para R2
- [ ] Atualizar tabela `files` com novos paths
- [ ] Testar download de 1 arquivo
- [ ] Validar todos os downloads

### Imagens para Cloudinary

- [ ] Criar conta no Cloudinary
- [ ] Copiar credenciais
- [ ] Adicionar credenciais ao `.env.local`
- [ ] Executar SQL para exportar URLs
- [ ] Exportar CSV de imagens
- [ ] Instalar SDK do Cloudinary
- [ ] Executar script de upload
- [ ] Atualizar tabela `products` com URLs do Cloudinary
- [ ] Verificar imagens no frontend

---

## ⚠️ IMPORTANTE

### Backup Antes de Tudo

```powershell
# Backup da tabela files
npx drizzle-kit push --force

# Backup do banco completo via pgAdmin ou:
pg_dump $DATABASE_URL > backup-antes-migracao.sql
```

### Estimativa de Tempo

- **PDFs**: ~89 arquivos × 2 MB médio = ~180 MB
  - Download: 5-10 minutos
  - Upload para R2: 10-15 minutos
  - **Total: ~30 minutos**

- **Imagens**: ~440 imagens × 500 KB médio = ~220 MB
  - Upload para Cloudinary: 15-20 minutos (API faz download direto)
  - **Total: ~20 minutos**

### Custos

- **Cloudflare R2**: Grátis até 10 GB storage + 10 milhões de requests/mês
- **Cloudinary**: Grátis até 25 GB storage + 25 GB bandwidth/mês

---

## 🔧 Próximos Passos

Vou criar agora:

1. ✅ Script de upload de PDFs para R2
2. ✅ Script de upload de imagens para Cloudinary
3. ✅ Script de atualização dos paths no banco
4. ✅ Script de validação pós-migração

Quer que eu crie esses scripts agora?
