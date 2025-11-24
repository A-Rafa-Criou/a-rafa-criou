# Script para converter Banner GIF para MP4 usando FFmpeg
# Economia esperada: ~130 KB (55 porcento menor)

Write-Host ''
Write-Host '=== CONVERSOR DE BANNER GIF PARA MP4 ===' -ForegroundColor Cyan
Write-Host ''

# Verificar se FFmpeg esta instalado
$ffmpegInstalled = Get-Command ffmpeg -ErrorAction SilentlyContinue

if (-not $ffmpegInstalled) {
    Write-Host 'FFmpeg nao encontrado!' -ForegroundColor Red
    Write-Host ''
    Write-Host 'Opcoes de instalacao:' -ForegroundColor Yellow
    Write-Host '1. Com Chocolatey: choco install ffmpeg' -ForegroundColor White
    Write-Host '2. Download direto: https://ffmpeg.org/download.html' -ForegroundColor White
    Write-Host ''
    Write-Host 'Ou use conversao online:' -ForegroundColor Yellow
    Write-Host '- Cloudinary: https://cloudinary.com/tools/video-converter' -ForegroundColor White
    Write-Host '- CloudConvert: https://cloudconvert.com/gif-to-mp4' -ForegroundColor White
    Write-Host '- EZGIF: https://ezgif.com/gif-to-mp4' -ForegroundColor White
    Write-Host ''
    exit 1
}

Write-Host 'FFmpeg encontrado!' -ForegroundColor Green
Write-Host ''

# Verificar se o GIF existe
$gifPath = 'public/Banner_principal.gif'
if (-not (Test-Path $gifPath)) {
    Write-Host "Arquivo nao encontrado: $gifPath" -ForegroundColor Red
    Write-Host ''
    exit 1
}

# Tamanho original
$originalSize = (Get-Item $gifPath).Length
$originalSizeKB = [math]::Round($originalSize / 1KB, 2)
Write-Host "Tamanho original (GIF): $originalSizeKB KB" -ForegroundColor White
Write-Host ''

# Perguntar qual qualidade usar
Write-Host 'Escolha a qualidade:' -ForegroundColor Yellow
Write-Host '1. Alta (CRF 23, aproximadamente 100-120 KB)' -ForegroundColor White
Write-Host '2. Media (CRF 25, aproximadamente 80-100 KB) - Recomendado' -ForegroundColor Green
Write-Host '3. Baixa (CRF 28, aproximadamente 60-80 KB)' -ForegroundColor White
Write-Host ''
$choice = Read-Host 'Digite 1, 2 ou 3'

$crf = switch ($choice) {
    '1' { 23 }
    '3' { 28 }
    default { 25 }
}

Write-Host ''
Write-Host "Convertendo com CRF $crf..." -ForegroundColor Cyan
Write-Host ''

# Converter
$outputPath = 'public/banner-principal.mp4'
ffmpeg -i $gifPath -vf 'fps=15,scale=1920:600:flags=lanczos' -c:v libx264 -crf $crf -preset slow -pix_fmt yuv420p -movflags +faststart -y $outputPath

if ($LASTEXITCODE -eq 0) {
    $newSize = (Get-Item $outputPath).Length
    $newSizeKB = [math]::Round($newSize / 1KB, 2)
    $savings = [math]::Round(($originalSize - $newSize) / 1KB, 2)
    $percentSaved = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 1)
    
    Write-Host ''
    Write-Host '=== CONVERSAO CONCLUIDA ===' -ForegroundColor Green
    Write-Host "Tamanho original (GIF): $originalSizeKB KB" -ForegroundColor White
    Write-Host "Tamanho novo (MP4): $newSizeKB KB" -ForegroundColor White
    Write-Host "Economia: $savings KB ($percentSaved porcento)" -ForegroundColor Cyan
    Write-Host ''
    
    Write-Host 'Proximos passos:' -ForegroundColor Yellow
    Write-Host '1. Teste localmente: npm run dev' -ForegroundColor White
    Write-Host '2. git add public/banner-principal.mp4' -ForegroundColor White
    Write-Host '3. git commit -m "feat: adicionar banner MP4 otimizado"' -ForegroundColor White
    Write-Host '4. git push' -ForegroundColor White
    Write-Host ''
} else {
    Write-Host ''
    Write-Host 'Erro na conversao!' -ForegroundColor Red
    Write-Host 'Tente usar conversao online em:' -ForegroundColor Yellow
    Write-Host '- https://cloudconvert.com/gif-to-mp4' -ForegroundColor White
    Write-Host ''
    exit 1
}
