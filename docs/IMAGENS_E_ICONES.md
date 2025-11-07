# Configuração de Ícones e Imagens - A Rafa Criou

## 🖼️ Imagens Principais

### Logo e Identidade Visual
- **`logo.webp`** - Logo principal (horizontal)
- **`logo-mascote.webp`** - Logo com mascote
- **`mascote_raquel.webp`**, `mascote_raquel2.webp`, `mascote_raquel3.webp` - Variações da mascote

### Banners
- **`Banner_principal.gif`** - Banner animado da home
- **`banner_carrinho.webp`** - Banner da página de carrinho
- **`banner_categorias.webp`** - Banner das categorias
- **`banner_contato.webp`** - Banner de contato
- **`banner_minha_conta.webp`** - Banner da área do cliente
- **`banner_Direitos-Autorais_Trocas_e_Devolucao.webp`** - Banner de políticas

### Ícones de Recursos
- **`automatico.webp`** - Ícone "Automático"
- **`pratico.webp`** - Ícone "Prático"
- **`economico.webp`** - Ícone "Econômico"

### Ícones de UI
- **`user.png`** - Ícone de usuário
- **`favorito.png`** - Ícone de favorito/coração
- **`arrow.png`** - Seta de navegação

---

## 🎨 Ícones SVG Customizados (Criados)

### **`file.svg`** - Placeholder de Produto
- **Uso:** Imagem padrão quando produto não tem foto
- **Cores:** #FED466 (amarelo primário) + #FD9555 (laranja secundário)
- **Design:** Documento PDF estilizado
- **Onde aparece:** Cards de produtos, galerias, carrinho

### **`bible-icon.svg`** - Ícone de Bíblia
- **Uso:** Representar materiais bíblicos/teocráticos
- **Cores:** #FED466 (fundo) + marrom (#8B4513) para a bíblia
- **Design:** Livro com cruz
- **Onde usar:** Categorias, seções especiais

### **`download-icon.svg`** - Ícone de Download
- **Uso:** Indicar downloads disponíveis
- **Cores:** #FED466 (fundo) + preto para a seta
- **Design:** Seta para baixo com base
- **Onde usar:** Página de downloads, botões de ação

### **`heart-icon.svg`** - Ícone de Favorito
- **Uso:** Indicar produtos favoritados
- **Cores:** #FD9555 (fundo laranja) + branco para o coração
- **Design:** Coração preenchido
- **Onde usar:** Sistema de favoritos, wishlist

---

## 🌐 SEO e Social Media

### **`og-image.jpg`** - Open Graph / Social Share
- **Origem:** Cópia de `imagem-site.webp`
- **Tamanho:** 1200x630px (otimizado para Facebook, Twitter, LinkedIn)
- **Uso:** Quando o site é compartilhado nas redes sociais
- **Configuração:** Já incluída em todas as meta tags SEO

### **`imagem-site.webp`** - Imagem oficial do site
- **Uso:** Representação visual do site para diversos fins

---

## 📄 Arquivos de SEO

### **`robots.txt`**
- **Gerado:** Automaticamente
- **Localização:** `/public/robots.txt`
- **Função:** Controla crawling dos bots de busca

### **`sitemap.xml`** e **`sitemap-0.xml`**
- **Gerado:** Automaticamente via `next-sitemap`
- **Atualização:** A cada build (`npm run build`)
- **Função:** Mapa do site para Google/Bing

---

## 🎯 Favicon (Pendente)

### Recomendação: Criar favicon.ico

Para criar o favicon do site:

**Opção 1 - Online (Recomendado):**
1. Acesse: https://favicon.io/favicon-converter/
2. Faça upload de `logo-mascote.webp`
3. Download do pacote gerado
4. Coloque os arquivos na pasta `/public`:
   - `favicon.ico`
   - `favicon-16x16.png`
   - `favicon-32x32.png`
   - `apple-touch-icon.png`
   - `android-chrome-192x192.png`
   - `android-chrome-512x512.png`

**Opção 2 - Usar Cloudinary:**
```bash
# Gerar favicon via API do Cloudinary
curl https://res.cloudinary.com/seu-cloud/image/upload/w_32,h_32,f_ico/logo-mascote.webp > public/favicon.ico
```

**Depois, adicione ao `layout.tsx`:**
```tsx
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

---

## 📱 PWA Icons (Futuro)

Para transformar em PWA, será necessário:

**Icons necessários:**
- `icon-192x192.png` - Android/Chrome
- `icon-512x512.png` - Android/Chrome
- `apple-touch-icon.png` - iOS Safari
- `maskable-icon.png` - Android adaptive icon

**Manifest.json:**
```json
{
  "name": "A Rafa Criou",
  "short_name": "A Rafa Criou",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "theme_color": "#FED466",
  "background_color": "#F4F4F4",
  "display": "standalone"
}
```

---

## 🎨 Paleta de Cores (Referência)

Use estas cores ao criar novos ícones:

- **Background:** `#F4F4F4` (cinza claro)
- **Primária:** `#FED466` (amarelo)
- **Secundária:** `#FD9555` (laranja)
- **Texto:** `#333333` (quase preto)
- **Branco:** `#FFFFFF`

---

## ✅ Checklist de Imagens

### Já Configuradas ✅
- ✅ Open Graph image (`og-image.jpg`)
- ✅ Placeholder de produtos (`file.svg`) - customizado
- ✅ Ícones SVG com cores da marca
- ✅ Banners de todas as páginas
- ✅ Logo e mascote

### Pendentes ⚠️
- ⚠️ Favicon.ico (use favicon.io)
- ⚠️ Apple Touch Icon
- ⚠️ PWA Icons (futuro)
- ⚠️ Schema.org ImageObject para produtos

### Limpeza Realizada ✅
- ✅ Removido `window.svg` (não usado)
- ✅ Removido `globe.svg` (não usado)
- ✅ Removido `vercel.svg` (não usado)
- ✅ Removido `next.svg` (não usado)

---

## 📝 Notas

1. **WebP vs PNG:** Continue usando WebP para banners (menor tamanho)
2. **SVG vs PNG:** Use SVG para ícones simples (escalável)
3. **Otimização:** Todas as imagens devem ser < 200KB (exceto banners)
4. **Alt Text:** Sempre adicione descrições para acessibilidade

---

**Última atualização:** Novembro 2025
**Configurado por:** Sistema de Deploy Automático
