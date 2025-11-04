# ✅ Checklist de Migração WordPress → Next.js

**Projeto:** A Rafa Criou  
**Data de início:** 03/11/2025  
**Status:** 🚧 Em preparação

---

## 📋 FASE 1: PREPARAÇÃO DO AMBIENTE DE TESTE

### 1.1 Infraestrutura Local

- [ ] Criar pasta `data/` para CSVs de teste
- [ ] Instalar dependência `csv-parse` para leitura de CSV
- [ ] Criar arquivo `.env.local.test` com variáveis de ambiente de teste
- [ ] Documentar qual banco usar (local Docker ou Neon test)

### 1.2 Schema do Banco - Campos para Migração

- [ ] Adicionar campo `legacyPasswordType` na tabela `users`
- [ ] Adicionar campo `legacyPasswordHash` na tabela `users`
- [ ] Adicionar campo `wpOrderId` na tabela `orders` (referência WordPress)
- [ ] Adicionar campo `phone` na tabela `users` (billing_phone do WP)
- [ ] Criar migration para novos campos
- [ ] Rodar migration no banco de desenvolvimento

### 1.3 Estrutura de Pastas

- [ ] Criar pasta `scripts/migration/` para scripts de importação
- [ ] Criar pasta `data/` para CSVs exportados
- [ ] Criar pasta `data/test/` para CSVs de teste (sample)
- [ ] Criar pasta `data/production/` para CSVs finais

---

## 📊 FASE 2: EXPORTAÇÃO DE DADOS DO WORDPRESS (SAMPLE)

### 2.1 Exportar Clientes de Teste (10-20 registros)

- [ ] Acessar phpMyAdmin do WordPress
- [ ] Executar query SQL para exportar 20 clientes
- [ ] Salvar como `data/test/test-clientes.csv`
- [ ] Validar CSV (verificar colunas e encoding)

### 2.2 Exportar Pedidos de Teste (5-10 registros)

- [ ] Executar query SQL para exportar pedidos completed
- [ ] Salvar como `data/test/test-pedidos.csv`
- [ ] Validar estrutura do CSV

### 2.3 Exportar Produtos de Teste (3-5 registros)

- [ ] Executar query SQL para exportar produtos
- [ ] Salvar como `data/test/test-produtos.csv`
- [ ] Validar estrutura do CSV

### 2.4 Exportar Variações de Teste

- [ ] Executar query SQL para exportar variações
- [ ] Salvar como `data/test/test-variacoes.csv`
- [ ] Validar estrutura do CSV

### 2.5 Exportar Permissões de Download

- [ ] Executar query SQL para exportar permissões
- [ ] Salvar como `data/test/test-downloads.csv`
- [ ] Validar estrutura do CSV

---

## 🔧 FASE 3: SCRIPTS DE IMPORTAÇÃO (DESENVOLVIMENTO)

### 3.1 Script de Importação de Clientes

- [ ] Criar `scripts/migration/import-customers.ts`
- [ ] Implementar leitura de CSV
- [ ] Implementar validação de dados
- [ ] Implementar verificação de duplicatas (por email)
- [ ] Implementar inserção no banco
- [ ] Implementar log de erros e sucessos
- [ ] Testar com `data/test/test-clientes.csv`
- [ ] Validar no Drizzle Studio

### 3.2 Script de Importação de Produtos

- [ ] Criar `scripts/migration/import-products.ts`
- [ ] Implementar leitura de CSV
- [ ] Implementar criação de slug único
- [ ] Implementar verificação de categoria
- [ ] Implementar inserção no banco
- [ ] Testar com `data/test/test-produtos.csv`
- [ ] Validar no Drizzle Studio

### 3.3 Script de Importação de Variações

- [ ] Criar `scripts/migration/import-variations.ts`
- [ ] Implementar leitura de CSV
- [ ] Implementar vínculo com produto
- [ ] Implementar inserção no banco
- [ ] Testar com `data/test/test-variacoes.csv`
- [ ] Validar no Drizzle Studio

