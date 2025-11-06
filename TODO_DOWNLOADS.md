# ✅ TODO - Ativar Sistema de Downloads

## 🎯 Objetivo

Fazer o **botão de download aparecer** nos pedidos e permitir que clientes baixem seus PDFs.

## 📋 Passos (Execute em Ordem)

### ✅ Já Feito

- [x] Produtos importados (837)
- [x] Pedidos importados (1,632)
- [x] Download permissions criadas (1,845)
- [x] Código do botão de download implementado
- [x] Scripts de importação criados
- [x] Biblioteca `phpunserialize` instalada

### ⏳ VOCÊ PRECISA FAZER AGORA

#### 1. Exportar arquivos do WordPress

**Tempo estimado:** 5-10 minutos

1. Acesse: `https://arafacriou.com.br/adminer.php` (ou phpMyAdmin)
2. Faça login no banco WordPress
3. Clique na aba **SQL**
4. Abra o arquivo: `scripts/migration/export-downloadable-files.sql`
5. Copie e cole a query no Adminer
6. Clique em **Execute**
7. Clique em **Export** → Formato **CSV**
8. Salve como: `downloadable-files.csv`
9. Mova para: `C:\Users\eddua\a-rafa-criou\data\test\downloadable-files.csv`

#### 2. Importar arquivos no novo sistema

**Tempo estimado:** 2-5 minutos

```powershell
npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv
```

**Resultado esperado:**

```
✅ Arquivos importados: ~837
⏭️  Registros ignorados: ~0
❌ Erros: ~0
```

#### 3. Verificar importação

**Tempo estimado:** 1 minuto

```powershell
npx tsx scripts/check-files-table.ts
```

**Resultado esperado:**

```
📊 Total de arquivos na tabela files: 837
📊 Produtos SEM arquivo: 0
```

#### 4. Testar no frontend

**Tempo estimado:** 3-5 minutos

1. Acesse: `http://localhost:3000/conta` (ou seu ambiente de dev/prod)
2. Faça login com um cliente que tem pedidos
3. Clique em "Meus Pedidos"
4. Escolha um pedido **completed**
5. **Verifique:** Botão "Fazer Download" deve aparecer! ✨
6. Clique no botão
7. **Pode dar erro se arquivos não estiverem no R2** (mas pelo menos o botão aparece!)

## ⚠️ Observações Importantes

### Sobre os arquivos físicos

Os metadados serão importados, mas os PDFs continuarão no servidor WordPress.

O campo `path` terá URLs tipo:

```
https://arafacriou.com.br/wp-content/uploads/2024/01/arquivo.pdf
```

**Isso funciona** enquanto o WordPress ficar online!

### Próximo passo (futuro)

Depois você precisará:

1. Baixar todos os PDFs do WordPress
2. Upload para Cloudflare R2
3. Atualizar paths no banco

Mas isso é **DEPOIS** - primeiro vamos fazer funcionar com URLs do WordPress!

## 🆘 Se Algo Der Errado

### ❌ "Produto WP #XXX não encontrado"

**Causa:** Produto não foi importado

**Solução:** Verifique se produto existe:

```sql
SELECT * FROM products WHERE wp_product_id = XXX;
```

### ❌ "Erro ao desserializar JSON"

**Causa:** Dado corrompido no WordPress

**Solução:** Pule esse produto, ele tem problema no WordPress mesmo

### ❌ "Cannot find module phpunserialize"

**Causa:** Biblioteca não instalada

**Solução:**

```powershell
npm install phpunserialize
```

### ❌ Botão não aparece mesmo com arquivos importados

**Possíveis causas:**

1. Usuário não está logado
2. Pedido não é "completed"
3. Cache do navegador (Ctrl+Shift+R para limpar)

## 📚 Documentação de Referência

- `QUICK_START_ARQUIVOS.md` - Guia rápido
- `docs/IMPORTAR_ARQUIVOS_WORDPRESS.md` - Guia completo
- `RESUMO_DOWNLOADS.md` - Resumo técnico
- `MIGRACAO_WORDPRESS_COMPLETA.md` - Migração completa (Fase 5)

## 🎉 Sucesso!

Quando terminar estes passos, você deve conseguir:

✅ Ver botão "Fazer Download" nos pedidos  
✅ Clicar e baixar PDFs (se ainda estiverem no WordPress)  
✅ Sistema de downloads 100% funcional

**Boa sorte!** 🚀

---

**Última atualização:** 05/11/2025  
**Criado por:** GitHub Copilot
