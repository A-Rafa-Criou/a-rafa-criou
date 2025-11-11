# 🚀 Atualizações do Sistema

## ✨ Sistema de Promoções - Implementado

### O que foi adicionado:

- ✅ **Admin pode criar promoções** em `/admin/promocoes`
- ✅ **Desconto percentual ou valor fixo**
- ✅ **Datas de início e fim** configuráveis
- ✅ **Aplicável a produtos inteiros ou variações específicas**
- ✅ **Seleção em massa** com botão "Selecionar Todos"
- ✅ **Preços promocionais aparecem automaticamente** no site
- ✅ **Badge visual de promoção** nos produtos
- ✅ **Preço original riscado** quando em promoção
- ✅ **Integração com PayPal** (usa preços promocionais no checkout)

### Como usar:

1. Acesse `/admin/promocoes`
2. Clique em "Nova Promoção"
3. Preencha nome, tipo de desconto e valor
4. Configure datas (início e fim)
5. Selecione produtos ou variações
6. Salve e pronto! ✨

### Páginas que exibem promoções:

- ✅ Home (produtos em destaque)
- ✅ Listagem de produtos
- ✅ Detalhes do produto
- ✅ Favoritos
- ✅ Carrinho (preços calculados com promoção)
- ✅ Checkout (PayPal recebe valor promocional)

---

## 📊 Banco de Dados

**Tabelas criadas:**

- `promotions` - Dados das promoções
- `promotion_products` - Produtos vinculados
- `promotion_variations` - Variações vinculadas

**Migração aplicada:** ✅ `drizzle/0022_add_promotions.sql`

---

## 🔧 Workflow Simplificado de Deploy

Agora o deploy é automático:

```bash
git add .
git commit -m "sua mensagem"
git push
```

A Vercel detecta e faz deploy automaticamente! 🎉

---

**Última atualização:** 10 de Novembro de 2025
