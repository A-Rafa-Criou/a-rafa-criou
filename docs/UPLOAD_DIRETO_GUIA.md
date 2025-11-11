# 🚀 Guia de Upload Direto - Performance Otimizada

Este documento explica como usar os novos endpoints de upload direto para R2 e Cloudinary, eliminando o gargalo do backend.

## 📊 Comparação de Performance

### Antes (upload via backend):

- **PDFs (chunks)**: 1-2.3s por chunk + 2-2.5s finalização = ~6-8s total para 3 PDFs
- **Imagens (Cloudinary)**: 1.5-3.2s por imagem = ~10s para 4 imagens
- **Total**: ~16-18 segundos

### Depois (upload direto):

- **PDFs (R2 direto)**: 0.5-1s por arquivo = ~2-3s total para 3 PDFs
- **Imagens (Cloudinary direto)**: 0.3-0.8s por imagem = ~2-3s para 4 imagens
- **Total estimado**: **4-6 segundos** (redução de 60-70%)

---

## 🎯 Upload Direto para R2 (PDFs)

### Backend: Gerar URL Assinada

**Endpoint**: `POST /api/r2/generate-upload-url`

```typescript
// Request
{
  "fileName": "produto.pdf",
  "fileType": "application/pdf",
  "fileSize": 5242880 // 5MB
}

// Response
{
  "uploadUrl": "https://r2.cloudflare.com/bucket/key?signature=...",
  "fileKey": "pdfs/1234567890-produto.pdf",
  "expiresIn": 3600 // 1 hora
}
```

### Frontend: Upload Direto

```typescript
import { uploadDirectToR2 } from '@/lib/upload-utils';

// Exemplo 1: Upload simples
const file = document.querySelector('input[type="file"]').files[0];
const result = await uploadDirectToR2(file);
console.log('Arquivo enviado:', result.key);

// Exemplo 2: Com progress tracking
const result = await uploadDirectToR2(file, progress => {
  console.log(`Upload: ${progress}%`);
});
```

### Vantagens:

- ✅ **Sem Base64**: Não codifica/decodifica (economiza ~33% CPU + tamanho)
- ✅ **Sem PostgreSQL**: Não armazena chunks temporariamente no banco
- ✅ **Direto ao R2**: Browser → Cloudflare R2 (1 hop vs 3 hops)
- ✅ **Progress real**: XMLHttpRequest nativo com eventos de progresso

---

## 🎨 Upload Direto para Cloudinary (Imagens)

### Backend: Gerar Assinatura

**Endpoint**: `POST /api/cloudinary/generate-signature`

```typescript
// Request
{
  "folder": "products" // ou "variations"
}

// Response
{
  "cloudName": "seu-cloud",
  "apiKey": "123456789",
  "timestamp": 1699999999,
  "signature": "abc123...",
  "folder": "a-rafa-criou/images/products"
}
```

### Frontend: Upload Direto

```typescript
import { uploadDirectToCloudinary, compressImage } from '@/lib/upload-utils';

// Exemplo 1: Com compressão (recomendado)
const file = document.querySelector('input[type="file"]').files[0];
const compressed = await compressImage(file, 800, 0.75); // 800px, 75% quality
const result = await uploadDirectToCloudinary(compressed, 'products');
console.log('Imagem enviada:', result.secureUrl);

// Exemplo 2: Base64 (para imagens já comprimidas)
const base64 = 'data:image/jpeg;base64,...';
const result = await uploadDirectToCloudinary(base64, 'products');

// Exemplo 3: Com progress tracking
const result = await uploadDirectToCloudinary(file, 'products', progress => {
  console.log(`Upload: ${progress}%`);
});
```

### Vantagens:

- ✅ **Sem backend intermediário**: Browser → Cloudinary API direto
- ✅ **Compressão client-side**: 1200px→800px, 85%→75% = ~50% menor payload
- ✅ **Parallel uploads**: Enviar múltiplas imagens simultaneamente
- ✅ **Progress tracking**: Feedback visual para o usuário

---

## 🔧 Integração com ProductForm

### Antes (upload via backend):

```typescript
// Upload via POST /api/cloudinary/upload
const formData = new FormData();
formData.append('image', base64String);
const res = await fetch('/api/cloudinary/upload', {
  method: 'POST',
  body: formData,
});
// Tempo: 1.5-3.2s por imagem
```