### 3.4 Script de Importação de Pedidos

- [ ] Criar `scripts/migration/import-orders.ts`
- [ ] Implementar leitura de CSV
- [ ] Implementar busca de usuário por email
- [ ] Implementar criação de pedido
- [ ] Implementar criação de order_items
- [ ] Implementar parse de items (formato: name|productId|variationId|qty|total)
- [ ] Testar com `data/test/test-pedidos.csv`
- [ ] Validar no Drizzle Studio

### 3.5 Script de Importação de Permissões

- [ ] Criar `scripts/migration/import-download-permissions.ts`
- [ ] Implementar leitura de CSV
- [ ] Implementar criação de permissões de download
- [ ] Vincular com orders/users/products
- [ ] Testar com `data/test/test-downloads.csv`
- [ ] Validar no Drizzle Studio

### 3.6 Script de Validação de Migração

- [ ] Criar `scripts/migration/verify-migration.ts`
- [ ] Implementar contagem de registros importados
- [ ] Implementar verificação de integridade (pedidos sem user, etc)
- [ ] Implementar verificação de permissões de download
- [ ] Implementar log de inconsistências
- [ ] Executar e validar resultados

---

## 🔐 FASE 4: MIGRAÇÃO DE SENHAS

### 4.1 Implementar Verificação de Senha WordPress (phpass)

- [ ] Criar função `verifyWordPressPassword()` em `src/lib/auth/wordpress-password.ts`
- [ ] Implementar algoritmo phpass compatível
- [ ] Testar com hash de exemplo do WordPress
- [ ] Documentar funcionamento

### 4.2 Atualizar Auth.js para Suportar Senhas Legadas

- [ ] Modificar `src/lib/auth/config.ts`
- [ ] Adicionar verificação de `legacyPasswordType`
- [ ] Implementar conversão automática para bcrypt no primeiro login
- [ ] Implementar limpeza de campos legacy após conversão
- [ ] Testar login com senha WordPress
- [ ] Testar conversão automática

### 4.3 Alternativa: Script de Reset de Senhas

- [ ] Criar `scripts/migration/send-password-reset-to-all.ts`
- [ ] Implementar geração de token de reset
- [ ] Implementar envio de email em lote (com rate limiting)
- [ ] Implementar template de email
- [ ] Testar envio para 1 email
- [ ] Preparar para envio em massa

---

## 📦 FASE 5: MIGRAÇÃO DE PDFS PARA R2

### 5.1 Preparar Cloudflare R2

- [ ] Verificar credenciais R2 em `.env.local`
- [ ] Criar bucket de teste no R2: `arafacriou-test`
- [ ] Testar upload de arquivo de teste
- [ ] Testar geração de URL assinada
- [ ] Testar download via URL assinada

### 5.2 Script de Migração de PDFs

- [ ] Criar `scripts/migration/migrate-pdfs-to-r2.ts`
- [ ] Implementar leitura de lista de PDFs do WordPress
- [ ] Implementar download de PDF do WordPress
- [ ] Implementar upload para R2
- [ ] Implementar atualização de `files` table
- [ ] Implementar log de progresso
- [ ] Implementar tratamento de erros
- [ ] Testar com 1 PDF
- [ ] Testar com 3-5 PDFs

### 5.3 Atualizar API de Download

- [ ] Verificar `src/app/api/download/[fileId]/route.ts` existe
- [ ] Implementar verificação de permissão de download
- [ ] Implementar geração de URL assinada do R2
- [ ] Implementar rate limiting
- [ ] Implementar log de downloads
- [ ] Testar download completo E2E

---

## ✅ FASE 6: TESTES LOCAIS (LOCALHOST:3000)

### 6.1 Teste de Importação de Dados

