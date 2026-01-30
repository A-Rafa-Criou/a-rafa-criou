# Guia de Testes - Sistema de Afiliados

**Data**: 26/01/2026  
**Versão**: 1.1  
**Última Atualização**: Sistema de acesso a arquivos corrigido

---

## 📚 Documentação Relacionada

- **[Sistema de Acesso a Arquivos](./SISTEMA-ACESSO-ARQUIVOS-AFILIADOS.md)** - Correções e fluxo completo
- **[Implementações 26/01](./IMPLEMENTACOES-26-01-2026.md)** - Status das APIs
- **[Sistema Completo](./sistema-afiliados-analise-completa-stripe-connect.md)** - Visão geral

---

## ⚠️ NOVO: Teste de Acesso a Arquivos (Licença Comercial)

### Problema Corrigido (26/01/2026)

**Situação anterior**: Afiliados comerciais não recebiam acesso automático aos arquivos após vendas  
**Status atual**: ✅ Corrigido e funcionando

### Pré-Requisitos para Testar

1. ✅ Produtos devem ter `fileUrl` no banco
2. ✅ Afiliado deve ter `affiliateType = 'commercial_license'`
3. ✅ Afiliado deve estar `status = 'active'`

### Como Testar via Script

```bash
npx tsx scripts/test-affiliate-file-access.js
```

**O que o script verifica**:

- ✅ Busca afiliado comercial ativo
- ✅ Busca pedido pago do afiliado
- ✅ Chama função `grantFileAccessForOrder()`
- ✅ Verifica acessos criados no banco
- ✅ Mostra logs detalhados

### Logs Esperados (Sucesso)

```text
🔐 Iniciando concessão de acesso para pedido: abc123...
📊 Pedido encontrado com afiliado: xyz789...
👤 Afiliado: EDUARDO SODRE SIMAO (commercial_license)
📦 2 itens encontrados no pedido
📚 2 produtos encontrados com dados
⏰ Dias de acesso configurados: 5
✅ Acesso concedido: "Molde de Roupa" até 31/01/2026
📁 Total de acessos criados: 2
📧 Enviando email para diviseseguranca@hotmail.com...
```

### Verificar no Banco

```sql
SELECT
  afa.id,
  afa.granted_at,
  afa.expires_at,
  afa.view_count,
  afa.print_count,
  p.name as product_name,
  a.name as affiliate_name,
  afa.buyer_email
FROM affiliate_file_access afa
JOIN affiliates a ON a.id = afa.affiliate_id
JOIN products p ON p.id = afa.product_id
ORDER BY afa.granted_at DESC
LIMIT 10;
```

---

## 🚀 Preparação do Ambiente

### 1. Iniciar Servidor de Desenvolvimento

```powershell
npm run dev
```

Servidor estará em: `http://localhost:3000`

### 2. Variáveis de Ambiente Necessárias

Adicione no `.env.local`:

```bash
# Resend (para emails)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL="A Rafa Criou <afiliados@arafacriou.com>"

# Admin
ADMIN_EMAIL=admin@arafacriou.com

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🧪 Cenários de Teste

### 🟢 TESTE 1: Cadastro de Afiliado Comum (Auto-Aprovação)

#### Passo 1: Fazer Login

1. Acesse: `http://localhost:3000/login`
2. Faça login com um usuário comum (não admin)

#### Passo 2: Acessar Página de Cadastro

**URL**: `http://localhost:3000/afiliados-da-rafa/cadastro` (ou similar - verificar rota real)

**OU testar via API diretamente**:

```bash
# POST http://localhost:3000/api/affiliates/register/common
# Headers: Cookie com sessão autenticada

{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11987654321",
  "pixKey": "11987654321",
  "termsAccepted": true,
  "termsIp": "127.0.0.1"
}
```

#### Resultado Esperado

- ✅ Status: 201 Created
- ✅ Retorna: `{ affiliate: { id, code, status: 'active' } }`
- ✅ Email de boas-vindas enviado para `joao@example.com`
- ✅ Campo `affiliateType = 'common'`
- ✅ Campo `autoApproved = true`
- ✅ Campo `status = 'active'`

