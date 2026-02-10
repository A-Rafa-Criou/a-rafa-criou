# Sistema de Afiliados - Próximos Passos

**Data**: 30 de Janeiro de 2026  
**Status**: 90% implementado  
**Objetivo**: Completar 100% + Pagamentos Automáticos

---

## 📊 Análise do Sistema Atual

### ✅ O Que JÁ Funciona

#### Afiliado Comum
- ✅ Cadastro automático (status `active`)
- ✅ Geração de código único + customSlug
- ✅ Links personalizados com rastreamento
- ✅ Cookie de 30 dias
- ✅ Criação automática de comissões em pedidos pagos
- ✅ Dashboard com estatísticas
- ✅ API de vendas (`GET /api/affiliates/sales`)
- ✅ Emails automáticos
- ✅ Materiais de divulgação

#### Licença Comercial
- ✅ Cadastro com aprovação manual
- ✅ Contrato digital com assinatura
- ✅ Acesso temporário aos arquivos (5 dias)
- ✅ Rastreamento de visualizações/impressões
- ✅ Dashboard com pedidos
- ✅ API de acessos (`GET /api/affiliates/file-access`)
- ✅ Concessão automática após venda
- ✅ Emails automáticos

#### Admin
- ✅ Listagem de afiliados (`GET /api/admin/affiliates`)
- ✅ Aprovação/Rejeição (`POST /api/admin/affiliates/approve`)
- ✅ Listagem pendentes (`GET /api/admin/affiliates/pending`)
- ✅ Gestão de comissões (`GET /api/admin/affiliates/commissions`)
- ✅ Estatísticas financeiras
- ✅ Configurações globais em `site_settings`

---

## ❌ O Que FALTA Implementar

### 1. 🎯 ALTA PRIORIDADE - Gestão de Comissões pelo Admin

#### Problema Atual
- Admin pode ver comissão global em `site_settings.affiliateDefaultCommission` (10% padrão)
- Cada afiliado tem `affiliates.commissionValue` individual
- **FALTA**: API para admin alterar comissão de afiliados individuais
- **FALTA**: Interface UI para admin gerenciar comissões
- **FALTA**: Notificação em tempo real quando comissão muda

#### Solução Necessária

##### A) API: Alterar Comissão Individual
```
PATCH /api/admin/affiliates/[id]/commission
Body: { commissionValue: "15.00" }
```

##### B) API: Alterar Comissão Global Padrão
```
PATCH /api/admin/settings/affiliates
Body: { affiliateDefaultCommission: "12.00" }
```
✅ **JÁ EXISTE** - apenas melhorar feedback

##### C) UI no Painel Admin
- Editar comissão individual na lista de afiliados
- Modal de edição rápida
- Validação: 0% - 100%

##### D) Notificação ao Afiliado
- Email quando admin altera comissão
- Notificação no dashboard (badge NEW)
- Histórico de mudanças

---

### 2. 💳 MÉDIA PRIORIDADE - Pagamentos Manuais

#### Problema Atual
- Comissões ficam `pending` após venda
- Admin deve marcar manualmente como `paid`
- **FALTA**: Upload de comprovante de pagamento
- **FALTA**: Histórico de pagamentos

#### Solução Necessária

##### A) API: Marcar Comissão como Paga
```
POST /api/admin/affiliates/commissions/[id]/pay
Body: {
  paymentMethod: "pix",
  paymentProof?: "url-comprovante.pdf",
  notes?: "Pago via PIX"
}
```

##### B) UI: Gestão de Pagamentos
- Filtrar comissões `approved` (prontas para pagar)
- Upload de comprovante
- Campo de observações
- Histórico de pagamentos

---

### 3. 🚀 BAIXA PRIORIDADE - Pagamentos Automáticos (Stripe Connect)

#### Visão Geral
- Afiliados conectam conta Stripe
- Pagamentos automáticos após X dias
- Sem intervenção manual do admin
- Requer migração complexa

#### Roadmap Stripe Connect

##### Fase 1: Preparação (1-2 dias)
- Criar conta Stripe Connect
- Implementar OAuth para afiliados
- Adicionar `stripeAccountId` em `affiliates`

##### Fase 2: Onboarding (2-3 dias)
- API: Iniciar onboarding Stripe
- UI: Botão "Conectar Conta Stripe"
- Webhook: `account.updated`
- Verificação de conta ativa

