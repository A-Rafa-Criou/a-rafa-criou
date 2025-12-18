import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { affiliateFileAccess, affiliates } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

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

    // Retornar HTML com iframe protegido
    const fileUrl = access.affiliate_file_access.fileUrl;
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visualização de Arquivo</title>
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
    }
    .header {
      background: white;
      padding: 1rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 1.2rem;
      color: #333;
    }
    .controls {
      display: flex;
      gap: 0.5rem;
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
    button:hover {
      background: #FDC940;
    }
    .info {
      background: #fff3cd;
      color: #856404;
      padding: 0.75rem 1rem;
      text-align: center;
      font-size: 0.9rem;
    }
    .viewer-container {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1rem;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📄 Visualização de Arquivo - Licença Comercial</h1>
    <div class="controls">
      <button onclick="printFile()">🖨️ Imprimir</button>
      <button onclick="window.close()">✕ Fechar</button>
    </div>
  </div>
  
  <div class="info">
    ⚠️ <strong>Download bloqueado.</strong> Você pode apenas visualizar e imprimir este arquivo.
    O acesso expira em: <strong>${new Date(access.affiliate_file_access.expiresAt).toLocaleDateString('pt-BR')}</strong>
  </div>

  <div class="viewer-container">
    <iframe 
      src="${fileUrl}" 
      sandbox="allow-same-origin allow-scripts allow-popups allow-modals"
      oncontextmenu="return false;"
      id="fileViewer"
    ></iframe>
  </div>

  <script>
    // Bloquear menu de contexto (botão direito)
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });

    // Bloquear atalhos de download
    document.addEventListener('keydown', (e) => {
      // Ctrl+S, Ctrl+P (permitir apenas P para impressão via botão)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        alert('Download não permitido. Use o botão de imprimir.');
        return false;
      }
    });

    async function printFile() {
      try {
        // Incrementar contador de impressão
        await fetch('/api/affiliates/file-access/${accessId}/print', {
          method: 'POST',
        });

        // Abrir janela de impressão
        const iframe = document.getElementById('fileViewer');
        iframe.contentWindow.print();
      } catch (error) {
        console.error('Erro ao imprimir:', error);
        alert('Erro ao preparar impressão. Tente novamente.');
      }
    }

    // Avisar antes de fechar se não imprimiu
    window.addEventListener('beforeunload', (e) => {
      // Pode adicionar lógica adicional aqui se necessário
    });
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
