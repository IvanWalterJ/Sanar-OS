/**
 * GET /api/cron/monthly-reset
 *
 * Cron de Vercel que resetea la quota mensual de TODOS los usuarios cuyo
 * periodo vencio. Se programa en vercel.json:
 *
 *   { "crons": [{ "path": "/api/cron/monthly-reset", "schedule": "0 3 * * *" }] }
 *
 * Schedule recomendado: diario a las 3am UTC. La funcion es idempotente ·
 * si nadie tiene quota vencida, no hace nada. Si la corriera mas seguido
 * tampoco rompe (el RPC tiene la verificacion adentro).
 *
 * Auth: Vercel manda automaticamente el header `Authorization: Bearer <CRON_SECRET>`
 * a las rutas /api/cron/* si se configura CRON_SECRET en el dashboard.
 */

import { getAdminClient } from '../_lib/credits-server';

export default async function handler(req: any, res: any) {
  // Vercel Cron auth: rechaza requests no-cron si CRON_SECRET esta configurado
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
  }

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc('monthly_reset_all');

    if (error) {
      console.error('[cron/monthly-reset] failed', error);
      return res.status(500).json({ error: error.message });
    }

    const count = typeof data === 'number' ? data : 0;
    console.log(`[cron/monthly-reset] resetted ${count} users`);
    return res.status(200).json({ ok: true, resetCount: count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
