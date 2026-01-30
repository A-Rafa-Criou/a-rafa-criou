# Diferenças entre Afiliado Comum e Licença Comercial

**Data**: 26 de Janeiro de 2026  
**Status**: ✅ CORRIGIDO - Sistema funcionando corretamente

---

## 🎯 Resumo das Diferenças

| Característica               | Afiliado Comum          | Licença Comercial             |
| ---------------------------- | ----------------------- | ----------------------------- |
| **Comissão em vendas PAGAS** | ✅ SIM (% configurável) | ❌ NÃO                        |
| **Comissão em vendas FREE**  | ❌ NÃO (total = 0)      | ❌ NÃO                        |
| **Acesso aos arquivos**      | ❌ NÃO                  | ✅ SIM (temporário)           |
| **Acesso em produtos PAGOS** | ❌ NÃO                  | ✅ SIM                        |
| **Acesso em produtos FREE**  | ❌ NÃO                  | ✅ SIM                        |
| **Prazo de acesso**          | -                       | ⏰ 5 dias (configurável)      |
| **Aprovação**                | ✅ Automática           | 🔒 Manual (admin)             |
| **Contrato assinado**        | ❌ NÃO                  | ✅ SIM (digital)              |
| **Rastreamento de uso**      | -                       | ✅ Visualizações + Impressões |

---

## 📊 AFILIADO COMUM (common)

### Objetivo

Divulgar produtos e ganhar comissão em cada venda realizada através do link de afiliado.

### Como Funciona

#### 1. Cadastro

- **Auto-aprovação**: Status `active` imediatamente
- **Dados**: Nome, email, PIX, telefone
- **Código único**: Gerado automaticamente (ex: `h41AoIF2ri`)
- **Slug personalizado**: Nome convertido para URL (ex: `eduardosodre`)

#### 2. Divulgação

- Recebe link personalizado: `https://arafacriou.com.br?ref=eduardosodre`
- Cookie salvo por 30 dias
- Ref mantido em toda navegação

#### 3. Comissão

**✅ GANHA comissão quando**:

- Cliente compra produto PAGO
- Pedido está `status = completed` e `paymentStatus = paid`
- Total do pedido > R$ 0,00

**❌ NÃO ganha comissão quando**:

- Cliente baixa produto GRATUITO (total = R$ 0,00)
- Pedido cancelado ou pendente
- Auto-referral (compra própria)

**Cálculo da comissão**:

```typescript
const comissao = (valorPedido * porcentagem) / 100;
// Exemplo: R$ 40,00 * 10% = R$ 4,00
```

**Status da comissão**:

- `pending`: Aguarda aprovação admin
- `approved`: Aprovada, aguarda pagamento
- `paid`: Paga ao afiliado
- `rejected`: Rejeitada (fraude/erro)

#### 4. Materiais de Divulgação

- Acesso a banners, imagens, textos prontos
- Downloads ilimitados
- Sem acesso aos PDFs dos produtos

---

## 🏷️ LICENÇA COMERCIAL (commercial_license)

### Objetivo

Utilizar os arquivos digitais como material base para produção física de produtos.

### Como Funciona

#### 1. Cadastro

- **Aprovação manual**: Status `inactive` até admin aprovar
- **Dados completos**: Nome, email, telefone, CPF/CNPJ, endereço
- **Contrato assinado**: Assinatura digital obrigatória
- **Upload de documentos**: Possível adicionar contrato em PDF

#### 2. Aprovação

```text
Usuário cadastra → Admin analisa → Admin aprova/rejeita → Email enviado → Status = active
```

#### 3. Acesso aos Arquivos

**Quando o afiliado comercial recebe acesso**:

1. Cliente compra produto usando link do afiliado: `?ref=eduardosodre`
2. Pedido pode ser:
   - ✅ **PAGO** (Stripe, PayPal, PIX)
   - ✅ **GRATUITO** (produto R$ 0,00 ou cupom 100%)
3. Sistema cria registro em `affiliate_file_access`
4. Email enviado ao afiliado comercial

**Características do acesso**:

- ⏰ **Expira em X dias** (padrão 5, configurável em `site_settings`)
- 📊 **Rastreado**: Contadores de visualizações e impressões
- 🔒 **Protegido**: Sem download direto, apenas visualização
- 👤 **Dados do comprador**: Email salvo no acesso

#### 4. Visualização e Impressão

**API de visualização**: `POST /api/affiliates/file-access/download`

```json
{
  "accessId": "uuid-do-acesso",
  "action": "view" // ou "print"
}
```

**Comportamento**:

- `action: "view"` → Incrementa `viewCount`, abre PDF em iframe
- `action: "print"` → Incrementa `printCount`, permite impressão

**Validações**:

- ✅ Afiliado é dono do acesso
- ✅ Licença está ativa
- ✅ Acesso não expirou
- ✅ Produto tem arquivo disponível

#### 5. Comissões

**❌ NUNCA recebe comissão**:

- Produtos PAGOS → Apenas acesso aos arquivos
- Produtos FREE → Apenas acesso aos arquivos
- Sistema NÃO cria registro em `affiliate_commissions`

**Motivo**: O benefício da licença comercial é o acesso aos materiais para produção física, não comissão financeira.

---

## 🔄 Fluxos Comparados

### FLUXO: Compra de Produto PAGO (R$ 40,00)

#### Com Afiliado Comum

```text
1. Cliente acessa: https://arafacriou.com.br?ref=joao-silva
2. Cookie salvo: affiliate_code=joao-silva (30 dias)
3. Cliente compra produto R$ 40,00
4. Webhook Stripe/PayPal dispara
5. ✅ Sistema cria COMISSÃO: R$ 4,00 (10%)
6. ❌ Sistema NÃO concede acesso ao arquivo
7. Afiliado comum recebe comissão após aprovação admin
```

#### Com Licença Comercial

```text
1. Cliente acessa: https://arafacriou.com.br?ref=eduardosodre
2. Cookie salvo: affiliate_code=eduardosodre (30 dias)
3. Cliente compra produto R$ 40,00
4. Webhook Stripe/PayPal dispara
5. ❌ Sistema NÃO cria comissão (licença comercial)
6. ✅ Sistema CONCEDE acesso ao arquivo PDF (5 dias)
7. Afiliado comercial recebe email com link para visualizar arquivo
8. Pode imprimir/visualizar até expirar
```

### FLUXO: Produto GRATUITO (R$ 0,00)

#### Com Afiliado Comum

```text
1. Cliente acessa: https://arafacriou.com.br?ref=joao-silva
2. Cookie salvo: affiliate_code=joao-silva (30 dias)
3. Cliente baixa produto GRATUITO
4. API /api/orders/free cria pedido
5. ❌ Sistema NÃO cria comissão (total = 0)
6. ❌ Sistema NÃO concede acesso (afiliado comum)
7. Afiliado comum não recebe nada
```

#### Com Licença Comercial

```text
1. Cliente acessa: https://arafacriou.com.br?ref=eduardosodre
2. Cookie salvo: affiliate_code=eduardosodre (30 dias)
3. Cliente baixa produto GRATUITO
4. API /api/orders/free cria pedido
5. ❌ Sistema NÃO cria comissão (licença comercial)
6. ✅ Sistema CONCEDE acesso ao arquivo PDF (5 dias)
7. Afiliado comercial recebe email com link
8. Pode usar o arquivo para produção física
```

---

## 💻 Implementação Técnica

### Webhook Stripe/PayPal

**Ordem de execução**:

```typescript
// 1. Criar comissão (apenas afiliados comuns + pedidos pagos)
await createCommissionForPaidOrder(order.id);

// 2. Conceder acesso (apenas licença comercial + qualquer pedido)
await grantFileAccessForOrder(order.id);
```

### API de Pedidos Gratuitos

**Ordem de execução**:

```typescript
// 1. Buscar afiliado do cookie
const affiliateCode = request.cookies.get('affiliate_code')?.value;

// 2. Criar pedido com affiliateId
await db.insert(orders).values({
  // ... outros campos
  affiliateId: affiliateId, // Salvo no pedido
});

// 3. Conceder acesso (apenas licença comercial)
await grantFileAccessForOrder(newOrder.id);
```

### Função: createCommissionForPaidOrder()

**Validações internas**:

```typescript
// 1. Pedido existe?
if (!order) return;

// 2. Tem afiliado?
if (!order.affiliateId) return;

// 3. Buscar tipo do afiliado
const affiliate = await db.query.affiliates.findFirst(...);

// 4. ⚠️ REGRA CRÍTICA: Licença comercial NÃO recebe comissão
if (affiliate.affiliateType === 'commercial_license') {
  console.log('Licença comercial NÃO recebe comissão');
  return; // Sai da função
}

// 5. Pedido está pago?
if (order.status !== 'completed' || order.paymentStatus !== 'paid') return;

// 6. Total é maior que zero?
if (parseFloat(order.total) <= 0) {
  console.log('Pedido gratuito - sem comissão');
  return;
}

// 7. Criar comissão apenas para afiliados COMUNS com pedidos PAGOS
await createAffiliateCommission(...);
```

