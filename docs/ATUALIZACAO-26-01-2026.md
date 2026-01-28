# Resumo de Atualização - Sistema de Afiliados

**Data**: 26 de Janeiro de 2026

## 🎯 O Que Foi Feito

### 1. ✅ Copilot Instructions Atualizado

Arquivo: `.github/copilot-instructions.md`

**Novas regras adicionadas**:

🚫 **NUNCA Apagar Dados**

- Proibido usar `DROP TABLE`, `DELETE FROM`, `TRUNCATE`
- Proibido apagar produtos, orders, users, affiliates
- Migrations sempre com `IF NOT EXISTS`
- Preservar dados existentes em qualquer operação

♻️ **SEMPRE Reutilizar**

- Verificar se tabela/coluna/API já existe ANTES de criar
- Usar schemas e componentes existentes
- Não duplicar funcionalidades
- Consultar documentação atual

### 2. ✅ Documento de Afiliados Consolidado

Arquivo: `docs/sistema-afiliados-analise-completa-stripe-connect.md`

**Melhorias**:

- ⚠️ Avisos no topo sobre não apagar dados
- ✅ Status confirmado das migrations (já executadas)
- ✅ Exports do schema documentados
- 🚫 Seção de segurança com proteção de dados
- ♻️ Checklist antes de criar algo novo
- 📊 Comparação com documento anterior

### 3. ✅ Documento Antigo Marcado como Obsoleto

Arquivo: `docs/sistema-afiliados-proximos-passos.md`

**Mudanças**:

- ⚠️ Banner no topo indicando obsoleto
- 📄 Link para novo documento
- Lista de melhorias na nova versão

## 🗄️ Estado Atual do Banco (CONFIRMADO)

### Tabelas Existentes (NÃO RECRIAR)

```
✅ affiliates (tabela principal)
✅ affiliate_links
✅ affiliate_commissions
✅ affiliate_clicks
✅ affiliate_materials
✅ affiliate_material_downloads
✅ affiliate_file_access
```

### Migrations Executadas (NÃO REPETIR)

```
✅ 0025_add_affiliate_settings.sql
✅ 0029_add_affiliate_system_overhaul.sql
```

### Schema Drizzle

```
✅ Todas as tabelas em src/lib/db/schema.ts
✅ Todas as relações configuradas
✅ Exports disponíveis para uso
```

## 🎯 Próximos Passos (Sem Duplicar)

### 1. Usar APIs Existentes

Antes de criar nova API, verificar em `src/app/api/affiliates/`:

- ✅ 17 rotas já implementadas
- ✅ Dashboard, cadastro, rastreamento funcionando

### 2. Criar Apenas o Faltante

**APIs a implementar** (confirmado que NÃO existem):

- ❌ `GET /api/affiliates/sales` - Lista de vendas
- ❌ `GET /api/affiliates/orders` - Pedidos comercial
- ❌ `GET /api/affiliates/materials` - Materiais

**Não criar** (já existem):

- ✅ Cadastro de afiliados
- ✅ Dashboard
- ✅ File access
- ✅ Links e tracking

### 3. Sistema de Emails

- ❌ Templates a criar (NÃO existem ainda)
- ✅ Resend já instalado (verificar package.json)

### 4. Admin Features

- ⚠️ Verificar componentes existentes antes de criar
- ✅ `/admin/afiliados` já existe
- ✅ `/admin/afiliados/comissoes` já existe

## ⚠️ Regras Críticas Para Próximas Implementações

### Antes de Criar Qualquer Coisa

```typescript
// 1. VERIFICAR SE JÁ EXISTE
const existingTable = await db.query.affiliates; // ✅ existe
const existingRoute = 'src/app/api/affiliates/me/route.ts'; // ✅ existe

// 2. SE NÃO EXISTE, CRIAR
// 3. SE EXISTE, REUTILIZAR

// 🚫 NUNCA fazer:
await db.delete(orders).where(...) // ❌ PROIBIDO
await db.delete(products).where(...) // ❌ PROIBIDO

// ✅ SEMPRE fazer:
await db.update(affiliates).set({
  status: 'inactive' // soft delete
}).where(eq(affiliates.id, id));
```

### Migrations Seguras

```sql
-- ✅ SEMPRE usar IF NOT EXISTS
ALTER TABLE "affiliates" ADD COLUMN IF NOT EXISTS "novo_campo" VARCHAR(255);

-- ✅ SEMPRE preservar dados
UPDATE "affiliates" SET "novo_campo" = 'valor_padrao' WHERE "novo_campo" IS NULL;

-- 🚫 NUNCA usar
DROP TABLE "affiliates"; -- ❌ PROIBIDO
DELETE FROM "orders"; -- ❌ PROIBIDO
TRUNCATE "products"; -- ❌ PROIBIDO
```

## 📊 Comparação: Antes vs Depois

| Aspecto               | Antes                 | Depois                      |
| --------------------- | --------------------- | --------------------------- |
| **Proteção de dados** | Não explícito         | 🚫 Regras claras            |
| **Duplicação**        | Possível              | ♻️ Verificação obrigatória  |
| **Migrations**        | Incerto se executadas | ✅ Confirmado executadas    |
| **APIs**              | Lista básica          | ✅ 17 rotas confirmadas     |
| **Documentação**      | Espalhada             | 📄 Consolidada em 1 arquivo |
| **Stripe Connect**    | Não analisado         | ✅ Análise completa         |

## ✅ Checklist de Verificação

Antes de implementar qualquer feature:

- [ ] Consultar `docs/sistema-afiliados-analise-completa-stripe-connect.md`
- [ ] Verificar se tabela existe em `src/lib/db/schema.ts`
- [ ] Verificar se API existe em `src/app/api/`
- [ ] Verificar se componente existe em `src/components/`
- [ ] Se existe, REUTILIZAR
- [ ] Se não existe, CRIAR com proteção de dados
- [ ] NUNCA usar DELETE, DROP, TRUNCATE no banco
- [ ] SEMPRE usar `IF NOT EXISTS` em migrations

---

**Resumo criado por**: GitHub Copilot  
**Data**: 26 de Janeiro de 2026
