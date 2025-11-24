# Script para converter Banner GIF para MP4 usando FFmpeg
# Economia esperada: ~130 KB (55% menor)

Write-Host "`n=== CONVERSOR DE BANNER GIF → MP4 ===`n" -ForegroundColor Cyan

# Verificar se FFmpeg está instalado
$ffmpegInstalled = Get-Command ffmpeg -ErrorAction SilentlyContinue

if (-not $ffmpegInstalled) {
    Write-Host "❌ FFmpeg não encontrado!" -ForegroundColor Red
    Write-Host "`nOpções de instalação:" -ForegroundColor Yellow
    Write-Host "1. Com Chocolatey: choco install ffmpeg" -ForegroundColor White
    Write-Host "2. Download direto: https://ffmpeg.org/download.html" -ForegroundColor White
    Write-Host "`nOu use conversão online:" -ForegroundColor Yellow
    Write-Host "- Cloudinary: https://cloudinary.com/tools/video-converter" -ForegroundColor White
    Write-Host "- CloudConvert: https://cloudconvert.com/gif-to-mp4" -ForegroundColor White
    Write-Host "- EZGIF: https://ezgif.com/gif-to-mp4`n" -ForegroundColor White
    exit 1
}

Write-Host "✅ FFmpeg encontrado!`n" -ForegroundColor Green

# Verificar se o GIF existe
$gifPath = "public/Banner_principal.gif"
if (-not (Test-Path $gifPath)) {
    Write-Host "❌ Arquivo não encontrado: $gifPath`n" -ForegroundColor Red
    exit 1
}

# Tamanho original
$originalSize = (Get-Item $gifPath).Length
$originalSizeKB = [math]::Round($originalSize / 1KB, 2)
Write-Host "📦 Tamanho original (GIF): $originalSizeKB KB`n" -ForegroundColor White

# Perguntar qual qualidade usar
Write-Host "Escolha a qualidade:" -ForegroundColor Yellow
Write-Host "1. Alta (CRF 23, ~100-120 KB)" -ForegroundColor White
Write-Host "2. Média (CRF 25, ~80-100 KB) - Recomendado" -ForegroundColor Green
Write-Host "3. Baixa (CRF 28, ~60-80 KB)`n" -ForegroundColor White
$choice = Read-Host "Digite 1, 2 ou 3"

$crf = switch ($choice) {
    "1" { 23 }
    "3" { 28 }
    default { 25 }
}

Write-Host "`n🔄 Convertendo com CRF $crf...`n" -ForegroundColor Cyan

# Converter
$outputPath = "public/banner-principal.mp4"
ffmpeg -i $gifPath `
    -vf "fps=15,scale=1920:600:flags=lanczos" `
    -c:v libx264 `
    -crf $crf `
    -preset slow `
    -pix_fmt yuv420p `
    -movflags +faststart `
    -y `
    $outputPath

if ($LASTEXITCODE -eq 0) {
    $newSize = (Get-Item $outputPath).Length
    $newSizeKB = [math]::Round($newSize / 1KB, 2)
    $savings = [math]::Round(($originalSize - $newSize) / 1KB, 2)
    $percent = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 1)
    
    Write-Host "`n✅ CONVERSÃO CONCLUÍDA!" -ForegroundColor Green
    Write-Host "📦 Tamanho original (GIF): $originalSizeKB KB" -ForegroundColor White
    Write-Host "📦 Tamanho novo (MP4): $newSizeKB KB" -ForegroundColor White
    Write-Host "💾 Economia: $savings KB ($percent%)`n" -ForegroundColor Cyan
    
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "1. Teste localmente: npm run dev" -ForegroundColor White
    Write-Host "2. Commit: git add public/banner-principal.mp4" -ForegroundColor White
    Write-Host "3. git commit -m 'feat: adicionar banner MP4 otimizado (-${savings} KB)'" -ForegroundColor White
    Write-Host "4. git push`n" -ForegroundColor White
} else {
    Write-Host "`n❌ Erro na conversão!" -ForegroundColor Red
    Write-Host "Tente usar conversão online em:" -ForegroundColor Yellow
    Write-Host "- https://cloudconvert.com/gif-to-mp4`n" -ForegroundColor White
    exit 1
}