- [ ] Limpar banco de teste
- [ ] Rodar script de importação de clientes
- [ ] Rodar script de importação de produtos
- [ ] Rodar script de importação de variações
- [ ] Rodar script de importação de pedidos
- [ ] Rodar script de importação de permissões
- [ ] Executar script de validação
- [ ] Verificar no Drizzle Studio

### 6.2 Teste de Login com Senha WordPress

- [ ] Escolher 1 cliente de teste (saber senha)
- [ ] Tentar fazer login no localhost:3000
- [ ] Validar que login funciona
- [ ] Validar que senha foi convertida para bcrypt
- [ ] Tentar fazer login novamente (deve usar bcrypt)
- [ ] Verificar campos legacy foram limpos

### 6.3 Teste de Download de PDF

- [ ] Fazer login como cliente de teste
- [ ] Acessar "Meus Pedidos"
- [ ] Validar que pedidos aparecem
- [ ] Clicar em "Baixar PDF"
- [ ] Validar que URL assinada é gerada
- [ ] Validar que download funciona
- [ ] Validar que log de download foi criado

### 6.4 Teste de Pedido Completo (E2E)

- [ ] Criar novo usuário
- [ ] Adicionar produto ao carrinho
- [ ] Ir para checkout
- [ ] Preencher dados
- [ ] Usar Stripe test mode
- [ ] Finalizar pedido
- [ ] Validar criação de order
- [ ] Validar criação de order_items
- [ ] Validar criação de download_permissions
- [ ] Validar recebimento de email
- [ ] Validar que download funciona

---

## 🎯 FASE 7: EXPORTAÇÃO COMPLETA (PRODUÇÃO)

### 7.1 Exportar Todos os Clientes

- [ ] Executar query SQL para todos os clientes
- [ ] Salvar como `data/production/clientes.csv`
- [ ] Validar total de registros
- [ ] Fazer backup do CSV

### 7.2 Exportar Todos os Pedidos

- [ ] Executar query SQL para todos os pedidos
- [ ] Salvar como `data/production/pedidos.csv`
- [ ] Validar total de registros
- [ ] Fazer backup do CSV

### 7.3 Exportar Todos os Produtos

- [ ] Executar query SQL para todos os produtos
- [ ] Salvar como `data/production/produtos.csv`
- [ ] Validar total de registros
- [ ] Fazer backup do CSV

### 7.4 Exportar Todas as Variações

- [ ] Executar query SQL para todas as variações
- [ ] Salvar como `data/production/variacoes.csv`
- [ ] Validar total de registros
- [ ] Fazer backup do CSV

### 7.5 Exportar Todas as Permissões

- [ ] Executar query SQL para todas as permissões
- [ ] Salvar como `data/production/downloads.csv`
- [ ] Validar total de registros
- [ ] Fazer backup do CSV

---

## 🚀 FASE 8: MIGRAÇÃO EM STAGING

### 8.1 Preparar Ambiente de Staging

- [ ] Criar banco separado no Neon: `arafacriou-staging`
- [ ] Criar branch `migracao-staging` no Git
- [ ] Fazer push para GitHub
- [ ] Configurar variáveis de ambiente no Vercel (staging)
- [ ] Fazer deploy de staging
- [ ] Validar que site está acessível

### 8.2 Executar Migração em Staging

- [ ] Rodar scripts de importação com CSVs de produção
- [ ] Executar script de validação
- [ ] Verificar logs de erro
- [ ] Corrigir problemas encontrados
- [ ] Re-executar se necessário

### 8.3 Testar em Staging

- [ ] Testar login de 5-10 clientes
- [ ] Testar download de PDFs
- [ ] Testar checkout completo
- [ ] Testar todos os métodos de pagamento
- [ ] Validar emails sendo enviados
- [ ] Validar performance

### 8.4 Convidar Beta Testers