##### Fase 3: Pagamentos (2-3 dias)
- API: Criar transferências automáticas
- Cron job: Processar comissões `approved`
- Webhook: `transfer.created`, `transfer.paid`
- Fallback para PIX manual

##### Fase 4: Testes (1-2 dias)
- Testar onboarding completo
- Testar transferências
- Testar falhas e rollback

**Total estimado**: 6-10 dias de desenvolvimento

---

## 🛠️ Plano de Implementação

### ETAPA 1: Gestão de Comissões (HOJE)

**Prioridade**: 🔥 CRÍTICA  
**Tempo estimado**: 2-3 horas

#### Tarefas:
1. ✅ Analisar schema e APIs existentes
2. ⏳ Criar API `PATCH /api/admin/affiliates/[id]/commission`
3. ⏳ Adicionar UI no painel admin
4. ⏳ Criar sistema de notificações (email + dashboard)
5. ⏳ Atualizar dashboard de afiliados para mostrar comissão atual

---

### ETAPA 2: Pagamentos Manuais (PRÓXIMA)

**Prioridade**: 🟡 MÉDIA  
**Tempo estimado**: 4-5 horas

#### Tarefas:
1. ⏳ API para marcar como pago com comprovante
2. ⏳ UI para upload de comprovantes
3. ⏳ Email de notificação de pagamento
4. ⏳ Relatório de pagamentos

---

### ETAPA 3: Stripe Connect (FUTURO)

**Prioridade**: 🔵 BAIXA  
**Tempo estimado**: 6-10 dias

#### Tarefas:
1. ⏳ Configurar Stripe Connect
2. ⏳ Implementar OAuth
3. ⏳ Criar fluxo de onboarding
4. ⏳ Implementar transferências automáticas
5. ⏳ Webhooks e monitoramento
6. ⏳ Testes completos

---

## 🔐 Considerações de Segurança

### Alteração de Comissão
- ✅ Apenas admin pode alterar
- ✅ Validação: 0% - 100%
- ✅ Registrar histórico (createdBy, updatedAt)
- ✅ Notificar afiliado por email

### Pagamentos Manuais
- ✅ Apenas admin pode marcar como pago
- ✅ Exigir confirmação dupla
- ✅ Salvar IP do admin
- ✅ Comprovante obrigatório para valores > R$ 100

### Stripe Connect
- ✅ Verificar identidade do afiliado
- ✅ KYC (Know Your Customer)
- ✅ Limites de transferência
- ✅ Detecção de fraude

---

## 📈 Métricas de Sucesso

### Gestão de Comissões
- [ ] Admin consegue alterar comissão individual em < 30 segundos
- [ ] Afiliado recebe email em < 1 minuto
- [ ] Dashboard mostra nova comissão em tempo real

### Pagamentos Manuais
- [ ] Tempo médio para processar pagamento: < 5 minutos
- [ ] 100% dos pagamentos com comprovante
- [ ] Zero disputas sobre valores pagos

### Stripe Connect
- [ ] Taxa de conclusão de onboarding: > 80%
- [ ] Tempo médio de pagamento: < 48 horas
- [ ] Taxa de falha de transferência: < 1%

---

## 🚦 Status Atual dos Componentes

| Componente | Status | Ação Necessária |
|------------|--------|-----------------|
| Schema `affiliates.commissionValue` | ✅ Implementado | Usar |
| Schema `site_settings.affiliateDefaultCommission` | ✅ Implementado | Usar |
| API `GET /api/admin/affiliates` | ✅ Funcional | Manter |
| API `PATCH /api/admin/affiliates/[id]` | ✅ Existe | Adicionar campo |
| API `PATCH /api/admin/settings/affiliates` | ✅ Funcional | Usar |
| UI Admin - Lista Afiliados | ✅ Funcional | Adicionar edição |
| UI Admin - Comissões | ✅ Funcional | Adicionar upload |
| Email de notificação | ❌ Faltando | Criar |
| Dashboard afiliado | ⚠️ Parcial | Adicionar badge |

---

## 🎯 Próximos Passos Imediatos

1. **AGORA**: Implementar gestão de comissões
2. **DEPOIS**: Pagamentos manuais com comprovante
3. **FUTURO**: Migração para Stripe Connect

---

**Última atualização**: 30/01/2026  
**Responsável**: GitHub Copilot
