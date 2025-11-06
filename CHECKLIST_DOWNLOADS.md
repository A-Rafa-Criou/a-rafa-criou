# ✅ CHECKLIST - Ativar Downloads dos Pedidos

## Status Atual

- ✅ Produtos importados: 837
- ✅ Pedidos importados: 1,632 (1,469 completed)
- ✅ Download permissions criadas: 1,845
- ❌ **Arquivos (files): 0** ← PROBLEMA!

## Tarefas Pendentes

### 1. Exportar metadados de arquivos do WordPress

- [ ] Acessar Adminer/phpMyAdmin do WordPress
- [ ] Executar query de `scripts/migration/export-downloadable-files.sql`
- [ ] Exportar resultado como CSV
- [ ] Salvar em `data/test/downloadable-files.csv`

### 2. Importar metadados no novo sistema

- [ ] Executar: `npx tsx scripts/migration/import-downloadable-files.ts data/test/downloadable-files.csv`
- [ ] Verificar resultado (quantos arquivos importados)

### 3. Verificar importação

- [ ] Executar: `npx tsx scripts/check-files-table.ts`
- [ ] Confirmar que arquivos foram importados

### 4. Testar download no frontend

- [ ] Fazer login em `/conta`
- [ ] Acessar "Meus Pedidos"
- [ ] Clicar em um pedido completed
- [ ] **Verificar se botão "Fazer Download" aparece** ✨
- [ ] Clicar no botão
- [ ] Verificar se arquivo baixa (pode dar erro se ainda não migrou para R2)

### 5. (FUTURO) Migrar arquivos físicos para R2

⚠️ Por enquanto, os arquivos ainda estão no servidor WordPress.

- [ ] Baixar todos os PDFs do servidor WordPress
- [ ] Upload para Cloudflare R2
- [ ] Atualizar paths na tabela `files`

## 🎯 Objetivo Imediato

Completar passos 1-4 para que o **botão de download apareça** nos pedidos!

O download pode falhar se os arquivos não estiverem no R2, mas pelo menos você verá o botão.

---

**Ver guia completo**: `docs/IMPORTAR_ARQUIVOS_WORDPRESS.md`