### Depois (upload direto):

```typescript
// Upload direto para Cloudinary
import { uploadDirectToCloudinary, compressImage } from '@/lib/upload-utils';

// 1. Comprimir
const compressed = await compressImage(file, 800, 0.75);

// 2. Upload direto (em paralelo)
const results = await Promise.all(
  imageFiles.map(file =>
    compressImage(file, 800, 0.75).then(compressed =>
      uploadDirectToCloudinary(compressed, 'products')
    )
  )
);
// Tempo estimado: 0.3-0.8s por imagem (4x mais rápido!)
```

---

## 📦 Exemplo Completo: ProductForm Otimizado

```typescript
import { uploadDirectToR2, uploadDirectToCloudinary, compressImage } from '@/lib/upload-utils';

async function handleProductSubmit(data: FormData) {
  const startTime = performance.now();

  // 1. Upload paralelo de PDFs (direto para R2)
  const pdfResults = await Promise.all(
    pdfFiles.map(file =>
      uploadDirectToR2(file, progress => {
        console.log(`PDF ${file.name}: ${progress}%`);
      })
    )
  );

  // 2. Upload paralelo de imagens (comprimir + Cloudinary direto)
  const imageResults = await Promise.all(
    imageFiles.map(async file => {
      const compressed = await compressImage(file, 800, 0.75);
      return uploadDirectToCloudinary(compressed, 'products', progress => {
        console.log(`Image ${file.name}: ${progress}%`);
      });
    })
  );

  // 3. Criar produto no banco (apenas metadados)
  const product = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      pdfKeys: pdfResults.map(r => r.key),
      imageUrls: imageResults.map(r => r.secureUrl),
    }),
  });

  const endTime = performance.now();
  console.log(`✅ Produto criado em ${((endTime - startTime) / 1000).toFixed(2)}s`);
}
```

---

## ⚠️ Considerações Importantes

### Segurança:

- ✅ **URLs assinadas**: R2 usa presigned URLs com TTL de 1 hora
- ✅ **Assinaturas Cloudinary**: Geradas no backend com API secret
- ✅ **Private buckets**: R2 nunca expõe arquivos publicamente
- ✅ **Rate limiting**: Endpoints protegidos contra abuso

### Limitações:

- **R2**: Arquivo máximo 5GB (mais que suficiente para PDFs)
- **Cloudinary**: Imagem máxima 100MB (plano free)
- **TTL**: URLs expiram em 1 hora (regenerar se necessário)

### Fallback:

Se o upload direto falhar (CORS, rede, etc), o sistema volta automaticamente para upload via backend.

---

## 🧪 Testando Performance

```typescript
// Console do browser
const start = performance.now();
await uploadDirectToR2(file);
const end = performance.now();
console.log(`Upload levou ${((end - start) / 1000).toFixed(2)}s`);
```

### Benchmarks esperados:

- **PDF 10MB**: ~1-2s (direto) vs ~4-6s (backend)
- **Imagem 2MB**: ~0.5-1s (direto) vs ~2-3s (backend)
- **3 PDFs + 4 imagens**: ~4-6s (direto) vs ~16-18s (backend)

---

## 📝 Próximos Passos

1. **Migrar ProductForm**: Substituir uploads antigos por `uploadDirectToR2` e `uploadDirectToCloudinary`
2. **Adicionar progress bars**: Usar callbacks de progresso para feedback visual
3. **Testar em produção**: Validar que URLs assinadas funcionam no Vercel
4. **Monitorar erros**: Adicionar Sentry/logging para rastrear falhas de upload
5. **Otimizar compressão**: Ajustar parâmetros (800px, 75%) conforme necessário

---

## 🎉 Resultado Final Esperado

**Meta**: Criar produto em < 3 segundos

- Upload PDFs: ~2s (3 arquivos)
- Upload imagens: ~2s (4 imagens)
- Criar no banco: ~0.5s
- **Total**: ~4.5s ✅ (ainda acima da meta, mas 3x mais rápido que antes!)

Para atingir <3s, considere:

- Reduzir número de imagens/PDFs por produto
- Lazy load de variações (criar produto primeiro, adicionar arquivos depois)
- Batch upload (upload + criação em paralelo total)
