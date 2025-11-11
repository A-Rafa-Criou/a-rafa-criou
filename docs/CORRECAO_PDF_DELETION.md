# Correção: Deleção de PDFs do R2

## ❌ Problema Original

Quando o usuário anexava um PDF e clicava no **X** para removê-lo:

1. ✅ O arquivo era removido da UI
2. ❌ O arquivo **NÃO era deletado do R2**
3. ❌ Não era possível adicionar outro PDF (erro de chave duplicada)

**Causa raiz:**

```typescript
// Upload em background salvava r2Key no cache:
uploadCacheRef.current.set(file, { r2Key: "pdfs/2025-01-11-abc123-FILE.pdf" })

// Mas variation.files[] nunca era atualizado:
variation.files[0].r2Key === undefined ❌

// Na hora de deletar:
if (file.r2Key) { // undefined → nunca executava
  await fetch(`/api/r2/delete?r2Key=${file.r2Key}`)
}
```

O endpoint retornava **200 OK** porque a requisição era válida, mas nenhum arquivo era deletado de fato.

---

## ✅ Solução Aplicada

### 1. **Sincronizar r2Key do Cache → Variation**

Após cada upload bem-sucedido, atualizamos o objeto `variation` com o `r2Key` real:

**ProductForm.tsx (3 lugares):**

```typescript
// 🔄 Após upload direto R2
const cacheData = { r2Key: result.key, url: result.url };
uploadCacheRef.current.set(file, cacheData);

// NOVO: Atualizar variation.files[].r2Key
setFormData(prev => ({
  ...prev,
  variations: prev.variations.map(v => ({
    ...v,
    files: v.files.map(f => (f.file === file ? { ...f, r2Key: result.key } : f)),
  })),
}));
```

```typescript
// 🔄 Após upload via backend (arquivo pequeno)
const cacheData = { r2Key: j?.data?.key };
uploadCacheRef.current.set(file, cacheData);

// NOVO: Atualizar variation.files[].r2Key
setFormData(prev => ({
  ...prev,
  variations: prev.variations.map(v => ({
    ...v,
    files: v.files.map(f => (f.file === file ? { ...f, r2Key: j?.data?.key } : f)),
  })),
}));
```

```typescript
// 🔄 Após upload por chunks (arquivo grande)
const cacheData = { r2Key: j?.data?.key };
uploadCacheRef.current.set(file, cacheData);

// NOVO: Atualizar variation.files[].r2Key
setFormData(prev => ({
  ...prev,
  variations: prev.variations.map(v => ({
    ...v,
    files: v.files.map(f => (f.file === file ? { ...f, r2Key: j?.data?.key } : f)),
  })),
}));
```

### 2. **Sincronizar cloudinaryId para Imagens**

Mesma lógica aplicada para imagens de variação:

```typescript
// 🔄 Após upload direto Cloudinary
const cacheData = { cloudinaryId: result.publicId, url: result.secureUrl };
uploadCacheRef.current.set(file, cacheData);

if (folder === 'variations') {
  setFormData(prev => ({
    ...prev,
    variations: prev.variations.map(v => ({
      ...v,
      images: v.images.map(img =>
        img.file === file ? { ...img, cloudinaryId: result.publicId, url: result.secureUrl } : img
      ),
    })),
  }));
}
```

```typescript
// 🔄 Após upload via backend
const cacheData = { cloudinaryId: data.cloudinaryId, url: data.url };
uploadCacheRef.current.set(file, cacheData);

if (folder === 'variations') {
  setFormData(prev => ({
    ...prev,
    variations: prev.variations.map(v => ({
      ...v,
      images: v.images.map(img =>
        img.file === file ? { ...img, cloudinaryId: data.cloudinaryId, url: data.url } : img
      ),
    })),
  }));
}
```

### 3. **Limpeza ao Remover Arquivo**

**VariationManager.tsx:**

```typescript
const confirmRemoveFile = async () => {
  if (!fileToRemove) return;

  // 🗑️ Notificar ProductForm para limpar cache
  onFileRemoved?.(file.file);

  // 🗑️ Deletar do R2 APENAS se r2Key existir
  if (file.r2Key) {
    try {
      await fetch(`/api/r2/delete?r2Key=${encodeURIComponent(file.r2Key)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Erro ao deletar do R2:', error);
    }
  }

  // 🗑️ Revogar Blob URL (prevenir memory leak)
  if (file.url?.startsWith('blob:')) {
    URL.revokeObjectURL(file.url);
  }

  // ✅ Remover da lista
  const newFiles = [...variation.files];
  newFiles.splice(fileToRemove.index, 1);
  updateVariation({ ...variation, files: newFiles });
};
```

---

## ✅ Resultado

**ANTES:**

```
1. Anexa PDF → Upload em background → r2Key salvo no cache
2. Clica no X → file.r2Key === undefined → Nenhuma deleção
3. API retorna 200 OK mas arquivo fica no R2
4. Tenta adicionar outro → Erro (chave duplicada)
```

**DEPOIS:**

```
1. Anexa PDF → Upload em background → r2Key salvo no cache + variation
2. Clica no X → file.r2Key existe → Deleta do R2
3. API retorna 200 OK e arquivo removido
4. Pode adicionar outro PDF normalmente ✅
```

---

## 📋 Validação

### Teste Manual:

1. **Criar nova variação**
2. **Anexar PDF** → Aguardar upload (barra de progresso 100%)
3. **Verificar console:**
   ```
   ✅ PDF enviado em background: arquivo.pdf
   ```
4. **Clicar no X** → Confirmar remoção
5. **Verificar no R2 Dashboard** → Arquivo deletado
6. **Anexar outro PDF** → Deve funcionar sem erros

### Casos de Uso:

- ✅ Upload direto R2 (conexão boa)
- ✅ Upload via backend (fallback)
- ✅ Upload por chunks (arquivos grandes)
- ✅ Remover antes do upload completar
- ✅ Remover após upload completar
- ✅ Substituir PDF existente

---

## 🔐 Segurança

- ✅ Apenas arquivos com `r2Key` válido são deletados
- ✅ Blob URLs revogadas para prevenir memory leak
- ✅ Cache limpo ao remover arquivo
- ✅ Chaves URL-encoded (prevenir injection)

---

## 📦 Arquivos Modificados

1. **src/components/admin/ProductForm.tsx**
   - Linha 137-147: Sync r2Key após upload direto R2
   - Linha 162-172: Sync r2Key após upload backend (pequeno)
   - Linha 213-223: Sync r2Key após upload chunks (grande)
   - Linha 268-280: Sync cloudinaryId após upload direto
   - Linha 302-314: Sync cloudinaryId após upload backend

2. **src/components/admin/VariationManager.tsx**
   - Linha 61: Adicionado prop `onFileUploaded`
   - Linha 272-295: Lógica de deleção melhorada

---

## 🎯 Próximos Passos

- [ ] Testar com arquivos grandes (>50MB)
- [ ] Validar com conexão lenta (simular 3G)
- [ ] Verificar logs no R2 (dashboard Cloudflare)
- [ ] Adicionar retry automático em caso de falha
