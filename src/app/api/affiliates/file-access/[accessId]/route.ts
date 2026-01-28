import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateFileAccess, affiliates } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getR2SignedUrl } from '@/lib/r2-utils';

export async function GET(req: NextRequest, { params }: { params: Promise<{ accessId: string }> }) {
  try {
    const { accessId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Não autorizado', { status: 401 });
    }

    // Buscar acesso do afiliado
    const [access] = await db
      .select()
      .from(affiliateFileAccess)
      .innerJoin(affiliates, eq(affiliateFileAccess.affiliateId, affiliates.id))
      .where(
        and(
          eq(affiliateFileAccess.id, accessId),
          eq(affiliates.userId, session.user.id),
          eq(affiliateFileAccess.isActive, true),
          gt(affiliateFileAccess.expiresAt, new Date())
        )
      );

    if (!access) {
      return new NextResponse('Acesso não encontrado, expirado ou você não tem permissão', {
        status: 404,
      });
    }

    // Incrementar contador de visualizações
    await db
      .update(affiliateFileAccess)
      .set({
        viewCount: access.affiliate_file_access.viewCount + 1,
        lastAccessedAt: new Date(),
      })
      .where(eq(affiliateFileAccess.id, accessId));

    // Gerar URL assinada do R2 (24h de validade, forçar visualização em vez de download)
    const filePath = access.affiliate_file_access.fileUrl; // Na verdade é o path do R2

    console.log('[FILE-ACCESS] Gerando URL assinada para:', filePath);

    const fileUrl = await getR2SignedUrl(filePath, 24 * 60 * 60, false); // 24h, sem forçar download

    console.log('[FILE-ACCESS] URL gerada com sucesso');

    // Dados do afiliado para marca d'água
    const affiliateName = access.affiliates.name || 'Afiliado';
    const accessDate = new Date().toLocaleDateString('pt-BR');

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visualização de Arquivo - Licença Comercial</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f4f4f4;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      background: white;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }
    .header h1 {
      font-size: 1.2rem;
      color: #333;
    }
    .controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    button {
      background: #FED466;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    button:hover:not(:disabled) {
      background: #FDC940;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .info {
      background: #fff3cd;
      color: #856404;
      padding: 0.75rem 1rem;
      text-align: center;
      font-size: 0.9rem;
      z-index: 10;
    }
    .viewer-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: auto;
      padding: 1rem;
      background: #e0e0e0;
    }
    #pdf-canvas {
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      background: white;
      margin-bottom: 1rem;
    }
    .loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: #666;
      font-size: 1.2rem;
    }
    .page-controls {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.5rem;
    }
    
    @media print {
      body {
        background: white !important;
      }
      .header,
      .info,
      .page-controls,
      .loading {
        display: none !important;
      }
      .viewer-container {
        padding: 0 !important;
        overflow: visible !important;
        background: white !important;
      }
      #pdf-canvas {
        box-shadow: none !important;
        page-break-after: always;
        max-width: 100% !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📄 Visualização de Arquivo - Licença Comercial</h1>
    <div class="controls">
      <div class="page-controls">
        <button onclick="previousPage()" id="prev">◀ Anterior</button>
        <span id="page-info">Página 1 de 1</span>
        <button onclick="nextPage()" id="next">Próxima ▶</button>
      </div>
      <button onclick="printFile()" id="print-btn">🖨️ Imprimir</button>
      <button onclick="window.close()">✕ Fechar</button>
    </div>
  </div>
  
  <div class="info">
    ⚠️ <strong>Download bloqueado.</strong> Você pode apenas visualizar e imprimir este arquivo.
    O acesso expira em: <strong>${new Date(access.affiliate_file_access.expiresAt).toLocaleDateString('pt-BR')}</strong>
  </div>

  <div class="viewer-container">
    <div class="loading" id="loading">
      <p>⏳ Carregando arquivo...</p>
    </div>
    <canvas id="pdf-canvas"></canvas>
  </div>

  <script>
    // Bloquear atalhos de teclado
    document.addEventListener('keydown', (e) => {
      // Bloquear Ctrl+S, Ctrl+P
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (e.key === 'p' || e.key === 'P') {
          printFile();
        }
        return false;
      }
    });

    // Bloquear menu de contexto
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });

    // Configurar PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    let pdfDoc = null;
    let pageNum = 1;
    let pageRendering = false;
    let pageNumPending = null;
    const scale = 1.5;
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');

    // Carregar PDF
    async function loadPDF() {
      try {
        console.log('📄 Carregando PDF...');
        
        // Buscar PDF como blob para evitar cache do navegador
        const response = await fetch('${fileUrl}');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const loadingTask = pdfjsLib.getDocument(url);
        pdfDoc = await loadingTask.promise;
        
        document.getElementById('page-info').textContent = \`Página \${pageNum} de \${pdfDoc.numPages}\`;
        
        renderPage(pageNum);
        
        document.getElementById('loading').style.display = 'none';
        console.log('✅ PDF carregado:', pdfDoc.numPages, 'páginas');
      } catch (error) {
        console.error('❌ Erro ao carregar PDF:', error);
        document.getElementById('loading').innerHTML = '<p style="color: red;">❌ Erro ao carregar arquivo</p>';
      }
    }

    function renderPage(num) {
      pageRendering = true;
      
      pdfDoc.getPage(num).then(page => {
        const viewport = page.getViewport({ scale: scale });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };
        
        const renderTask = page.render(renderContext);
        
        renderTask.promise.then(() => {
          pageRendering = false;
          if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      });

      document.getElementById('page-info').textContent = \`Página \${num} de \${pdfDoc.numPages}\`;
      
      // Atualizar botões
      document.getElementById('prev').disabled = (num <= 1);
      document.getElementById('next').disabled = (num >= pdfDoc.numPages);
    }

    function queueRenderPage(num) {
      if (pageRendering) {
        pageNumPending = num;
      } else {
        renderPage(num);
      }
    }

    function previousPage() {
      if (pageNum <= 1) return;
      pageNum--;
      queueRenderPage(pageNum);
    }

    function nextPage() {
      if (pageNum >= pdfDoc.numPages) return;
      pageNum++;
      queueRenderPage(pageNum);
    }

    async function printFile() {
      try {
        console.log('🖨️ Preparando impressão...');
        document.getElementById('print-btn').disabled = true;
        document.getElementById('print-btn').textContent = '⏳ Preparando...';
        
        // Registrar impressão
        await fetch('/api/affiliates/file-access/${accessId}/print', {
          method: 'POST',
        }).catch(err => console.warn('Erro ao registrar impressão:', err));

        // Renderizar todas as páginas para impressão
        const printScale = 2.0;
        
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: printScale });
          
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          // Renderizar página do PDF (sem marca d'água)
          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
          
          if (i < pdfDoc.numPages) {
            canvas.style.pageBreakAfter = 'always';
          }
        }
        
        // Imprimir
        setTimeout(() => {
          window.print();
          
          // Restaurar visualização da página atual
          renderPage(pageNum);
          document.getElementById('print-btn').disabled = false;
          document.getElementById('print-btn').textContent = '🖨️ Imprimir';
        }, 500);
        
      } catch (error) {
        console.error('❌ Erro ao imprimir:', error);
        alert('Erro ao preparar impressão. Tente novamente.');
        document.getElementById('print-btn').disabled = false;
        document.getElementById('print-btn').textContent = '🖨️ Imprimir';
      }
    }

    // Iniciar carregamento
    loadPDF();
  </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error('Error viewing file:', error);
    return new NextResponse('Erro ao carregar arquivo', { status: 500 });
  }
}
