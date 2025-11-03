# 🌍 Sistema de Tradução de Produtos e Atributos

## ✅ O que foi implementado

Um sistema completo de internacionalização (i18n) para traduzir:

- ✅ Nomes de produtos
- ✅ Descrições de produtos
- ✅ Nomes de atributos (ex: "Tamanho", "Cor")
- ✅ Valores de atributos (ex: "Pequeno", "Azul")
- ✅ Categorias
- ✅ Variações de produtos

---

## 📦 Arquivos Criados

### 1. **Schema de Banco de Dados**

- `src/lib/db/schema.ts` - Adicionadas tabelas `attributeI18n` e `attributeValueI18n`
- `drizzle/0010_add_attribute_i18n.sql` - Migration SQL

### 2. **Helpers de Banco**

- `src/lib/db/i18n-helpers.ts` - Funções para buscar dados traduzidos:
  - `getProductWithTranslation()`
  - `getAttributeWithTranslation()`
  - `getAttributeValueWithTranslation()`
  - `translateAttributes()`

### 3. **Hooks React**

- `src/hooks/use-i18n-product.ts`:
  - `useTranslatedProduct()` - Hook para produto traduzido
  - `useTranslatedAttributes()` - Hook para atributos traduzidos
  - `useCartItemTranslation()` - Hook para nome do produto no carrinho

### 4. **Componentes**

- `src/components/TranslatedProductName.tsx` - Exibe nome traduzido
- `src/components/ProductAttributeBadges.tsx` - Exibe badges de atributos traduzidos

### 5. **APIs**

- `src/app/api/i18n/translate-attributes/route.ts` - API para traduzir atributos
- `src/app/api/i18n/product-name/route.ts` - API para buscar nome traduzido

### 6. **Scripts**

- `scripts/seed-attribute-translations.ts` - Popula traduções iniciais

---

## 🚀 Como Usar

### 1️⃣ Executar Migration

```bash
# Aplicar migration no banco de dados
npm run db:push
```

### 2️⃣ Popular Traduções Iniciais

```bash
# Popular traduções de atributos comuns
npx tsx scripts/seed-attribute-translations.ts
```

Isso criará traduções para:

- **Atributos:** Tamanho/Size/Tamaño, Cor/Color/Color, etc.
- **Valores:** Pequeno/Small/Pequeño, Azul/Blue/Azul, etc.

### 3️⃣ Testar no Carrinho

1. Acesse http://localhost:3000/carrinho
2. Mude o idioma no seletor (bandeira)
3. Observe:
   - ✅ Nome do produto traduzido automaticamente
   - ✅ Badges de atributos traduzidas ("Size: Small" em inglês)
   - ✅ "Total Amount" em inglês, "Total a Pagar" em espanhol

---

## 📝 Cadastrar Novas Traduções

### Opção A: Via Script (Recomendado)

Edite `scripts/seed-attribute-translations.ts` e adicione:

```typescript
const ATTRIBUTE_TRANSLATIONS = {
  // ... existentes
  Estilo: {
    en: 'Style',
    es: 'Estilo',
  },
};

const VALUE_TRANSLATIONS = {
  // ... existentes
  Moderno: { en: 'Modern', es: 'Moderno' },
};
```

Depois execute:

```bash
npx tsx scripts/seed-attribute-translations.ts
```

### Opção B: Via SQL Direto

```sql
-- Traduzir atributo "Tamanho"
INSERT INTO attribute_i18n (attribute_id, locale, name, slug)
VALUES ('uuid-do-atributo', 'en', 'Size', 'size')
ON CONFLICT (attribute_id, locale) DO UPDATE SET name = 'Size';

-- Traduzir valor "Pequeno"
INSERT INTO attribute_value_i18n (value_id, locale, value, slug)
VALUES ('uuid-do-valor', 'en', 'Small', 'small')
ON CONFLICT (value_id, locale) DO UPDATE SET value = 'Small';
```

### Opção C: Via Admin Panel (Futuro)

> 🔜 Será implementado painel admin para gerenciar traduções visualmente

---

## 🔍 Estrutura das Tabelas

### `attribute_i18n`

