# Scripts Utilitários

Documentação de todos os scripts disponíveis no projeto.

## 🔐 Autenticação e Usuários

### `check-user-hash.ts`
**Propósito**: Verificar hash de senha de um usuário específico  
**Uso**: `npx tsx scripts/check-user-hash.ts`  
**Descrição**: Mostra informações detalhadas sobre o hash de senha de um usuário (formato, se foi migrado do WordPress, etc.)

### `generate-reset-link.ts`
**Propósito**: Gerar link de recuperação de senha válido  
**Uso**: `npx tsx scripts/generate-reset-link.ts [email]`  
**Descrição**: Cria um token de reset de senha no banco e retorna um link válido por 1 hora. Útil para testes ou quando um usuário precisa recuperar acesso.

### `test-forgot-password.ts`
**Propósito**: Testar API de "Esqueci minha senha"  
**Uso**: `npx tsx scripts/test-forgot-password.ts [email]`  
**Descrição**: Envia uma requisição para a API de recuperação de senha e mostra o resultado. Em modo desenvolvimento, o link aparece no console do servidor.

## 🌍 Internacionalização (i18n)

### `auto-translate.ts`
**Propósito**: Traduzir automaticamente chaves faltantes  
**Uso**: `npx tsx scripts/auto-translate.ts`  
**Descrição**: Traduz automaticamente chaves de i18n que estão em PT mas faltam em EN/ES usando a API do Google Translate.

### `check-translations.ts`
**Propósito**: Verificar completude das traduções  
**Uso**: `npx tsx scripts/check-translations.ts`  
**Descrição**: Lista todas as chaves faltantes em cada idioma.

### `retranslate-with-html.ts`
**Propósito**: Re-traduzir preservando HTML  
**Uso**: `npx tsx scripts/retranslate-with-html.ts`  
**Descrição**: Traduz textos que contém HTML sem quebrar as tags.

### `seed-i18n.ts`
**Propósito**: Criar traduções iniciais  
**Uso**: `npx tsx scripts/seed-i18n.ts`  
**Descrição**: Popula os arquivos de tradução com as chaves básicas do sistema.

### `seed-attribute-translations.ts`
**Propósito**: Traduzir atributos de produtos  
**Uso**: `npx tsx scripts/seed-attribute-translations.ts`  
**Descrição**: Cria traduções para atributos de produtos (cores, tamanhos, etc.).

### `translate-new-keys.ts`
**Propósito**: Traduzir apenas chaves novas  
**Uso**: `npx tsx scripts/translate-new-keys.ts`  
**Descrição**: Encontra e traduz apenas as chaves que foram adicionadas recentemente.

### `translate-orders-footer.ts`
**Propósito**: Traduzir rodapé de e-mails de pedidos  
**Uso**: `npx tsx scripts/translate-orders-footer.ts`  
**Descrição**: Traduz especificamente os textos do rodapé dos e-mails de confirmação de pedido.

## 🗄️ Banco de Dados

### `test-db-connection.ts`
**Propósito**: Testar conexão com o banco  
**Uso**: `npx tsx scripts/test-db-connection.ts`  
**Descrição**: Verifica se a conexão com o PostgreSQL está funcionando corretamente.

---

## 📦 Scripts de Migração (WordPress → Next.js)

Localizados em `scripts/migration/`

### Importação de Dados

#### `import-customers.ts`
**Propósito**: Importar clientes do WordPress  
**Uso**: `npx tsx scripts/migration/import-customers.ts data/test/customers.csv`  
**Descrição**: Importa clientes do CSV exportado do WordPress. Lida com senhas legadas e migração automática.

#### `import-products-completo.ts`
**Propósito**: Importar produtos completos  
**Uso**: `npx tsx scripts/migration/import-products-completo.ts data/test/produtos-completo.csv`  
**Descrição**: Importa produtos, variações, atributos e relacionamentos do WordPress.

#### `import-orders.ts`
**Propósito**: Importar pedidos  
**Uso**: `npx tsx scripts/migration/import-orders.ts data/test/pedidos-completo.csv data/test/order-items-completo.csv`  
**Descrição**: Importa pedidos e itens de pedidos do WordPress.

#### `import-downloads.ts`
**Propósito**: Importar arquivos de download  
**Uso**: `npx tsx scripts/migration/import-downloads.ts data/test/downloads.csv`  
**Descrição**: Importa PDFs e associa aos produtos corretos.

### Exportação de Dados (SQL)

#### `export-wordpress.sql`
Exporta todos os dados principais do WordPress (clientes, produtos, pedidos).

#### `export-all-customers.sql`
Exporta apenas clientes com todas as informações.

