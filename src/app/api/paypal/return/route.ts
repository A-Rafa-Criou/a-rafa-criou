import { NextRequest, NextResponse } from 'next/server';

/**
 * Rota de retorno do PayPal após aprovação
 * Esta rota é chamada DENTRO do popup após o cliente aprovar o pagamento
 *
 * Como funciona:
 * 1. Cliente aprova pagamento no popup PayPal
 * 2. PayPal redireciona para esta rota (ainda dentro do popup)
 * 3. Mostramos mensagem de sucesso
 * 4. Popup fecha automaticamente via polling no componente
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // PayPal Order ID
  const paypalToken = searchParams.get('token');

  // Retornar página HTML simples que será exibida DENTRO do popup
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pagamento Aprovado - A Rafa Criou</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #FED466 0%, #FD9555 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 20px;
        }
        
        .container {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        
        .success-icon {
          width: 80px;
          height: 80px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          animation: scaleIn 0.5s ease-out;
        }
        
        .checkmark {
          width: 40px;
          height: 40px;
          border: 4px solid white;
          border-top: none;
          border-right: none;
          transform: rotate(-45deg);
          animation: checkmark 0.5s ease-out 0.3s both;
        }
        
        h1 {
          font-size: 24px;
          color: #1a1a1a;
          margin-bottom: 12px;
          font-weight: 700;
        }
        
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 8px;
        }
        
        .loader {
          margin: 24px auto 0;
          width: 40px;
          height: 40px;
          border: 4px solid #f3f4f6;
          border-top: 4px solid #FD9555;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes scaleIn {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
          }
        }
        
        @keyframes checkmark {
          from {
            width: 0;
            height: 0;
          }
          to {
            width: 40px;
            height: 40px;
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .note {
          margin-top: 24px;
          padding: 16px;
          background: #f3f4f6;
          border-radius: 8px;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="success-icon">
          <div class="checkmark"></div>
        </div>
        
        <h1 id="title">🔁 Pagamento em processamento</h1>

        <p id="desc">Seu pagamento foi aprovado pelo PayPal. Estamos finalizando seu pedido...</p>
        <p id="subdesc">Aguarde enquanto confirmamos o pagamento e geramos seu pedido.</p>
        
        <div class="loader"></div>
        
        <div class="note" id="note">
          Esta janela fechará automaticamente em alguns segundos se o pagamento for confirmado.
        </div>
        <div id="errorNote" style="display:none; margin-top:16px; color:#b91c1c; font-weight:bold;">Erro ao confirmar pagamento. Se o valor foi debitado, entre em contato com o suporte.</div>
        <div style="margin-top:16px; display:flex; gap:8px; justify-content:center;">
          <button id="retryBtn" style="padding:8px 12px; background:#FED466; border:1px solid #FD9555; border-radius:6px;">Tentar novamente</button>
          <button id="reportBtn" style="padding:8px 12px; border-radius:6px; background:#fff; border:1px solid #ccc;">Reportar</button>
        </div>
      </div>
      <script>
        (function() {
          const token = ${JSON.stringify(paypalToken || '')};
          const tryCheck = async () => {
            try {
              const res = await fetch('/api/paypal/check-order?paypalOrderId=' + encodeURIComponent(token));
              const data = await res.json();
              console.log('[PayPal return] check-order', data);
              if (data.captureError) {
                document.getElementById('title').innerText = '❗ Erro ao confirmar pagamento';
                document.getElementById('desc').innerText = 'Houve um erro ao confirmar o pagamento. Contate o suporte se o valor foi debitado.';
                document.getElementById('errorNote').style.display = 'block';
                document.getElementById('note').style.display = 'none';
                return false;
              }
              if (data.order?.status === 'completed' && data.order?.paymentStatus === 'paid') {
                document.getElementById('title').innerText = '✅ Pagamento confirmado';
                document.getElementById('desc').innerText = 'Obrigado! Seu pedido foi confirmado.';
                setTimeout(() => { window.close(); }, 2500);
                return true;
              }
              return false;
            } catch (err) {
              console.error('[PayPal return] check-order fetch error', err);
              return false;
            }
          };

          let attempts = 0;
          const maxAttempts = 12; // 12 * 2 = 24s
          const interval = setInterval(async () => {
            attempts++;
            const ok = await tryCheck();
            if (ok) {
              clearInterval(interval);
              return;
            }
            if (attempts >= maxAttempts) {
              clearInterval(interval);
              // Keep popup open to show the message and allow user to retry
            }
          }, 2000);

          document.getElementById('retryBtn').addEventListener('click', () => {
            attempts = 0; // reset
            tryCheck();
          });

          document.getElementById('reportBtn').addEventListener('click', () => {
            const supportEmail = ${JSON.stringify(process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'arafacriou@gmail.com')};
            const href = 'mailto:' + encodeURIComponent(supportEmail) + '?subject=' + encodeURIComponent('Erro PayPal') + '&body=' + encodeURIComponent('Token: ' + token);
            window.open(href);
          });
        })();
      </script>
    </body>
    </html>
    `,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    }
  );
}
