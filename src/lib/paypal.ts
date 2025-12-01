/**
 * PayPal SDK Configuration
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */

const PAYPAL_API_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;

/**
 * Gera access token do PayPal
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials not configured (PAYPAL_CLIENT_ID/SECRET)');
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Cria uma ordem no PayPal
 */
export async function createPayPalOrder(
  amount: number,
  currency: string = 'USD',
  appUrlOverride?: string
) {
  const accessToken = await getPayPalAccessToken();

  // URL base da aplicação — use explicit override from server if provided (useful for local dev)
  const APP_URL =
    appUrlOverride ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://arafacriou.com.br';

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'A Rafa Criou',
        locale: 'pt-BR',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${APP_URL}/api/paypal/return`, // URL após aprovação
        cancel_url: `${APP_URL}/carrinho`, // URL se cancelar
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`PayPal order creation failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Captura um pagamento PayPal (finaliza a transação)
 */
export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    const err = new Error('PayPal capture failed');
    try {
      // Attach the raw payload so caller can inspect details (using a typed interface to avoid `any`)
      interface PayPalError extends Error {
        payload?: unknown;
      }
      (err as unknown as PayPalError).payload = error;
    } catch (e) {
      // fallback - ignore
    }
    throw err;
  }

  return response.json();
}

/**
 * Verifica detalhes de uma ordem PayPal
 */
export async function getPayPalOrderDetails(orderId: string) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to get PayPal order details: ${JSON.stringify(error)}`);
  }

  return response.json();
}