### Função: grantFileAccessForOrder()

**Validações internas**:

```typescript
// 1. Pedido existe?
if (!order) return;

// 2. Tem afiliado?
if (!order.affiliateId) return;

// 3. Buscar tipo do afiliado
const affiliate = await db.query.affiliates.findFirst(...);

// 4. ⚠️ REGRA CRÍTICA: Apenas licença comercial recebe acesso
if (affiliate.affiliateType !== 'commercial_license') {
  console.log('Apenas licença comercial recebe acesso');
  return; // Sai da função
}

// 5. Afiliado está ativo?
if (affiliate.status !== 'active') return;

// 6. ✅ IMPORTANTE: Produtos gratuitos TAMBÉM concedem acesso
const isFree = parseFloat(order.total) === 0;
if (isFree) {
  console.log('PRODUTO GRATUITO - concedendo acesso normalmente');
}

// 7. Criar acessos para todos os produtos do pedido
await db.insert(affiliateFileAccess).values(...);
```

---

## 📋 Checklist de Funcionamento

### Para Afiliado Comum

- [ ] Cadastro com auto-aprovação
- [ ] Link personalizado gerado
- [ ] Cookie salvo ao acessar com `?ref=`
- [ ] Pedido PAGO cria comissão
- [ ] Pedido FREE NÃO cria comissão
- [ ] Comissão aparece no dashboard
- [ ] Não tem acesso aos arquivos PDF

### Para Licença Comercial

- [ ] Cadastro aguarda aprovação manual
- [ ] Admin aprova no painel
- [ ] Link personalizado gerado
- [ ] Cookie salvo ao acessar com `?ref=`
- [ ] Pedido PAGO concede acesso ao arquivo
- [ ] Pedido FREE concede acesso ao arquivo
- [ ] Email enviado com notificação
- [ ] Acesso aparece no dashboard
- [ ] Pode visualizar/imprimir arquivo
- [ ] Acesso expira em X dias
- [ ] NÃO recebe comissão (nem em pedidos pagos)

---

## 🐛 Problemas Corrigidos (26/01/2026)

### 1. Licença comercial recebia comissão

**Antes**: `createCommissionForPaidOrder()` criava comissão para todos os afiliados  
**Agora**: Verifica `affiliateType` e sai da função se for `commercial_license`

### 2. Produtos FREE não concediam acesso

**Antes**: `/api/orders/free` não chamava `grantFileAccessForOrder()`  
**Agora**: Chama a função após criar o pedido

### 3. Pedido FREE não salvava affiliateId

**Antes**: `/api/orders/free` não buscava cookie de afiliado  
**Agora**: Busca cookie e salva `affiliateId` no pedido

---

## 📝 Logs de Debug

### Comissão (Afiliado Comum)

```text
[Affiliate] 💰 Pedido encontrado: abc123...
[Affiliate] 💰 Afiliado encontrado: João Silva
[Affiliate] 💰 Criando comissão para afiliado COMUM: João Silva
[Affiliate] ✅ Comissão criada: xyz789...
```

### Comissão Bloqueada (Licença Comercial)

```text
[Affiliate] 💰 Pedido encontrado: abc123...
[Affiliate] 💰 Afiliado "EDUARDO SODRE" tem licença COMERCIAL - NÃO recebe comissão
[Affiliate] 💰 Licença comercial só recebe acesso aos arquivos, não comissão
```

### Acesso a Arquivos (Licença Comercial)

```text
============================================================
🔐 [ACESSO ARQUIVOS] Iniciando para pedido: abc123...
============================================================
📊 [ACESSO ARQUIVOS] Pedido: abc123...
💰 [ACESSO ARQUIVOS] Total: 0.00 BRL (GRATUITO)
👤 [ACESSO ARQUIVOS] Afiliado: EDUARDO SODRE SIMAO
🏷️  [ACESSO ARQUIVOS] Tipo: commercial_license
✅ [ACESSO ARQUIVOS] Status: active
✅ [ACESSO ARQUIVOS] Afiliado COMERCIAL + ATIVO - prosseguindo...
🎁 [ACESSO ARQUIVOS] PRODUTO GRATUITO - concedendo acesso normalmente
📦 [ACESSO ARQUIVOS] 2 itens encontrados
✅ [ACESSO ARQUIVOS] Acesso concedido: "Molde de Roupa" até 31/01/2026
📁 [ACESSO ARQUIVOS] Total de acessos criados: 2
```

---

**Última atualização**: 26 de Janeiro de 2026  
**Desenvolvido por**: GitHub Copilot
