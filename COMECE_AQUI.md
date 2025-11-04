# 🚀 GUIA RÁPIDO DE MIGRAÇÃO

## 📋 RESUMO: O QUE FOI PREPARADO

Tudo está pronto para você começar a migração! Aqui está o que já foi feito:

✅ Estrutura de pastas criada
✅ Scripts de importação prontos
✅ Validação de CSVs implementada
✅ Suporte a senhas WordPress (phpass)
✅ Conversão automática para bcrypt
✅ Banco de dados atualizado com campos de migração

---

## 🎯 PRÓXIMOS PASSOS (VOCÊ)

### PASSO 1: Exportar Dados do WordPress

**Arquivo guia:** `EXPORTAR_WORDPRESS.md`

1. Acesse o phpMyAdmin do seu WordPress
2. Execute as queries SQL fornecidas
3. Exporte os CSVs para `data/test/`

**Arquivos necessários:**
- `data/test/test-clientes.csv` (20 clientes)
- `data/test/test-produtos.csv` (10 produtos)
- `data/test/test-pedidos.csv` (20 pedidos)
- `data/test/test-order-items.csv` (items dos pedidos)
- `data/test/test-downloads.csv` (permissões)

---

### PASSO 2: Validar CSVs Exportados

```bash
npx tsx scripts/migration/validate-csvs.ts
```

**O que faz:**
- Verifica se todos os arquivos existem
- Valida colunas obrigatórias
- Detecta dados inválidos
- Gera relatório completo

---

### PASSO 3: Importar Dados de Teste

```bash
# 1. Importar clientes
npx tsx scripts/migration/import-customers.ts

# 2. Importar produtos
npx tsx scripts/migration/import-products.ts

# 3. Importar pedidos
npx tsx scripts/migration/import-orders.ts
```

---

### PASSO 4: Validar Importação

```bash
npm run db:studio
```

**Verificar:**
- ✅ Tabela `users` tem clientes
- ✅ Tabela `products` tem produtos
- ✅ Tabela `orders` tem pedidos
- ✅ Tabela `order_items` tem items

---

### PASSO 5: Testar Login com Senha WordPress

1. Escolha um cliente de teste (que você saiba a senha)
2. Acesse: `http://localhost:3000/auth/login`
3. Faça login com email e senha
4. Veja no console: "✅ Senha convertida para bcrypt"
5. Verifique no Drizzle Studio que `legacyPasswordType` virou `null`

---

## 📁 ESTRUTURA DE ARQUIVOS

```
a-rafa-criou/
├── data/
│   ├── README.md                    ← Documentação da estrutura
│   ├── test/                        ← CSVs de teste (você vai criar)
│   │   ├── test-clientes.csv
│   │   ├── test-produtos.csv
│   │   ├── test-pedidos.csv
│   │   ├── test-order-items.csv
│   │   └── test-downloads.csv
│   └── production/                  ← CSVs finais (depois)
│
├── scripts/
│   └── migration/
│       ├── import-customers.ts      ← Importa clientes
│       ├── import-products.ts       ← Importa produtos
│       ├── import-orders.ts         ← Importa pedidos
│       └── validate-csvs.ts         ← Valida CSVs
│
├── src/
│   └── lib/
│       └── auth/
│           ├── config.ts            ← Auth.js (ATUALIZADO ✅)
│           └── wordpress-password.ts ← Validação phpass
│
├── EXPORTAR_WORDPRESS.md            ← Guia de exportação
├── MIGRACAO_CHECKLIST.md            ← Checklist completo
├── PROGRESSO_MIGRACAO.md            ← Status da migração
└── TESTE_MIGRACAO_LOCAL.md          ← Guia de testes
```

---

## 🔧 COMANDOS ÚTEIS

### Desenvolvimento
```bash
# Iniciar servidor de desenvolvimento
npm run dev

# Abrir Drizzle Studio (visualizar banco)
npm run db:studio

# Gerar migration (após alterar schema)
npm run db:generate

# Aplicar migration
npm run db:push
```

