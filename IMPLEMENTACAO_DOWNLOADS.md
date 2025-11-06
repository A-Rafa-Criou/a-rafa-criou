# 📦 Sistema de Downloads - Implementação Completa

## 🔍 Diagnóstico do Problema

**Relato do usuário:** "não consigo baixar os pedidos, não vejo botão de download"

### Investigação Realizada

1. ✅ **Verificação do código:** Botão de download existe e está correto
2. ✅ **Verificação dos pedidos:** 1,469 pedidos com status "completed"
3. ✅ **Verificação de ownership:** Pedidos têm userId correto
4. ❌ **PROBLEMA ENCONTRADO:** Tabela `files` vazia (0 registros)

### Causa Raiz

O sistema de downloads possui 3 componentes:

- ✅ `download_permissions` → Criada (1,845 registros)
- ✅ Código do botão → Implementado corretamente
- ❌ **`files` → VAZIA (0 registros)** ← ESTE ERA O PROBLEMA

Sem arquivos cadastrados, a API de download não consegue gerar links, mesmo que o botão exista no código.

## 🛠️ Solução Implementada

### Arquivos Criados

| Arquivo                                           | Descrição                                      |
| ------------------------------------------------- | ---------------------------------------------- |
| `scripts/migration/export-downloadable-files.sql` | Query SQL para exportar metadados do WordPress |
| `scripts/migration/import-downloadable-files.ts`  | Script de importação de arquivos               |
| `scripts/check-files-table.ts`                    | Verificação da tabela files                    |
| `scripts/check-order-ownership.ts`                | Verificação de ownership (debug)               |
| `docs/IMPORTAR_ARQUIVOS_WORDPRESS.md`             | Documentação completa                          |
| `QUICK_START_ARQUIVOS.md`                         | Guia rápido de 3 passos                        |
| `CHECKLIST_DOWNLOADS.md`                          | Checklist de tarefas                           |
| `RESUMO_DOWNLOADS.md`                             | Resumo executivo                               |
| `TODO_DOWNLOADS.md`                               | Lista de tarefas para o usuário                |

### Dependências Instaladas

- ✅ `phpunserialize` - Para desserializar arrays PHP do WordPress

### Modificações na Documentação

- ✅ `MIGRACAO_WORDPRESS_COMPLETA.md` - Adicionada **Fase 5: Importação de Arquivos**

## 📋 Fluxo Completo de Importação

```
WordPress                        CSV                         Next.js
┌──────────────┐               ┌─────┐                    ┌──────────┐
│ wp_postmeta  │               │ CSV │                    │  files   │
│ _downloadable│  ──export──>  │     │  ──import──>       │  table   │
│   _files     │               │     │                    │          │
└──────────────┘               └─────┘                    └──────────┘
  PHP array                      Text                      PostgreSQL
```

### Dados Processados

**Entrada (WordPress):**

```php
a:1:{s:32:"abc123...";a:2:{
  s:4:"name";s:15:"Meu PDF.pdf";
  s:4:"file";s:50:"https://site.com/uploads/arquivo.pdf";
}}
```

**Saída (PostgreSQL):**

```sql
INSERT INTO files (product_id, name, path, mime_type)
VALUES (
  'uuid-do-produto',
  'Meu PDF.pdf',
  'https://site.com/uploads/arquivo.pdf',
  'application/pdf'
);
```

## 🎯 Resultado Esperado

Após executar a importação:

| Métrica                    | Antes | Depois |
| -------------------------- | ----- | ------ |
| Arquivos na tabela `files` | 0     | ~837   |
| Produtos sem arquivo       | 837   | 0      |
| Botão de download visível  | ❌    | ✅     |
| Downloads funcionando      | ❌    | ✅\*   |

\* _Funciona se arquivos ainda estiverem no servidor WordPress_

## ⚙️ Componentes do Sistema

### 1. Tabela `files`

```typescript
{
  id: uuid,
  productId: uuid,           // Link com produto
  variationId: uuid | null,  // Link com variação (opcional)
  name: string,              // "Meu PDF.pdf"
  originalName: string,      // Mesmo que name
  mimeType: string,          // "application/pdf"
  size: number,              // 0 (será atualizado depois)
  path: string,              // URL ou path do arquivo
  hash: string | null,       // SHA-256 (futuro)
  createdAt: timestamp
}
```

### 2. API de Download

**Endpoint:** `/api/orders/download`

**Fluxo:**

1. Recebe `orderId` e `itemId`
2. Verifica se pedido está pago/completed
3. Busca arquivo em `files` por `productId` ou `variationId`
4. Gera URL assinada do R2 (ou redireciona para URL do WordPress)
5. Retorna link para download

### 3. Frontend (Botão)

**Localização:** `/conta/pedidos/[id]/page.tsx` (linhas 707-750)

**Condição para aparecer:**

```tsx
{
  order.status === 'completed' && (
    <Button onClick={() => handleDownload(item.id)}>Fazer Download</Button>
  );
}
```

## 🔄 Próximos Passos (Futuro)

### Migração Física para R2

**Atualmente:** Arquivos no servidor WordPress (URLs antigas)  
**Futuro:** Arquivos no Cloudflare R2 (mais rápido, mais barato, mais confiável)

**Processo:**

1. Download em massa dos PDFs do WordPress
2. Upload para R2 via Wrangler CLI
3. Atualizar campo `path` na tabela `files`
4. Atualizar campo `size` com tamanho real
5. Gerar `hash` SHA-256 para cada arquivo
6. Testar downloads com novas URLs

## 📊 Estatísticas da Migração

| Item                 | Quantidade   | Status                       |
| -------------------- | ------------ | ---------------------------- |
| Usuários             | 1,376        | ✅ Importados                |
| Pedidos              | 1,632        | ✅ Importados                |
| Pedidos Completed    | 1,469        | ✅                           |
| Produtos             | 837          | ✅ Importados                |
| Categorias           | 5            | ✅ Criadas                   |
| Download Permissions | 1,845        | ✅ Criadas                   |
| **Arquivos**         | **0 → ~837** | **⏳ Aguardando importação** |

## 🧪 Testes Realizados

### ✅ Testes de Diagnóstico

- [x] Verificação do código do botão
- [x] Verificação de status dos pedidos
- [x] Verificação de ownership (userId match)
- [x] Verificação da tabela files (encontrou problema!)
- [x] Verificação de download permissions

### ⏳ Testes Pendentes (Usuário Deve Fazer)

- [ ] Importação dos metadados de arquivos
- [ ] Verificação pós-importação
- [ ] Teste de visibilidade do botão
- [ ] Teste de download funcional
- [ ] Teste com múltiplos usuários

## 💡 Lições Aprendidas

1. **Verificar toda a cadeia**: Mesmo com código correto, dados podem estar faltando
2. **Tabelas relacionadas são críticas**: `download_permissions` sem `files` não funciona
3. **Migração em camadas**: Produtos → Pedidos → Permissions → **Arquivos** (ordem importa!)
4. **WordPress usa PHP serialization**: Precisa desserializar para usar no Node.js

## 📞 Suporte

Se encontrar problemas, verifique:

1. `TODO_DOWNLOADS.md` - Lista de tarefas passo a passo
2. `docs/IMPORTAR_ARQUIVOS_WORDPRESS.md` - Documentação completa
3. Console do navegador (F12) - Erros de JavaScript
4. Logs do servidor - Erros da API

---

**Implementado em:** 05/11/2025  
**Status:** ✅ Scripts prontos, aguardando execução pelo usuário  
**Próxima ação:** Executar passos 1-4 de `TODO_DOWNLOADS.md`