```sql
attribute_id | locale | name    | slug
-------------|--------|---------|--------
uuid-123     | en     | Size    | size
uuid-123     | es     | Tamaño  | tamano
uuid-456     | en     | Color   | color
```

### `attribute_value_i18n`

```sql
value_id | locale | value  | slug
---------|--------|--------|-------
uuid-789 | en     | Small  | small
uuid-789 | es     | Pequeño| pequeno
uuid-012 | en     | Blue   | blue
```

---

## 💡 Como Funciona

### 1. **Fallback Automático**

Se não houver tradução, usa o texto em português:

- PT: "Tamanho" → EN: "Tamanho" (sem tradução) ✅ Funciona
- PT: "Tamanho" → EN: "Size" (com tradução) ✅ Funciona

### 2. **Cache no Frontend**

Os hooks fazem cache das traduções durante a sessão do usuário.

### 3. **Atualização Automática**

Quando o usuário troca de idioma:

1. Hook detecta mudança (`i18n.language`)
2. Busca traduções na API
3. Atualiza interface automaticamente

---

## 📊 Exemplo de Uso no Código

### Antes (Hardcoded):

```tsx
<h3>{item.name}</h3>
<Badge>{attr.name}: {attr.value}</Badge>
```

### Depois (Traduzido):

```tsx
<TranslatedProductName
  productId={item.productId}
  productName={item.name}
/>
<ProductAttributeBadges attributes={item.attributes} />
```

---

## 🎯 Status Atual

### ✅ Completo

- Schema do banco
- Migration SQL
- Helpers de tradução
- Hooks React
- Componentes
- APIs
- Script de seed
- Integração no carrinho

### 🔜 Próximos Passos (Opcionais)

- [ ] Painel admin para gerenciar traduções
- [ ] Cache Redis para traduções
- [ ] API para importar traduções em massa (CSV/JSON)
- [ ] Sistema de tradução automática (Google Translate API)
- [ ] Logs de traduções faltantes

---

## ❓ Troubleshooting

### Traduções não aparecem?

1. **Verifique se a migration foi aplicada:**

```bash
npm run db:push
```

2. **Verifique se o seed foi executado:**

```bash
npx tsx scripts/seed-attribute-translations.ts
```

3. **Confirme que o locale está correto:**

```tsx
// No console do navegador
console.log(i18n.language); // Deve mostrar 'en', 'es', ou 'pt'
```

4. **Verifique se as tabelas existem:**

```sql
SELECT * FROM attribute_i18n LIMIT 5;
SELECT * FROM attribute_value_i18n LIMIT 5;
```

### Performance lenta?

Adicione índices (já incluídos na migration):

```sql
CREATE INDEX attribute_i18n_locale_idx ON attribute_i18n(locale);
CREATE INDEX attribute_value_i18n_locale_idx ON attribute_value_i18n(locale);
```

---

## 📚 Documentação das APIs

### POST `/api/i18n/translate-attributes`

Traduz array de atributos.

**Request:**

```json
{
  "attributes": [{ "name": "Tamanho", "value": "Pequeno" }],
  "locale": "en"
}
```

**Response:**

```json
{
  "attributes": [{ "id": "0", "name": "Size", "value": "Small" }]
}
```

### GET `/api/i18n/product-name?id=uuid&locale=en`

Busca nome traduzido de um produto.

**Response:**

```json
{
  "name": "Translated Product Name"
}
```

---

## 🎨 Personalização

Para adicionar mais idiomas (ex: Francês):

1. Adicione traduções no script:

```typescript
Tamanho: {
  en: 'Size',
  es: 'Tamaño',
  fr: 'Taille', // ✨ Novo
}
```

2. Execute o seed novamente
3. Adicione o locale no i18next (já configurado para `pt`, `en`, `es`)

---

## ✨ Resultado Final

Agora seu e-commerce tem:

- 🌍 Produtos traduzidos em 3 idiomas
- 🏷️ Atributos traduzidos automaticamente
- 🔄 Troca de idioma em tempo real
- 📱 Funciona em toda a aplicação
- ⚡ Performance otimizada com cache

**Próxima etapa:** Popular traduções de todos os seus produtos usando o script ou via painel admin!
