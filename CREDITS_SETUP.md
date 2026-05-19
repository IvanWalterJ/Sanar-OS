# Sistema de créditos + PayPal — Setup

Estructura completa del sistema de créditos para generación de imágenes con compra automática vía PayPal.

## Modelo de créditos

- **1 crédito = 1 imagen generada** (cualquier calidad: low/medium/high)
- **Quota mensual** (default 150): incluida en la suscripción · resetea cada mes
- **Topup balance**: créditos comprados con PayPal · **NO expiran**
- **Prioridad de consumo**: gasta primero topup, luego quota mensual (así los pagos no se "queman" al fin de mes)

## Costos OpenAI (referencia interna)

| Calidad | Costo/img | Notas |
|---------|-----------|-------|
| Baja    | ~$0.006   | Borradores |
| **Media** ⭐ | ~$0.053 | Default · usado por defecto en el cliente |
| Alta    | ~$0.211   | Texto denso, assets premium |

Costo real por cliente asumiendo Media:
- 100 img/mes → **$5.30**
- 150 img/mes → **$7.95**

Packs sugeridos en la DB (ajustables desde `credit_packs`):
- 50 créditos / $9.90
- 100 créditos / $17.90
- 250 créditos / $39.90

## Aplicar la migración

```bash
# Desde Supabase CLI o el SQL editor del dashboard
supabase/migrations/20260513_credits_system.sql
```

La migración:
1. Crea tablas: `credit_packs`, `user_credits`, `credit_transactions`, `paypal_orders`
2. Seedea 3 packs default (ajustar precios cuando se decidan los finales)
3. Crea RPCs: `consume_credit`, `grant_credits`, `admin_adjust_credits`, `admin_set_monthly_quota`, `monthly_reset_all`, `ensure_user_credits_row`
4. Trigger que crea fila `user_credits` automáticamente al crear `profiles`
5. Backfill para usuarios existentes

## Variables de entorno

### Frontend (`.env` o Vercel dashboard)

```
VITE_PAYPAL_CLIENT_ID=Aab...      # del PayPal Developer Dashboard
VITE_PAYPAL_ENV=sandbox            # 'sandbox' | 'live'
```

### Backend / API routes (Vercel dashboard solamente · nunca exponer)

```
PAYPAL_CLIENT_ID=Aab...
PAYPAL_CLIENT_SECRET=EAb...
PAYPAL_ENV=sandbox                 # 'sandbox' | 'live'
PAYPAL_WEBHOOK_ID=WH-...            # del webhook configurado en PayPal Developer

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # CRITICAL · solo en server-side

OPENAI_API_KEY=sk-...               # ya existente

CREDITS_ENABLED=true                # 'false' = bypass (solo dev local)
CRON_SECRET=...                     # random string para auth de Vercel Cron
```

### Setup en PayPal Developer Dashboard

1. Crear app en https://developer.paypal.com/dashboard/applications
2. Copiar Client ID y Secret (sandbox primero, después live)
3. Crear un Webhook apuntando a `https://tu-dominio.com/api/payments/paypal/webhook`
4. Suscribirse a estos eventos:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`
5. Copiar el Webhook ID → `PAYPAL_WEBHOOK_ID`

## API Routes

| Ruta | Método | Auth | Propósito |
|------|--------|------|-----------|
| `/api/ai/image` | POST | JWT Supabase | Genera imagen + consume 1 crédito (atómico) |
| `/api/payments/paypal/create-order` | POST | JWT Supabase | Crea orden PayPal para un pack |
| `/api/payments/paypal/capture-order` | POST | JWT Supabase | Captura pago y acredita créditos |
| `/api/payments/paypal/webhook` | POST | PayPal signature | Red de seguridad para capturas |
| `/api/cron/monthly-reset` | GET | CRON_SECRET | Resetea quota mensual de todos |

## Frontend integration

```tsx
// CreditsBadge: muestra balance + abre modal de compra al click
import { CreditsBadge } from './components/credits';
<CreditsBadge userId={profile.id} />

// Hook para usar el balance en cualquier componente
import { useCreditsBalance } from './components/credits';
const { balance, refresh } = useCreditsBalance(userId);
// balance.total, balance.isLow, balance.isEmpty

// Admin panel
import AdminCreditsPanel from './components/admin/AdminCreditsPanel';
<AdminCreditsPanel clienteId={clienteId} clienteNombre={nombre} />
```

## Flujo de compra (paso a paso)

1. Usuario click en `CreditsBadge` → abre `BuyCreditsModal`
2. Selecciona pack → SDK PayPal se carga on-demand
3. `createOrder` → POST `/api/payments/paypal/create-order` con `packId`
4. Server valida pack, calcula precio canónico, crea orden en PayPal, persiste en `paypal_orders` con status='created'
5. PayPal popup abre, usuario aprueba
6. `onApprove` → POST `/api/payments/paypal/capture-order` con `orderId`
7. Server captura en PayPal, verifica amount+currency contra snapshot, RPC `grant_credits` (idempotente), update status='captured'
8. Toast success + balance refresca automáticamente vía Supabase Realtime
9. **Red de seguridad**: el webhook PayPal procesa el mismo evento de manera independiente. `grant_credits` es idempotente sobre `paypal_order_id`, así que doble proceso no duplica.

## Anti-fraude (chequeos del server)

- Precio del pack viene del server (lectura de `credit_packs`), **nunca del cliente**
- Verificación de `amount.value` y `currency_code` después de capture
- Verificación de `purchase_units[0].custom_id === userId:packId`
- Idempotencia sobre `paypal_order_id` en `grant_credits`
- Firma del webhook validada contra `PAYPAL_WEBHOOK_ID`
- `paypal_orders.user_id` se verifica antes de capturar

## Testing

```bash
# 1. Aplicar migración en Supabase de staging
# 2. Setear env vars de SANDBOX
# 3. Crear cuenta de comprador sandbox en PayPal Developer
# 4. Probar el flujo completo:

#    a. Login como cliente
#    b. Generar imagen → confirmar que decrementa balance
#    c. Comprar pack más chico con cuenta sandbox
#    d. Confirmar balance suma en realtime
#    e. Ver historial en CreditsHistory

# 5. Manualmente forzar reset mensual (admin):
curl -X GET https://tu-dominio.vercel.app/api/cron/monthly-reset \
  -H "Authorization: Bearer $CRON_SECRET"
```

## TODOs cuando los precios finales estén definidos

- [ ] Actualizar precios en seed de `credit_packs` (línea ~50 de la migración) o vía admin panel
- [ ] Decidir quota mensual final (currently 150 default · cambia con `admin_set_monthly_quota` o ALTER del default)
- [ ] Crear app **live** en PayPal Developer y rotar env vars
- [ ] Configurar webhook **live** apuntando a producción
- [ ] Setear `PAYPAL_ENV=live` y `VITE_PAYPAL_ENV=live` en Vercel
- [ ] Verificar que `CREDITS_ENABLED=true` en producción