#### Passo 3: Verificar no Banco

```sql
SELECT * FROM affiliates WHERE email = 'joao@example.com';
```

---

### 🟠 TESTE 2: Cadastro de Licença Comercial (Aprovação Manual)

#### Passo 1: Cadastrar

```bash
# POST http://localhost:3000/api/affiliates/register/commercial-license

{
  "name": "Maria Oliveira",
  "email": "maria@example.com",
  "phone": "11987654321",
  "cpfCnpj": "12345678901",
  "termsAccepted": true,
  "contractAccepted": true,
  "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "termsIp": "127.0.0.1"
}
```

#### Resultado Esperado

- ✅ Status: 201 Created
- ✅ Retorna: `{ affiliate: { id, code, status: 'inactive' } }`
- ✅ 2 emails enviados:
  - Para `maria@example.com` (confirmação)
  - Para `admin@arafacriou.com` (notificação)
- ✅ Campo `affiliateType = 'commercial_license'`
- ✅ Campo `autoApproved = false`
- ✅ Campo `status = 'inactive'`

---

### 🔵 TESTE 3: Listar Pendentes (Admin)

#### Passo 1: Login como Admin

1. Faça login com usuário que tem `role = 'admin'`

#### Passo 2: Listar Pendentes

```bash
# GET http://localhost:3000/api/admin/affiliates/pending
# Headers: Cookie com sessão de admin
```

#### Resultado Esperado

- ✅ Status: 200 OK
- ✅ Retorna lista de afiliados com:
  - `affiliateType = 'commercial_license'`
  - `status = 'inactive'`
- ✅ Exemplo:

```json
{
  "pending": [
    {
      "id": "uuid",
      "code": "abc123",
      "name": "Maria Oliveira",
      "email": "maria@example.com",
      "phone": "11987654321",
      "status": "inactive",
      "createdAt": "2026-01-26T...",
      "notes": "CPF/CNPJ: 12345678901"
    }
  ],
  "total": 1
}
```

---

### 🟢 TESTE 4: Aprovar Licença Comercial (Admin)

```bash
# POST http://localhost:3000/api/admin/affiliates/approve

{
  "affiliateId": "uuid-da-maria",
  "action": "approve",
  "notes": "Documentos verificados e aprovados"
}
```

#### Resultado Esperado

- ✅ Status: 200 OK
- ✅ Campo `status` atualizado para `'active'`
- ✅ Email de aprovação enviado para `maria@example.com`
- ✅ Campos preenchidos:
  - `approvedAt = now()`
  - `approvedBy = userId do admin`

---

### 🔵 TESTE 5: Consultar Vendas (Afiliado Comum)

#### Pré-requisito

- Ter um pedido pago com `affiliateId` do afiliado comum

#### Teste

```bash
# GET http://localhost:3000/api/affiliates/sales
# Headers: Cookie com sessão do afiliado comum (João)
```

#### Resultado Esperado

- ✅ Status: 200 OK
- ✅ Retorna lista de vendas:

```json
{
  "success": true,
  "sales": [
    {
      "id": "uuid",
      "customerEmail": "cliente@example.com",
      "orderTotal": "99.90",
      "currency": "BRL",
      "createdAt": "2026-01-26T...",
      "commissionId": "uuid",
      "commissionAmount": "9.99",
      "commissionRate": "10.00",
      "commissionStatus": "pending",
      "commissionPaidAt": null
    }
  ],
  "totalSales": 1
}
```

---

### 🟠 TESTE 6: Consultar Pedidos (Licença Comercial)

#### Pré-requisito

- Ter um pedido pago com `affiliateId` da Maria (licença comercial aprovada)

#### Teste

```bash
# GET http://localhost:3000/api/affiliates/orders
# Headers: Cookie com sessão da Maria
```

#### Resultado Esperado

- ✅ Status: 200 OK
- ✅ Retorna pedidos com itens:

