# 🔍 Google Search Console - Guia Completo de Configuração

## 📋 Passo a Passo

### 1️⃣ **Acessar o Google Search Console**

1. Acesse: https://search.google.com/search-console
2. Faça login com sua conta Google (a mesma que tem o site antigo)

---

### 2️⃣ **Verificar Site Existente (Se já tem do WordPress)**

Se você já tinha o site verificado:

1. **Vá em Configurações** (⚙️ no menu lateral esquerdo)
2. Clique em **"Verificação"** ou **"Ownership verification"**
3. Você verá algo como:

```html
<meta name="google-site-verification" content="ABC123xyz456..." />
```

4. **Copie APENAS o código** (ex: `ABC123xyz456...`)
5. Cole no arquivo `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=ABC123xyz456...
```

---

### 3️⃣ **Adicionar Nova Propriedade (Se ainda não tem)**

Se você precisa criar uma nova verificação:

1. Clique em **"Adicionar propriedade"** (canto superior esquerdo)
2. Escolha **"Prefixo do URL"**: `https://arafacriou.com.br`
3. Clique em **"Continuar"**
4. Escolha o método **"Tag HTML"**
5. Copie o código da meta tag:

```html
<meta name="google-site-verification" content="SEU_CODIGO_AQUI" />
```

6. Cole apenas o `SEU_CODIGO_AQUI` no `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=SEU_CODIGO_AQUI
```

---

### 4️⃣ **Deploy e Verificar**

1. **Faça commit e push** das alterações:
```bash
git add .
git commit -m "Add Google Search Console verification"
git push
```

2. **Aguarde o deploy** (2-5 minutos na Vercel)

3. **Volte no Search Console** e clique em **"VERIFICAR"**

✅ **Deve aparecer**: "Propriedade verificada"

---

### 5️⃣ **Enviar Sitemap**

Após verificação bem-sucedida:

1. No menu lateral, clique em **"Sitemaps"**
2. No campo **"Adicionar um novo sitemap"**, digite:
   ```
   sitemap.xml
   ```
3. Clique em **"Enviar"**

✅ **Status**: "Sucesso" (pode levar algumas horas)

---

### 6️⃣ **Solicitar Indexação de Páginas Importantes**

Acelere a indexação das páginas principais:

1. No menu lateral, clique em **"Inspeção de URL"**
2. Cole uma URL e pressione Enter:
   - `https://arafacriou.com.br/`
   - `https://arafacriou.com.br/produtos`
   - `https://arafacriou.com.br/perguntas-frequentes`
   - `https://arafacriou.com.br/sobre`
   - `https://arafacriou.com.br/produtos/lembrancinha-batismo-...` (seus produtos mais vendidos)

3. Clique em **"Solicitar indexação"**
4. Aguarde 1-3 dias

---

### 7️⃣ **Configurar Mudança de Endereço (Se migrou de outro domínio)**

⚠️ **Apenas se você mudou de domínio** (ex: `siteantigo.com` → `arafacriou.com.br`)

1. Acesse a propriedade **do site antigo** no Search Console
2. Vá em **Configurações** → **"Mudança de endereço"**
3. Selecione a propriedade nova: `https://arafacriou.com.br`
4. Siga as instruções (confirmar redirecionamentos 301)

---

## 📊 Monitoramento

### O que acompanhar:

#### **1. Cobertura** (Menu: Indexação → Páginas)
- ✅ **Páginas válidas**: Quantas estão indexadas
- ⚠️ **Excluídas**: Por que não foram indexadas
- ❌ **Erros**: Problemas que precisam correção

**Meta inicial**: 50-100 páginas indexadas (seus produtos + páginas principais)

#### **2. Desempenho** (Menu: Desempenho → Resultados da pesquisa)
- **Cliques**: Quantas pessoas clicaram no seu site
- **Impressões**: Quantas vezes apareceu no Google
- **CTR**: % de cliques quando aparece
- **Posição média**: Ranking médio nas buscas

**Filtre por**:
- Consultas (palavras-chave)
- Páginas
- Países (Brasil, Portugal, etc.)
- Dispositivos (Mobile vs Desktop)

#### **3. Experiência** (Menu: Experiência)
- **Core Web Vitals**: Performance do site
- **Usabilidade em dispositivos móveis**: Problemas mobile
- **HTTPS**: Certificado SSL

---

## 🎯 Dicas de Otimização

### 1. **Palavras-chave de ouro**
Após 2-4 semanas, vá em **Desempenho** e veja:
- Quais palavras trazem **impressões mas poucos cliques** → Melhore o título/descrição
- Quais trazem cliques mas estão em **posição ruim** (>10) → Otimize conteúdo

### 2. **Produtos mais procurados**
Filtre por **Páginas** e veja quais produtos têm mais impressões.
Priorize melhorias de SEO neles.

### 3. **Erros 404**
Se aparecerem URLs antigas do WordPress:
- Adicione redirecionamentos 301 no `next.config.ts`
- Exemplo:
```typescript
{
  source: '/produto-antigo',
  destination: '/produtos/produto-novo',
  permanent: true,
}
```

---

## ⏱️ Timeline Esperada

| Tempo | O que esperar |
|-------|---------------|
| **1-3 dias** | Verificação aprovada, primeiras páginas indexadas |
| **1 semana** | 20-50% das páginas indexadas |
| **2 semanas** | 50-80% das páginas indexadas |
| **1 mês** | 90%+ indexado, primeiras impressões/cliques |
| **2-3 meses** | Rankings estabilizados, crescimento orgânico |
| **6 meses** | Posições consolidadas, tráfego orgânico sólido |

---

## 🆘 Problemas Comuns

### ❌ **"Verificação falhou"**
- Certifique-se que o código está em `.env.local`
- Aguarde 5-10 minutos após o deploy
- Teste se a meta tag aparece no HTML:
  ```bash
  curl https://arafacriou.com.br | grep "google-site-verification"
  ```

### ❌ **"Sitemap não pôde ser lido"**
- Acesse: https://arafacriou.com.br/sitemap.xml
- Se aparecer XML, está OK. Se erro 404, reforce o build
- Aguarde até 24h para Google processar

### ❌ **"Páginas não estão sendo indexadas"**
- Verifique `robots.txt`: https://arafacriou.com.br/robots.txt
- Deve permitir crawlers: `User-agent: * / Allow: /`
- Não deve ter `noindex` nas páginas importantes

---

## 📞 Suporte

**Documentação oficial**:
- https://support.google.com/webmasters

**Problemas específicos**:
- Entre em contato com o desenvolvedor: Eduardo Sodré
- Ou abra issue no GitHub do projeto

---

**Última atualização**: Novembro 2024
**Versão do Next.js**: 15.5.3
**Site**: https://arafacriou.com.br
