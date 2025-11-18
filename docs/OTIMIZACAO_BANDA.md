# Otimização de Banda - Fast Origin Transfer Vercel

## 🚨 Situação Atual
- **Uso**: 7,89 GB / 10 GB (79%)
- **Limite**: Se atingir 10 GB, o site pode ficar lento ou ter cobranças extras
- **Principais Causas**: Imagens não otimizadas, falta de cache agressivo, assets servidos direto do servidor

## ✅ Otimizações Implementadas

### 1. **Cache Headers Agressivos** ✅
```typescript
// Configurado em next.config.ts
- Imagens otimizadas (_next/image): cache de 1 ano
- Assets estáticos (_next/static): cache de 1 ano
- Fontes: cache de 1 ano
- Ícones: cache de 1 ano
- API de produtos: 6h + 12h stale-while-revalidate
- API de categorias: 12h + 24h stale-while-revalidate
- Páginas de produtos: 1h + 2h stale-while-revalidate
```

### 2. **Otimização de Imagens** ✅
```typescript
// Qualidades reduzidas para economizar banda
qualities: [50, 75, 90] // Antes: [75, 90, 100]
// Mobile usa 50%, Desktop 75%, Alta qualidade 90%

// Device sizes otimizados (removido 2K e 4K)
deviceSizes: [640, 750, 828, 1080, 1200, 1920]

// Cache de 1 ano para imagens
minimumCacheTTL: 31536000
```

### 3. **PDFs via Cloudflare R2** ✅
- Todos os PDFs são servidos via URLs assinadas do R2
- Não consomem banda da Vercel
- TTL de 15 minutos (segurança + economia)

## 📊 Próximas Ações (Prioridade)

### CRÍTICO - Implementar CDN para Imagens
**Impacto**: Pode reduzir 60-80% do consumo de banda

**Opção 1: Cloudflare CDN (RECOMENDADO)**
1. Criar conta Cloudflare (gratuito)
2. Adicionar domínio ao Cloudflare
3. Ativar proxy (nuvem laranja) para domínio
4. Configurar Page Rules:
   ```
   - *yourdomain.com/_next/image/* → Cache Everything, Edge TTL: 1 month
   - *yourdomain.com/_next/static/* → Cache Everything, Edge TTL: 1 year
   - *yourdomain.com/fonts/* → Cache Everything, Edge TTL: 1 year
   ```

**Opção 2: Mover Imagens para R2 + Public URL**
```bash
# Criar bucket público no R2 para imagens de produtos
# Vantagem: mesma infraestrutura dos PDFs, sem limite de banda
```

### IMPORTANTE - Otimizar Imagens Existentes
**Impacto**: Reduz 30-50% do tamanho das imagens

```bash
# Instalar ferramenta de otimização
npm install -D sharp

# Criar script para converter todas imagens para WebP
node scripts/optimize-images.js
```

### MÉDIO - Lazy Loading de Imagens
**Impacto**: Reduz 20-30% da banda inicial

```tsx
// Verificar se todos os components usam Next.js Image
import Image from 'next/image'

<Image
  src={imageUrl}
  alt="..."
  width={600}
  height={400}
  loading="lazy" // Carrega apenas quando visível
  quality={75} // Qualidade adequada
/>
```

## 🔍 Monitoramento

### Dashboard Vercel
1. Acesse: https://vercel.com/[seu-projeto]/analytics
2. Vá em "Usage" → "Fast Origin Transfer"
3. Identifique os endpoints que mais consomem banda

### Alertas
Configure alertas quando atingir 80%:
1. Vercel Dashboard → Settings → Notifications
2. Adicionar alerta de uso de banda
3. Email quando atingir 8 GB (80%)

## 📈 Metas de Redução

| Otimização | Economia Estimada | Status |
|------------|------------------|--------|
| Cache headers | 10-15% | ✅ Implementado |
| Qualidade de imagem | 15-20% | ✅ Implementado |
| CDN Cloudflare | 50-70% | ⏳ Próximo passo |
| Lazy loading | 10-15% | ⏳ A implementar |
| Imagens WebP/AVIF | 20-30% | ⏳ A implementar |

**Total Estimado**: 60-80% de redução de banda

## 🚀 Implementação Rápida (30 min)

### 1. Cloudflare CDN (GRÁTIS)
```bash
# 1. Criar conta em cloudflare.com
# 2. Add Site → Digite seu domínio
# 3. Escolher plano Free
# 4. Copiar nameservers fornecidos
# 5. Atualizar DNS no registrar (Registro.br, GoDaddy, etc)
# 6. Aguardar propagação (5-24h)
# 7. Ativar proxy (nuvem laranja) para domínio principal
```

### 2. Mover Imagens de Produtos para R2
```typescript
// src/lib/r2-images.ts
export async function uploadProductImage(file: File, productId: string) {
  // Upload para bucket público no R2
  // Retorna URL pública sem assinatura
  // Cloudflare CDN automático (sem cobrança extra)
}
```

### 3. Verificar Uso Atual
```bash
# Ver quais rotas mais consomem banda
curl https://api.vercel.com/v1/teams/[team-id]/analytics \
  -H "Authorization: Bearer [token]"
```

## ⚠️ Se Atingir o Limite

### Imediato
1. **Reduzir qualidade de imagens**: `qualities: [40, 60, 75]`
2. **Desabilitar imagens 4K**: remover `2048, 3840` de `deviceSizes`
3. **Aumentar cache**: mudar `s-maxage` para valores maiores

### Temporário (Emergência)
```typescript
// Servir imagens via proxy externo
export const runtime = 'edge'; // API routes

// Redirecionar imagens para R2 direto
if (url.includes('/images/')) {
  return Response.redirect('https://r2-public.seu-dominio.com/...');
}
```

### Permanente
1. **Upgrade Vercel Pro**: US$ 20/mês
   - 100 GB Fast Origin Transfer (10x mais)
   - Edge Middleware ilimitado
   - Analytics avançado

2. **Cloudflare R2 + Workers**: Grátis até 10M requests/mês
   - Servir imagens via R2 público
   - Workers para redimensionamento on-the-fly
   - Sem cobrança de egress (transferência)

## 📝 Checklist

- [x] Cache headers configurados
- [x] Qualidades de imagem reduzidas
- [x] PDFs via R2 confirmado
- [ ] Cloudflare CDN ativado
- [ ] Imagens convertidas para WebP
- [ ] Lazy loading implementado
- [ ] Monitoramento de banda ativo
- [ ] Alertas configurados (80% uso)

## 🆘 Suporte

Se o limite for atingido antes das otimizações:
1. Contatar Vercel Support (support@vercel.com)
2. Solicitar aumento temporário de limite
3. Implementar Cloudflare CDN urgentemente
4. Considerar upgrade para Pro plan