```json
{
  "success": true,
  "orders": [
    {
      "id": "uuid",
      "customer": {
        "email": "cliente@example.com"
      },
      "total": "99.90",
      "currency": "BRL",
      "status": "completed",
      "paymentStatus": "paid",
      "items": [
        {
          "id": "uuid",
          "name": "Produto Digital",
          "quantity": 1,
          "price": "99.90",
          "product": {
            "id": "uuid",
            "name": "Produto Digital",
            "slug": "produto-digital"
          }
        }
      ],
      "createdAt": "2026-01-26T...",
      "paidAt": "2026-01-26T..."
    }
  ],
  "totalOrders": 1
}
```

---

### 🟢 TESTE 7: Listar Materiais de Divulgação

#### Pré-requisito

- Ter materiais cadastrados na tabela `affiliate_materials`

#### Inserir Material de Teste (SQL)

```sql
INSERT INTO affiliate_materials (
  title, description, file_url, file_name, file_type,
  affiliate_type, is_active, display_order
) VALUES (
  'Kit de Imagens Instagram',
  'Pacote com 10 imagens prontas para Instagram Stories',
  'https://r2.arafacriou.com.br/materials/kit-instagram.zip',
  'kit-instagram.zip',
  'application/zip',
  'both',
  true,
  1
);
```

#### Teste

```bash
# GET http://localhost:3000/api/affiliates/materials
# Headers: Cookie com sessão de qualquer afiliado
```

#### Resultado Esperado

- ✅ Status: 200 OK
- ✅ Retorna apenas materiais:
  - `isActive = true`
  - `affiliateType = [tipo do afiliado] OU 'both'`

---

### 🔵 TESTE 8: Acesso a Arquivos (Licença Comercial)

#### Pré-requisito

- Maria aprovada
- Venda realizada com `affiliateId` da Maria
- Webhook processado (criou registro em `affiliate_file_access`)

#### Teste 8.1: Listar Acessos

```bash
# GET http://localhost:3000/api/affiliates/file-access
# Headers: Cookie com sessão da Maria
```

#### Resultado Esperado

```json
{
  "success": true,
  "accesses": [
    {
      "id": "uuid",
      "isActive": true,
      "expired": false,
      "grantedAt": "2026-01-26T10:00:00Z",
      "expiresAt": "2026-01-31T10:00:00Z",
      "viewCount": 0,
      "printCount": 0,
      "buyer": {
        "email": "cliente@example.com"
      },
      "product": {
        "id": "uuid",
        "name": "Produto Digital",
        "slug": "produto-digital"
      }
    }
  ],
  "summary": {
    "total": 1,
    "active": 1,
    "expired": 0
  }
}
```

#### Teste 8.2: Baixar/Visualizar Arquivo

```bash
# POST http://localhost:3000/api/affiliates/file-access/download

{
  "accessId": "uuid-do-acesso",
  "action": "view"  // ou "print"
}
```

#### Resultado Esperado

- ✅ Status: 200 OK
- ✅ `viewCount` ou `printCount` incrementado
- ✅ `lastAccessedAt` atualizado

```json
{
  "fileUrl": "https://r2.arafacriou.com.br/...",
  "expiresAt": "2026-01-31T10:00:00Z",
  "action": "view"
}
```

---

### 🟠 TESTE 9: Webhook Stripe (Simulação)

#### Criar Venda de Teste com Afiliado

1. **Via interface**:
   - Acesse loja com link de afiliado: `?ref=abc123`
   - Finalize compra com Stripe

2. **Via SQL (simular)**:

```sql
-- Criar pedido com afiliado
INSERT INTO orders (
  email, status, total, currency,
  payment_status, affiliate_id, paid_at
) VALUES (
  'cliente@test.com',
  'pending',
  '99.90',
  'BRL',
  'pending',
  'uuid-do-joao',  -- Afiliado comum
  NULL
);

-- Marcar como pago (simular webhook)
UPDATE orders
SET status = 'completed',
    payment_status = 'paid',
    paid_at = NOW()
WHERE id = 'uuid-do-pedido';
```

1. **Simular webhook manualmente**:

