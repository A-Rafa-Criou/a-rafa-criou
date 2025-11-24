# Como Converter Banner GIF para MP4 (Economia de 130 KB)

## Por que converter?
- **GIF atual**: 235 KB
- **MP4 esperado**: ~100 KB
- **Economia**: ~130 KB (55% menor!)
- **Melhor LCP**: Vídeo carrega mais rápido que GIF

## Opção 1: Usar Cloudinary (Recomendado - Online)

1. Acesse: https://cloudinary.com/tools/video-converter
2. Faça upload de `public/Banner_principal.gif`
3. Selecione formato: **MP4**
4. Configurações:
   - Codec: H.264
   - Quality: Medium-High (CRF 23-25)
   - Resolution: 1920x600 (manter original)
5. Baixe o arquivo como `banner-principal.mp4`
6. Coloque em `public/banner-principal.mp4`

## Opção 2: Usar FFmpeg (Offline - Melhor Qualidade)

### Instalar FFmpeg:
```powershell
# Windows (com Chocolatey)
choco install ffmpeg

# Ou baixe: https://ffmpeg.org/download.html
```

### Converter:
```powershell
cd public

# Conversão otimizada (H.264, CRF 23, 15 fps)
ffmpeg -i Banner_principal.gif -vf "fps=15,scale=1920:600:flags=lanczos" -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -movflags +faststart banner-principal.mp4

# Se quiser ainda menor (CRF 28, qualidade um pouco menor)
ffmpeg -i Banner_principal.gif -vf "fps=12,scale=1920:600:flags=lanczos" -c:v libx264 -crf 28 -preset slow -pix_fmt yuv420p -movflags +faststart banner-principal.mp4
```

### Verificar tamanho:
```powershell
(Get-Item banner-principal.mp4).Length / 1KB
```

## Opção 3: Usar CloudConvert (Online - Fácil)

1. Acesse: https://cloudconvert.com/gif-to-mp4
2. Upload: `public/Banner_principal.gif`
3. Settings:
   - Video Codec: H.264
   - Quality: High
   - Resolution: 1920x600
   - FPS: 15
4. Convert e baixe
5. Salve como `public/banner-principal.mp4`

## Opção 4: Usar EZGIF (Online - Rápido)

1. Acesse: https://ezgif.com/gif-to-mp4
2. Upload: `public/Banner_principal.gif`
3. Settings:
   - FPS: 15
   - Video Codec: H.264
4. Convert to MP4
5. Salve como `public/banner-principal.mp4`

## Depois de Converter:

1. Coloque o arquivo `banner-principal.mp4` em `public/`
2. O código já está preparado para usar o vídeo:
   ```tsx
   <video autoPlay loop muted playsInline poster="/Banner_principal.gif">
     <source src="/banner-principal.mp4" type="video/mp4" />
     {/* Fallback para GIF se MP4 não carregar */}
   </video>
   ```
3. Teste localmente: `npm run dev`
4. Commit e push:
   ```bash
   git add public/banner-principal.mp4
   git commit -m "feat: adicionar banner em MP4 otimizado (-130 KB)"
   git push
   ```

## Verificar Melhorias:

Após deploy, teste no PageSpeed:
- https://pagespeed.web.dev/analysis/https-www-arafacriou-com-br/

**Esperado**:
- LCP: 6.6s → ~2.5-3.5s
- Performance Score: 64 → 85-90

## Bonus: Criar WebM (ainda menor)

```powershell
# WebM com VP9 (pode economizar mais 20-30%)
ffmpeg -i Banner_principal.gif -vf "fps=15,scale=1920:600" -c:v libvpx-vp9 -crf 30 -b:v 0 banner-principal.webm
```

Depois adicione no código:
```tsx
<video ...>
  <source src="/banner-principal.webm" type="video/webm" />
  <source src="/banner-principal.mp4" type="video/mp4" />
</video>
```

---

**Status Atual**: ✅ Código preparado, aguardando conversão do arquivo