### Migração
```bash
# Validar CSVs
npx tsx scripts/migration/validate-csvs.ts

# Importar clientes
npx tsx scripts/migration/import-customers.ts

# Importar produtos
npx tsx scripts/migration/import-products.ts

# Importar pedidos (requer 2 CSVs)
npx tsx scripts/migration/import-orders.ts
```

### Limpeza (CUIDADO!)
```sql
-- No Drizzle Studio ou via SQL
-- Limpar apenas dados de teste
DELETE FROM users WHERE email LIKE 'teste%@example.com';
DELETE FROM orders WHERE id IN (
  SELECT id FROM orders WHERE email LIKE 'teste%@example.com'
);
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Prefixo das Tabelas WordPress
As queries SQL usam `wp_` como prefixo. Se seu WordPress usa outro prefixo:

```sql
-- Descubra o prefixo vendo o nome das tabelas no phpMyAdmin
-- Depois substitua wp_ pelo prefixo correto em todas as queries
```

### 2. Encoding UTF-8
Ao exportar os CSVs, certifique-se de usar **UTF-8**:
- No phpMyAdmin: escolha "UTF-8" ao exportar
- Abra o CSV no VSCode para confirmar caracteres especiais

### 3. Senhas WordPress
- Senhas do WordPress ficam em `legacyPasswordHash`
- No primeiro login, são convertidas automaticamente para bcrypt
- Após conversão, `legacyPasswordType` e `legacyPasswordHash` ficam `null`

### 4. Produtos sem Categoria
Produtos importados vão para a categoria padrão "Geral".
Você pode alterar depois no admin.

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### "Cannot find module csv-parse"
```bash
npm install csv-parse
```

### "Table users doesn't exist"
```bash
npm run db:push
```

### "Arquivo não encontrado"
Verifique se o CSV está em `data/test/` e o caminho está correto.

### "Email inválido" no CSV
Abra o CSV e corrija emails malformados.

### Login não funciona com senha WordPress
1. Verifique se `legacyPasswordHash` tem valor
2. Verifique se `legacyPasswordType` = 'wordpress_phpass'
3. Veja os logs no console do servidor

---

## 📊 ORDEM DE IMPORTAÇÃO (IMPORTANTE!)

**SEMPRE nesta ordem:**

1. ✅ Clientes (users) - **PRIMEIRO**
2. ✅ Produtos (products) - depois dos clientes
3. ✅ Variações (product_variations) - depois dos produtos
4. ✅ Pedidos (orders) - depois de clientes e produtos
5. ✅ Permissões (downloads) - **POR ÚLTIMO**

**Por quê?**
- Pedidos precisam de clientes (foreign key)
- Pedidos precisam de produtos (foreign key)
- Permissões precisam de tudo acima

---

## 📞 AJUDA E DOCUMENTAÇÃO

- **Exportar dados:** `EXPORTAR_WORDPRESS.md`
- **Checklist completo:** `MIGRACAO_CHECKLIST.md`
- **Testes locais:** `TESTE_MIGRACAO_LOCAL.md`
- **Migração completa:** `MIGRACAO_WORDPRESS_COMPLETA.md`

---

## ✅ CHECKLIST RÁPIDO

Antes de começar a exportação:

- [ ] Acesso ao phpMyAdmin do WordPress
- [ ] Descobriu o prefixo das tabelas (wp_ ou outro)
- [ ] Tem permissão de leitura no banco
- [ ] Sabe a senha de pelo menos 1 cliente (para testar)

Antes de importar:

- [ ] CSVs estão em `data/test/`
- [ ] Rodou `npx tsx scripts/migration/validate-csvs.ts`
- [ ] Todos os CSVs estão válidos
- [ ] Banco local está rodando

Após importar:

- [ ] Verificou dados no Drizzle Studio
- [ ] Testou login com senha WordPress
- [ ] Senha foi convertida para bcrypt
- [ ] Próximos passos claros

---

## 🎉 SUCESSO!

Se tudo funcionar:
1. ✅ Clientes importados
2. ✅ Login funciona
3. ✅ Senhas convertidas automaticamente

**Próximo passo:** Exportar dados REAIS do WordPress!

---

**Dúvidas?** Releia os guias ou peça ajuda! 🚀
