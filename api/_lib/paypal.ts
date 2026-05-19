/**
 * paypal.ts — Cliente PayPal Orders API v2 para uso server-side.
 *
 * Env vars requeridas:
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_ENV            = 'sandbox' | 'live'  (default: sandbox)
 *   PAYPAL_WEBHOOK_ID     = id del webhook configurado en PayPal Developer
 *
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 */

const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com',
} as const;

function getEnv(): 'sandbox' | 'live' {
  const v = process.env.PAYPAL_ENV;
  return v === 'live' ? 'live' : 'sandbox';
}

export function getPayPalBaseUrl(): string {
  return PAYPAL_API_BASE[getEnv()];
}

// Cache del access_token de PayPal · vive ~9h, cacheamos 8h.
let _tokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Obtiene un access_token OAuth2 de PayPal (Client Credentials grant).
 * Cachea el token hasta que expire (con margen).
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET no configurados');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const resp = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PayPal OAuth fallo (${resp.status}): ${text.slice(0, 200)}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  _tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in * 1000) - 60_000,
  };
  return data.access_token;
}

// ─── Orders API ──────────────────────────────────────────────────────────────

export interface CreateOrderInput {
  amountUsd: number;
  description: string;
  customId: string;  // referencia interna (ej: userId:packId)
}

export interface PayPalOrder {
  id: string;
  status: string;
  links?: { href: string; rel: string; method: string }[];
}

export async function createOrder(input: CreateOrderInput): Promise<PayPalOrder> {
  const token = await getAccessToken();
  const resp = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: input.amountUsd.toFixed(2),
        },
        description: input.description,
        custom_id: input.customId,
      }],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        brand_name: 'Sanar OS',
      },
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PayPal createOrder fallo (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json() as Promise<PayPalOrder>;
}

export interface CaptureResult {
  id: string;
  status: string;
  payer?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
        custom_id?: string;
      }>;
    };
  }>;
}

export async function captureOrder(orderId: string): Promise<CaptureResult> {
  const token = await getAccessToken();
  const resp = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PayPal captureOrder fallo (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json() as Promise<CaptureResult>;
}

export async function getOrder(orderId: string): Promise<CaptureResult> {
  const token = await getAccessToken();
  const resp = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PayPal getOrder fallo (${resp.status}): ${text.slice(0, 300)}`);
  }
  return resp.json() as Promise<CaptureResult>;
}


// ─── Webhook signature verification ──────────────────────────────────────────

interface WebhookHeaders {
  'paypal-auth-algo': string;
  'paypal-cert-url': string;
  'paypal-transmission-id': string;
  'paypal-transmission-sig': string;
  'paypal-transmission-time': string;
}

/**
 * Verifica la firma de un webhook de PayPal contra el WEBHOOK_ID configurado.
 * Devuelve true si la firma es valida.
 * Docs: https://developer.paypal.com/api/rest/webhooks/rest/#link-verifywebhooksignature
 */
export async function verifyWebhookSignature(
  headers: WebhookHeaders,
  bodyRaw: unknown,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.warn('[paypal] PAYPAL_WEBHOOK_ID no configurado · rechazando webhook');
    return false;
  }

  const token = await getAccessToken();
  const resp = await fetch(`${getPayPalBaseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: bodyRaw,
    }),
  });

  if (!resp.ok) return false;
  const data = await resp.json() as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}

/**
 * Helper para extraer headers PayPal de un req con headers normalizados (lowercase).
 */
export function extractPayPalHeaders(headers: Record<string, string | string[] | undefined>): WebhookHeaders | null {
  const get = (key: string): string | null => {
    const v = headers[key] ?? headers[key.toLowerCase()];
    if (Array.isArray(v)) return v[0] ?? null;
    return typeof v === 'string' ? v : null;
  };
  const auth_algo = get('paypal-auth-algo');
  const cert_url = get('paypal-cert-url');
  const transmission_id = get('paypal-transmission-id');
  const transmission_sig = get('paypal-transmission-sig');
  const transmission_time = get('paypal-transmission-time');

  if (!auth_algo || !cert_url || !transmission_id || !transmission_sig || !transmission_time) {
    return null;
  }
  return {
    'paypal-auth-algo': auth_algo,
    'paypal-cert-url': cert_url,
    'paypal-transmission-id': transmission_id,
    'paypal-transmission-sig': transmission_sig,
    'paypal-transmission-time': transmission_time,
  };
}
