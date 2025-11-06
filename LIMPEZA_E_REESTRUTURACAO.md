# 🧹 LIMPEZA E REESTRUTURAÇÃO COMPLETA

**Data:** 05/11/2025  
**Objetivo:** Remover migração WordPress e preparar sistema para criação manual de produtos

---

## ✅ CONCLUÍDO

### 1. **Limpeza do Banco de Dados**
- ✅ Script criado: `scripts/cleanup/delete-all-products.ts`
- ✅ Executado com sucesso
- ✅ **0 produtos** deletados (banco já estava limpo)
- ✅ **0 variações** deletadas
- ✅ **0 imagens** deletadas
- ✅ **0 arquivos** deletados

### 2. **Ajuste do Sistema de Imagens**
- ✅ Função `getPreviewSrc()` atualizada para aceitar:
  - URLs do Cloudinary (`res.cloudinary.com`)
  - URLs do WordPress (`arafacriou.com.br`)
  - URLs HTTP/HTTPS genéricas
  - Base64 (data: URI)
  - Base64 puro
  - Chaves R2

- ✅ Componentes atualizados para suportar `wpImageUrl`:
  - `ProductsCards.tsx` (admin)
  - `ProductDetailEnhanced.tsx` (frontend)
  - `FeaturedProducts.tsx` (home)

---

## 🚧 EM ANDAMENTO

### 3. **Remoção de Scripts de Migração**
Preciso deletar:
- `scripts/migration/` (toda a pasta)
- `scripts/cleanup/delete-all-products.ts` (após executar)
- Documentos de migração WordPress

### 4. **Remoção de Campos WordPress do Schema**
Criar migration para remover:
- `products.wpProductId`
- `products.wpImageUrl`
- `users.legacyPasswordType`
- `users.legacyPasswordHash`
- `orders.wpOrderId`

---

## 📝 PRÓXIMAS TAREFAS

### 5. **Página /admin/pedidos** (NOVA)
- [ ] Criar interface de listagem de pedidos
- [ ] Filtros: status, data, cliente
- [ ] Paginação
- [ ] Busca por ID/cliente

### 6. **Dialog de Detalhes do Pedido** (NOVO)
- [ ] Mostrar informações completas do pedido
- [ ] **Link de download** visível (para admin verificar)
- [ ] **Botão "Reenviar Email"** (caso cliente não recebeu)
- [ ] **Botão "Editar Produto"** - Select com produtos do banco
- [ ] Salvar alteração no banco

### 7. **Toggle isActive no ProductForm** (NOVO)
- [ ] Adicionar switch "Produto Ativo"
- [ ] Produtos inativos:
  - ✅ Salvos no banco
  - ✅ Disponíveis para envio em pedidos
  - ❌ **NÃO aparecem no frontend** (catálogo/home)
- [ ] Use case: Produtos personalizados one-off

### 8. **Criar Produto Personalizado** (NOVO)
- [ ] Dialog dentro do pedido
- [ ] Campos: nome, preço, arquivo PDF
- [ ] Upload direto para R2
- [ ] Salvar no banco com `isActive = false`
- [ ] Associar ao pedido automaticamente

---

## 🎯 RESULTADO ESPERADO

### Fluxo Completo:

1. **Admin cria produtos** em `/admin/produtos`
   - Produtos normais: `isActive = true` (aparecem no site)
   - Produtos personalizados: `isActive = false` (só para envio)

2. **Cliente faz pedido** no site
   - Escolhe produtos ativos
   - Paga via Stripe/PayPal/PIX

3. **Sistema envia email** com link de download
   - Link gerado automaticamente
   - Válido por 1 hora (renovável)

4. **Se houver problema:**
   - Admin acessa `/admin/pedidos`
   - Clica em "Ver Detalhes"
   - Vê o link de download
   - Pode reenviar email
   - Pode trocar produto associado
   - Pode criar produto personalizado na hora

---

## 📂 Arquivos Criados/Modificados

### Criados:
- `scripts/cleanup/delete-all-products.ts` ✅

### Modificados:
- `src/lib/r2-utils.ts` (getPreviewSrc) ✅
- `src/components/admin/ProductsCards.tsx` ✅
- `src/components/product-detail-enhanced.tsx` ✅
- `src/components/sections/FeaturedProducts.tsx` ✅

### A Deletar:
- `scripts/migration/` (toda pasta)
- Docs de migração WordPress

### A Criar:
- `drizzle/0011_remove_wp_fields.sql`
- `src/app/admin/pedidos/page.tsx`
- `src/components/admin/OrderDetailsDialog.tsx`
- `src/components/admin/CreateCustomProductDialog.tsx`

---

## ⏭️ PRÓXIMO PASSO

**AGORA:** Deletar scripts de migração e remover campos WordPress do schema.

**DEPOIS:** Implementar funcionalidades de gestão de pedidos.
