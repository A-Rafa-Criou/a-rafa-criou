# 📥 Como Baixar os PDFs do WordPress

## Opção 1: Via FTP/SFTP (Mais Rápido)

### 1. Instale um cliente FTP:
- **FileZilla** (gratuito): https://filezilla-project.org/download.php?type=client
- Ou **WinSCP** (gratuito): https://winscp.net/eng/download.php

### 2. Conecte ao servidor:
Você precisa das credenciais FTP do seu hosting. Geralmente encontradas em:
- Painel de controle do hosting (cPanel, Plesk, etc.)
- E-mail de boas-vindas do hosting
- Ou solicite ao suporte da hospedagem

**Dados necessários:**
- Host: geralmente `ftp.arafacriou.com.br` ou `arafacriou.com.br`
- Usuário: (fornecido pelo hosting)
- Senha: (fornecido pelo hosting)
- Porta: 21 (FTP) ou 22 (SFTP)

### 3. Navegue até a pasta dos PDFs:
```
/public_html/wp-content/uploads/woocommerce_uploads/
```

### 4. Baixe todos os arquivos PDF:
- Selecione todos os arquivos `.pdf`
- Clique com botão direito → Download
- Salve em: `C:\Users\eddua\a-rafa-criou\data\wordpress-files\`

---

## Opção 2: Via Plugin WordPress

### 1. Instale o plugin "Export Media Library":
1. Acesse: https://arafacriou.com.br/wp-admin/plugin-install.php
2. Busque por: **"Export Media Library"** ou **"All-in-One WP Migration"**
3. Instale e ative

### 2. Exporte apenas PDFs:
1. Vá em: Mídia → Export Media Library
2. Filtre por tipo: PDF
3. Clique em "Export"
4. Baixe o arquivo ZIP gerado
5. Extraia em: `C:\Users\eddua\a-rafa-criou\data\wordpress-files\`

---

## Opção 3: Via Painel de Controle do Hosting

### 1. Acesse o File Manager do cPanel/Plesk:
1. Entre no painel de controle do seu hosting
2. Abra o "Gerenciador de Arquivos" (File Manager)
3. Navegue até: `public_html/wp-content/uploads/woocommerce_uploads/`
4. Selecione todos os PDFs
5. Clique em "Comprimir" → Download
6. Extraia em: `C:\Users\eddua\a-rafa-criou\data\wordpress-files\`

---

## Opção 4: Script PHP no WordPress (Última Opção)

Se nenhuma das opções acima funcionar, posso criar um script PHP temporário para você colocar no WordPress que gerará um arquivo ZIP com todos os PDFs.

---

## 🎯 Após baixar os PDFs:

Execute o comando para migrar para o Cloudflare R2:
```powershell
npx tsx scripts/migration/upload-pdfs-to-r2.ts
```

---

## ❓ Qual opção você tem acesso?

1. ✅ **Tem acesso FTP/SFTP?** (mais rápido)
2. ✅ **Pode instalar plugins no WordPress?**
3. ✅ **Tem acesso ao cPanel/Plesk?**
4. ❌ **Nenhuma das anteriores?** (usaremos script PHP)