```bash
# Chamar função diretamente no código
await createCommissionForPaidOrder('uuid-do-pedido');
await grantFileAccessForOrder('uuid-do-pedido');
```

---

## 🔍 Verificações no Banco de Dados

### Verificar Afiliados

```sql
SELECT
  id, code, name, email, affiliate_type,
  status, auto_approved, created_at
FROM affiliates
ORDER BY created_at DESC;
```

### Verificar Comissões

```sql
SELECT
  ac.id, a.name AS affiliate, o.email AS customer,
  ac.commission_amount, ac.status, ac.created_at
FROM affiliate_commissions ac
JOIN affiliates a ON a.id = ac.affiliate_id
JOIN orders o ON o.id = ac.order_id
ORDER BY ac.created_at DESC;
```

### Verificar Acessos a Arquivos

```sql
SELECT
  afa.id, a.name AS affiliate, p.name AS product,
  afa.granted_at, afa.expires_at,
  afa.view_count, afa.print_count,
  CASE WHEN afa.expires_at < NOW() THEN true ELSE false END AS expired
FROM affiliate_file_access afa
JOIN affiliates a ON a.id = afa.affiliate_id
JOIN products p ON p.id = afa.product_id
ORDER BY afa.granted_at DESC;
```

---

## 🐛 Troubleshooting

### Problema: Email não enviado

**Causa**: `RESEND_API_KEY` não configurada  
**Solução**:

1. Criar conta em <https://resend.com>
2. Adicionar chave em `.env.local`
3. Verificar logs do servidor

### Problema: 403 Forbidden em admin APIs

**Causa**: Usuário não é admin  
**Solução**: Atualizar role no banco:

```sql
UPDATE users SET role = 'admin' WHERE email = 'seu-email@example.com';
```

### Problema: Webhook não processa

**Causa**: Pedido já processado (idempotência)  
**Solução**: Criar novo pedido ou verificar logs

### Problema: Acesso expirado

**Causa**: Passou 5 dias desde `grantedAt`  
**Solução**: Atualizar manualmente:

```sql
UPDATE affiliate_file_access
SET expires_at = NOW() + INTERVAL '5 days'
WHERE id = 'uuid-do-acesso';
```

---

## 📊 Checklist de Testes

- [ ] **Afiliado Comum**
  - [ ] Cadastro (POST /register/common)
  - [ ] Email de boas-vindas recebido
  - [ ] Status = active
  - [ ] Listar vendas (GET /sales)
  - [ ] Ver materiais (GET /materials)

- [ ] **Licença Comercial**
  - [ ] Cadastro (POST /register/commercial-license)
  - [ ] Email de confirmação recebido
  - [ ] Email para admin recebido
  - [ ] Status = inactive
  - [ ] Admin lista pendentes (GET /admin/pending)
  - [ ] Admin aprova (POST /admin/approve)
  - [ ] Email de aprovação recebido
  - [ ] Status = active
  - [ ] Listar pedidos (GET /orders)
  - [ ] Ver materiais (GET /materials)
  - [ ] Listar acessos (GET /file-access)
  - [ ] Baixar arquivo (POST /file-access/download)

- [ ] **Webhooks**
  - [ ] Comissão criada para afiliado comum
  - [ ] Acesso criado para licença comercial
  - [ ] Email de acesso enviado

---

## 🎯 URLs Importantes

### Frontend (assumindo estrutura padrão)

- Login: `/login`
- Cadastro Afiliado: `/afiliados-da-rafa/cadastro`
- Dashboard Afiliado: `/afiliados-da-rafa/dashboard`
- Admin Dashboard: `/admin/afiliados`

### APIs

- `POST /api/affiliates/register/common`
- `POST /api/affiliates/register/commercial-license`
- `GET /api/affiliates/sales`
- `GET /api/affiliates/orders`
- `GET /api/affiliates/materials`
- `GET /api/affiliates/file-access`
- `POST /api/affiliates/file-access/download`
- `GET /api/admin/affiliates/pending`
- `POST /api/admin/affiliates/approve`

---

**Última atualização**: 26/01/2026
