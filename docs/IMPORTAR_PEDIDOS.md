# 📋 GUIA: Exportar e Importar PEDIDOS do WordPress

## 🎯 Objetivo
Exportar pedidos completos do WooCommerce e importar para o novo sistema Next.js.

---

## 1️⃣ EXPORTAR PEDIDOS do WordPress

### Acesse o Adminer
```
https://seu-site.com.br/wp-admin/adminer.php
```

### 📝 Passo 1: Exportar PEDIDOS

1. Clique em **"SQL command"**
2. Abra o arquivo: `scripts/migration/export-pedidos-completo.sql`
3. **Copie todo o conteúdo** e cole no Adminer
4. Clique em **"Execute"**
5. Aguarde a query processar (pode demorar se tiver muitos pedidos)
6. Clique em **"Export"**
7. Configure:
   - **Format**: CSV
   - **Output**: save
   - **Format specific options**: UTF-8
8. Salve como: `data/test/pedidos-completo.csv`

### 📦 Passo 2: Exportar ITENS DE PEDIDO

1. Clique em **"SQL command"** novamente
2. Abra o arquivo: `scripts/migration/export-order-items-completo.sql`
3. **Copie todo o conteúdo** e cole no Adminer
4. Clique em **"Execute"**
5. Aguarde a query processar
6. Clique em **"Export"**
7. Configure:
   - **Format**: CSV
   - **Output**: save
   - **Format specific options**: UTF-8
8. Salve como: `data/test/order-items-completo.csv`

---

## 2️⃣ IMPORTAR PEDIDOS no Next.js

### ✅ Pré-requisitos

Verifique que você já tem:
- ✅ Clientes importados (~600+)
- ✅ Produtos importados (89/89)

### 🚀 Executar Importação

```bash
npx tsx scripts/migration/import-orders.ts data/test/pedidos-completo.csv data/test/order-items-completo.csv
```

### 📊 O que será importado:

**PEDIDOS:**
- Status do pedido (completo, processando, cancelado, etc.)
- Valores totais, subtotais, descontos, taxas
- Dados do cliente (email, nome, endereço)
- Informações de pagamento (método, gateway, IDs de transação)
- Datas (criação, pagamento, atualização)
- Moeda (BRL/USD/EUR)
- Cupons de desconto
- Notas do cliente

**ITENS:**
- Produtos vinculados aos pedidos
- Quantidades
- Preços no momento da compra
- Totais por item
- Variações (se houver)

---

## 3️⃣ VALIDAR IMPORTAÇÃO

### Verificar no Drizzle Studio

```bash
npm run db:studio
```

Acesse: https://local.drizzle.studio

**Verificações:**
1. **Tabela `orders`**:
   - Total de pedidos importados
   - Status corretos
   - Valores corretos (total, subtotal, desconto)
   - paymentId preenchido (Mercado Pago, PayPal, etc.)
   - Datas corretas

2. **Tabela `order_items`**:
   - Items vinculados aos pedidos
   - Produtos corretos
   - Quantidades corretas
   - Preços preservados

3. **Relacionamentos**:
   - Cada pedido → vinculado a um usuário
   - Cada item → vinculado a um pedido + produto

---

## ⚠️ PROBLEMAS COMUNS

### ❌ "Usuário não encontrado"
**Causa**: Cliente do pedido não foi importado ainda
**Solução**: Importar clientes primeiro

### ❌ "Produto WP #123 não encontrado"
**Causa**: Produto do pedido não foi importado
**Solução**: Verificar se todos os produtos foram importados

### ❌ "product_id inválido"
**Causa**: Item de pedido sem product_id no CSV
**Solução**: Verificar query de export de items

### ❌ "BOM removido"
**Mensagem**: ✅ Isso é NORMAL! O script remove automaticamente o BOM do CSV

---

## 📈 RELATÓRIO DE IMPORTAÇÃO

Após a execução, você verá:

```
📈 RELATÓRIO DE IMPORTAÇÃO
============================================================
Total no CSV:     1473
✅ Importados:    1400 (95%)
⏭️  Pulados:       50 (3%)
❌ Erros:         23 (2%)
============================================================
```

**Pulados**: Pedidos cujo cliente não foi encontrado
**Erros**: Problemas ao criar pedido ou items

---

## 🎯 PRÓXIMOS PASSOS

Após importar pedidos com sucesso:

1. ✅ **Verificar dados** no Drizzle Studio
2. 📥 **Importar downloads** (permissões de acesso aos PDFs)
3. 🖼️ **Baixar imagens** dos produtos (upload para Cloudflare R2)
4. 🧪 **Testar checkout** no ambiente local
5. 🚀 **Deploy** em produção

---

## 💡 DICAS

### Performance
- A importação pode demorar para muitos pedidos (1000+)
- Cada pedido busca o cliente e cria items
- Tempo estimado: ~1-2 segundos por pedido

### Dados Preservados
- ✅ IDs originais do WordPress (wpOrderId)
- ✅ Status exatos do WooCommerce
- ✅ Valores originais (sem conversão)
- ✅ Datas originais de criação
- ✅ Métodos de pagamento originais
- ✅ IDs de transação (Mercado Pago, PayPal, etc.)

### Dados Migrados mas Não Armazenados
- Endereços de cobrança/entrega (disponíveis no CSV, adicionar ao schema se necessário)
- Notas do cliente (disponíveis no CSV)
- IP do cliente (disponível no CSV)
- User agent (disponível no CSV)

Se precisar desses dados, podemos estender o schema `orders`!

---

## 🆘 SUPORTE

Caso encontre problemas:
1. Verifique os logs detalhados no terminal
2. Confira se os CSVs foram exportados corretamente (UTF-8)
3. Valide que clientes e produtos foram importados antes
4. Veja a seção "PROBLEMAS COMUNS" acima

---

**Criado em**: 04/11/2025  
**Última atualização**: 04/11/2025
