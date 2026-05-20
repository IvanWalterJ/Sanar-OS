/**
 * featureFlags.ts — Flags de feature globales del frontend.
 *
 * Source of truth: variables de entorno con prefijo VITE_ (Vite las inyecta
 * en build). Semantica consistente con los flags del backend para evitar
 * confusion entre ON/OFF:
 *
 *   - Si la env vale exactamente la string 'false' → flag OFF
 *   - Cualquier otro valor o ausencia → flag ON (default visible/activo)
 *
 * Asi alcanza con setear VITE_CREDITS_ENABLED=false en Vercel para apagar la
 * UI de creditos, y para reactivarla basta con borrar la var o ponerla en
 * 'true'.
 */

export const CREDITS_ENABLED: boolean =
  import.meta.env.VITE_CREDITS_ENABLED !== 'false';