#### `export-produtos-completo.sql`
Exporta produtos com variações, atributos e meta dados.

#### `export-pedidos-completo.sql`
Exporta pedidos completos com status e dados de pagamento.

#### `export-order-items-completo.sql`
Exporta itens de pedidos com variações e quantidades.

### Utilitários de Migração

#### `check-products.ts`
**Propósito**: Verificar produtos importados  
**Uso**: `npx tsx scripts/migration/check-products.ts`  
**Descrição**: Lista produtos importados e verifica integridade dos dados.

#### `analyze-download-needs.ts`
**Propósito**: Analisar necessidades de download  
**Uso**: `npx tsx scripts/migration/analyze-download-needs.ts`  
**Descrição**: Verifica quais produtos precisam de arquivos PDF associados.

#### `create-download-permissions.ts`
**Propósito**: Criar permissões de download  
**Uso**: `npx tsx scripts/migration/create-download-permissions.ts`  
**Descrição**: Associa permissões de download aos pedidos pagos.

#### `delete-all-users.ts`
**Propósito**: Limpar todos os usuários (CUIDADO!)  
**Uso**: `npx tsx scripts/migration/delete-all-users.ts`  
**Descrição**: Remove todos os usuários e dados relacionados. Respeita foreign keys. **Use apenas em desenvolvimento!**

### WordPress Integration

#### `code-snippets-wordpress-sync.php`
**Propósito**: Código para Code Snippets do WordPress  
**Descrição**: REST API endpoint para validação de senha WordPress. Cole no plugin Code Snippets do WordPress.

---

## 📝 Ordem Recomendada de Migração

1. **Banco de Dados**
   ```bash
   npx tsx scripts/test-db-connection.ts
   ```

2. **Exportar do WordPress** (via Adminer)
   - Execute os arquivos `.sql` em `scripts/migration/`
   - Salve CSVs em `data/test/`

3. **Importar Clientes**
   ```bash
   npx tsx scripts/migration/import-customers.ts data/test/customers.csv
   ```

4. **Importar Produtos**
   ```bash
   npx tsx scripts/migration/import-products-completo.ts data/test/produtos-completo.csv
   ```

5. **Importar Downloads**
   ```bash
   npx tsx scripts/migration/import-downloads.ts data/test/downloads.csv
   ```

6. **Importar Pedidos**
   ```bash
   npx tsx scripts/migration/import-orders.ts data/test/pedidos-completo.csv data/test/order-items-completo.csv
   ```

7. **Criar Permissões de Download**
   ```bash
   npx tsx scripts/migration/create-download-permissions.ts
   ```

---

## 🚀 Scripts Mais Usados

### Desenvolvimento
- `test-db-connection.ts` - Verificar se DB está OK
- `check-user-hash.ts` - Debug de autenticação
- `generate-reset-link.ts` - Criar link de reset para testes

### Produção
- `test-forgot-password.ts` - Testar recuperação de senha
- `auto-translate.ts` - Manter traduções atualizadas

### Migração (Uma vez)
- `import-customers.ts` - Migrar usuários do WordPress
- `import-products-completo.ts` - Migrar produtos
- `import-orders.ts` - Migrar histórico de pedidos

---

## 🗑️ Scripts Removidos (Obsoletos)

Foram removidos scripts que não são mais necessários:

- ❌ `check-all-users.ts` - Substituído por `check-user-hash.ts`
- ❌ `check-single-user.ts` - Substituído por `check-user-hash.ts`
- ❌ `create-my-password.ts` - Use `generate-reset-link.ts`
- ❌ `fix-all-password-hashes.ts` - Migração automática no login
- ❌ `test-login-direct.ts` - Use página de login normal
- ❌ `test-nextjs-login.ts` - Use página de login normal
- ❌ `test-password-reset.ts` - Use `generate-reset-link.ts`
- ❌ `validate-wordpress-password.ts` - Integrado no NextAuth
- ❌ `test-wordpress-api.ts` - API WordPress já testada
- ❌ `update-password-hashes.ts` - Migração automática
- ❌ `migrate-all-passwords.ts` - Migração on-demand no login
- ❌ Arquivos SQL de debug (check-*.sql)
- ❌ Arquivos PHP de debug (debug-*.php, wordpress-*.php)

---

## 💡 Dicas

1. **Sempre teste em desenvolvimento primeiro!**
2. **Faça backup antes de rodar scripts de migração**
3. **Use `npx tsx` ao invés de `ts-node` (mais rápido)**
4. **Verifique os logs antes de prosseguir**
5. **Scripts de migração são idempotentes (pode rodar várias vezes)**

---

## 🔗 Links Úteis

- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Google Translate API](https://cloud.google.com/translate/docs)