- [ ] Selecionar 5-10 clientes beta
- [ ] Enviar email com acesso ao staging
- [ ] Coletar feedback
- [ ] Ajustar problemas reportados
- [ ] Re-testar

---

## 🌐 FASE 9: GO-LIVE (PRODUÇÃO)

### 9.1 Preparação Final

- [ ] Fazer backup completo do WordPress
- [ ] Fazer backup completo do banco Next.js
- [ ] Preparar plano de rollback
- [ ] Preparar email de comunicação aos clientes
- [ ] Preparar equipe de suporte
- [ ] Definir data/hora do go-live

### 9.2 Migração de Produção

- [ ] Executar scripts de importação final
- [ ] Executar script de validação
- [ ] Migrar todos os PDFs para R2
- [ ] Validar que tudo está ok

### 9.3 Configuração DNS (Gradual)

- [ ] Configurar subdomínio de teste: novo.arafacriou.com.br
- [ ] Testar subdomínio
- [ ] Configurar Cloudflare Load Balancer
- [ ] Redirecionar 10% do tráfego para Next.js
- [ ] Monitorar por 24h
- [ ] Aumentar para 25%
- [ ] Monitorar por 24h
- [ ] Aumentar para 50%
- [ ] Monitorar por 24h
- [ ] Redirecionar 100% para Next.js

### 9.4 Redirecionamentos 301

- [ ] Configurar redirecionamentos no WordPress
- [ ] Testar redirecionamento de produtos
- [ ] Testar redirecionamento de minha-conta
- [ ] Testar redirecionamento de carrinho
- [ ] Testar redirecionamento de checkout

### 9.5 Comunicação com Clientes

- [ ] Enviar email 1 semana antes
- [ ] Enviar email no dia do go-live
- [ ] Enviar email 1 dia depois (follow-up)
- [ ] Responder dúvidas e problemas

---

## 📈 FASE 10: PÓS-MIGRAÇÃO (30 DIAS)

### 10.1 Monitoramento (Primeiros 7 dias)

- [ ] Monitorar logs de erro diariamente
- [ ] Monitorar taxa de conversão
- [ ] Monitorar reclamações de clientes
- [ ] Monitorar performance do site
- [ ] Verificar downloads funcionando
- [ ] Verificar pagamentos funcionando

### 10.2 Ajustes e Melhorias

- [ ] Corrigir bugs críticos imediatamente
- [ ] Implementar melhorias de UX
- [ ] Otimizar performance
- [ ] Ajustar SEO
- [ ] Melhorar emails

### 10.3 Análise Após 30 dias

- [ ] Analisar métricas de conversão
- [ ] Analisar abandono de carrinho
- [ ] Analisar reclamações
- [ ] Analisar feedback positivo
- [ ] Documentar lições aprendidas

### 10.4 Desativação do WordPress

- [ ] Confirmar que tudo está estável
- [ ] Mover WordPress para subdomínio backup
- [ ] Desativar WordPress antigo
- [ ] Cancelar hospedagem antiga (se aplicável)
- [ ] Comemorar o sucesso! 🎉

---

## 📊 PROGRESSO GERAL

### Estatísticas

- **Total de tarefas:** 155
- **Concluídas:** 0
- **Em progresso:** 0
- **Pendentes:** 155
- **% Completo:** 0%

### Próximos Passos Imediatos

1. ⏭️ Criar pasta `data/` e subpastas
2. ⏭️ Instalar `csv-parse`
3. ⏭️ Adicionar campos ao schema
4. ⏭️ Criar migration para novos campos

---

## 🚨 NOTAS IMPORTANTES

- ⚠️ **SEMPRE fazer backup antes de qualquer operação**
- ⚠️ **Testar em local antes de staging**
- ⚠️ **Testar em staging antes de produção**
- ⚠️ **Ter plano de rollback pronto**
- ⚠️ **Monitorar TUDO nos primeiros dias**

---

**Última atualização:** 03/11/2025
