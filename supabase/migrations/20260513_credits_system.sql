-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration: Sistema de creditos para generacion de imagenes
--
-- Modelo:
--   1 credito = 1 imagen generada (cualquier calidad)
--   monthly_quota:  creditos incluidos en la suscripcion · resetean cada mes
--   topup_balance:  creditos comprados con PayPal · NO expiran
--   Decremento: primero gasta topup_balance, luego monthly_quota_remaining
--     (asi los pagos no se "queman" si todavia hay quota gratis)
--
-- Estado de pago / pack / orden PayPal: todo se guarda en paypal_orders para
-- auditoria, idempotencia del webhook, y disputas.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Tabla: credit_packs ─────────────────────────────────────────────────────
-- Catalogo de packs comprables (administrable, no hardcoded en codigo)
CREATE TABLE IF NOT EXISTS credit_packs (
  id            TEXT PRIMARY KEY,           -- 'pack_50', 'pack_100', 'pack_250'
  label         TEXT NOT NULL,              -- 'Pack 50 creditos'
  credits       INTEGER NOT NULL CHECK (credits > 0),
  price_usd     NUMERIC(10,2) NOT NULL CHECK (price_usd > 0),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario logueado puede leer packs activos (para mostrar la tienda)
CREATE POLICY "credit_packs_select_active"
  ON credit_packs FOR SELECT
  TO authenticated
  USING (active = TRUE);

-- Solo admin puede modificar packs
CREATE POLICY "credit_packs_admin_all"
  ON credit_packs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

-- Seed de packs iniciales (placeholder · ajustar precios cuando estén definidos)
INSERT INTO credit_packs (id, label, credits, price_usd, sort_order) VALUES
  ('pack_50',  'Pack 50 créditos',  50,   9.90, 1),
  ('pack_100', 'Pack 100 créditos', 100, 17.90, 2),
  ('pack_250', 'Pack 250 créditos', 250, 39.90, 3)
ON CONFLICT (id) DO NOTHING;


-- ─── Tabla: user_credits ─────────────────────────────────────────────────────
-- Balance actual de cada usuario. Una fila por usuario.
CREATE TABLE IF NOT EXISTS user_credits (
  user_id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_quota              INTEGER NOT NULL DEFAULT 150,  -- quota incluida en el plan
  monthly_quota_remaining    INTEGER NOT NULL DEFAULT 150,  -- restante del mes
  topup_balance              INTEGER NOT NULL DEFAULT 0,    -- comprados, no expiran
  quota_period_start         DATE NOT NULL DEFAULT CURRENT_DATE,
  quota_period_end           DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month')::DATE,
  total_consumed_lifetime    INTEGER NOT NULL DEFAULT 0,    -- analytics
  total_purchased_lifetime   INTEGER NOT NULL DEFAULT 0,    -- analytics
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (monthly_quota_remaining >= 0),
  CHECK (topup_balance >= 0)
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_credits_select_own"
  ON user_credits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_credits_admin_all"
  ON user_credits FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE INDEX idx_user_credits_period_end ON user_credits(quota_period_end);


-- ─── Tabla: credit_transactions ──────────────────────────────────────────────
-- Log inmutable de TODO movimiento de creditos (auditoria, disputas, analytics)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta               INTEGER NOT NULL,    -- positivo = suma, negativo = consumo
  source              TEXT NOT NULL CHECK (source IN (
    'monthly_reset',     -- reseteo mensual de quota
    'monthly_quota',     -- consumo contra quota mensual
    'topup_consume',     -- consumo contra creditos comprados
    'purchase',          -- compra PayPal acreditada
    'admin_grant',       -- ajuste manual del admin (regalo, compensacion)
    'admin_revoke',      -- ajuste manual del admin (penalizacion, error)
    'refund'             -- reverso de compra
  )),
  reason              TEXT,                -- detalle libre
  paypal_order_id     TEXT,                -- linkea a paypal_orders cuando aplica
  pack_id             TEXT REFERENCES credit_packs(id),
  metadata            JSONB,               -- snapshot de quality/format/promptHash si fue consumo
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_transactions_select_own"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "credit_transactions_admin_all"
  ON credit_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE INDEX idx_credit_tx_user_date ON credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credit_tx_paypal ON credit_transactions(paypal_order_id) WHERE paypal_order_id IS NOT NULL;


-- ─── Tabla: paypal_orders ────────────────────────────────────────────────────
-- Tracking de ordenes PayPal · idempotencia + auditoria + reconciliacion
CREATE TABLE IF NOT EXISTS paypal_orders (
  id                   TEXT PRIMARY KEY,         -- orderId que devuelve PayPal
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id              TEXT NOT NULL REFERENCES credit_packs(id),
  credits              INTEGER NOT NULL,         -- snapshot del pack al momento de compra
  amount_usd           NUMERIC(10,2) NOT NULL,   -- snapshot del precio
  status               TEXT NOT NULL CHECK (status IN (
    'created',     -- order creada en PayPal, esperando aprobacion del user
    'approved',    -- user aprobo, esperando capture
    'captured',    -- pagado y creditos otorgados
    'failed',      -- error en capture
    'refunded',    -- reembolsado
    'voided'       -- cancelado antes de capture
  )),
  paypal_capture_id    TEXT,                     -- payment capture id de PayPal
  paypal_payer_email   TEXT,
  raw_capture_response JSONB,                    -- respuesta completa para debug
  webhook_event_ids    TEXT[],                   -- lista de event_ids procesados (idempotencia)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_at          TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE paypal_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "paypal_orders_select_own"
  ON paypal_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "paypal_orders_admin_all"
  ON paypal_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'));

CREATE INDEX idx_paypal_orders_user ON paypal_orders(user_id, created_at DESC);
CREATE INDEX idx_paypal_orders_status ON paypal_orders(status);


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPCs (server-side, SECURITY DEFINER · gating siempre en SQL, no en el cliente)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── RPC: ensure_user_credits_row ────────────────────────────────────────────
-- Crea la fila de user_credits si no existe. Idempotente. Llamada al login.
CREATE OR REPLACE FUNCTION ensure_user_credits_row(p_user_id UUID)
RETURNS user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row user_credits;
BEGIN
  INSERT INTO user_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM user_credits WHERE user_id = p_user_id;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_user_credits_row(UUID) TO authenticated;


-- ─── RPC: consume_credit ─────────────────────────────────────────────────────
-- Descuenta 1 credito de manera atomica. Devuelve nuevo balance o lanza error.
-- Prioridad: gasta primero topup_balance, despues monthly_quota_remaining.
CREATE OR REPLACE FUNCTION consume_credit(
  p_user_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  monthly_quota_remaining INTEGER,
  topup_balance INTEGER,
  source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row user_credits;
  v_source TEXT;
BEGIN
  -- Lock de fila durante la transaccion para evitar race conditions
  SELECT * INTO v_row FROM user_credits WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-crear con quota default si no existe
    INSERT INTO user_credits (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO v_row FROM user_credits WHERE user_id = p_user_id FOR UPDATE;
  END IF;

  -- Auto-reset de quota mensual si vencio
  IF v_row.quota_period_end <= CURRENT_DATE THEN
    UPDATE user_credits SET
      monthly_quota_remaining = monthly_quota,
      quota_period_start = CURRENT_DATE,
      quota_period_end = (CURRENT_DATE + INTERVAL '1 month')::DATE,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;

    INSERT INTO credit_transactions (user_id, delta, source, reason)
    VALUES (p_user_id, v_row.monthly_quota, 'monthly_reset', 'Auto-reset on consume');
  END IF;

  -- Gasta primero topup, luego quota mensual
  IF v_row.topup_balance > 0 THEN
    UPDATE user_credits SET
      topup_balance = topup_balance - 1,
      total_consumed_lifetime = total_consumed_lifetime + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;
    v_source := 'topup_consume';
  ELSIF v_row.monthly_quota_remaining > 0 THEN
    UPDATE user_credits SET
      monthly_quota_remaining = monthly_quota_remaining - 1,
      total_consumed_lifetime = total_consumed_lifetime + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;
    v_source := 'monthly_quota';
  ELSE
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING HINT = 'El usuario no tiene creditos disponibles';
  END IF;

  INSERT INTO credit_transactions (user_id, delta, source, metadata)
  VALUES (p_user_id, -1, v_source, p_metadata);

  RETURN QUERY SELECT v_row.monthly_quota_remaining, v_row.topup_balance, v_source;
END;
$$;

GRANT EXECUTE ON FUNCTION consume_credit(UUID, JSONB) TO authenticated;


-- ─── RPC: grant_credits (interno · usado por el webhook PayPal y admin) ──────
-- Suma creditos al topup_balance. Idempotente sobre paypal_order_id.
CREATE OR REPLACE FUNCTION grant_credits(
  p_user_id UUID,
  p_credits INTEGER,
  p_source TEXT,
  p_paypal_order_id TEXT DEFAULT NULL,
  p_pack_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row user_credits;
  v_existing INTEGER;
BEGIN
  IF p_credits <= 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS' USING HINT = 'Cantidad debe ser positiva';
  END IF;

  -- Idempotencia: si ya se proceso esta order, devolver fila actual sin sumar
  IF p_paypal_order_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_existing
    FROM credit_transactions
    WHERE paypal_order_id = p_paypal_order_id AND source = 'purchase';

    IF v_existing > 0 THEN
      SELECT * INTO v_row FROM user_credits WHERE user_id = p_user_id;
      RETURN v_row;
    END IF;
  END IF;

  -- Lock + actualizar
  INSERT INTO user_credits (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE user_credits SET
    topup_balance = topup_balance + p_credits,
    total_purchased_lifetime = total_purchased_lifetime
      + CASE WHEN p_source = 'purchase' THEN p_credits ELSE 0 END,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  INSERT INTO credit_transactions (
    user_id, delta, source, reason, paypal_order_id, pack_id
  ) VALUES (
    p_user_id, p_credits, p_source, p_reason, p_paypal_order_id, p_pack_id
  );

  RETURN v_row;
END;
$$;

-- NOTA: NO se otorga EXECUTE a authenticated · solo se llama desde el server
-- (service_role en la API route del webhook PayPal y desde el admin panel via RPC).
REVOKE EXECUTE ON FUNCTION grant_credits FROM PUBLIC;
GRANT EXECUTE ON FUNCTION grant_credits TO service_role;


-- ─── RPC: admin_adjust_credits ───────────────────────────────────────────────
-- Permite al admin sumar o restar creditos manualmente desde el panel.
CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_user_id UUID,
  p_delta INTEGER,
  p_reason TEXT
)
RETURNS user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row user_credits;
  v_is_admin BOOLEAN;
BEGIN
  -- Verificar que el caller es admin
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING HINT = 'Solo admin puede ajustar creditos';
  END IF;

  INSERT INTO user_credits (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_delta >= 0 THEN
    UPDATE user_credits SET
      topup_balance = topup_balance + p_delta,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;
  ELSE
    -- Restar: primero de topup, despues de quota
    UPDATE user_credits SET
      topup_balance = GREATEST(0, topup_balance + p_delta),
      monthly_quota_remaining = CASE
        WHEN topup_balance + p_delta < 0
        THEN GREATEST(0, monthly_quota_remaining + (topup_balance + p_delta))
        ELSE monthly_quota_remaining
      END,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_row;
  END IF;

  INSERT INTO credit_transactions (user_id, delta, source, reason)
  VALUES (
    p_user_id,
    p_delta,
    CASE WHEN p_delta >= 0 THEN 'admin_grant' ELSE 'admin_revoke' END,
    p_reason
  );

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_adjust_credits(UUID, INTEGER, TEXT) TO authenticated;


-- ─── RPC: admin_set_monthly_quota ────────────────────────────────────────────
-- Permite al admin cambiar la quota mensual de un cliente especifico
-- (ej: cliente VIP con 300/mes en vez del default 150).
CREATE OR REPLACE FUNCTION admin_set_monthly_quota(
  p_user_id UUID,
  p_new_quota INTEGER
)
RETURNS user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row user_credits;
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF p_new_quota < 0 THEN
    RAISE EXCEPTION 'INVALID_QUOTA';
  END IF;

  INSERT INTO user_credits (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE user_credits SET
    monthly_quota = p_new_quota,
    -- Si bajamos la quota y el restante actual supera la nueva, capear
    monthly_quota_remaining = LEAST(monthly_quota_remaining, p_new_quota),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_row;

  INSERT INTO credit_transactions (user_id, delta, source, reason)
  VALUES (p_user_id, 0, 'admin_grant',
    'Quota mensual ajustada a ' || p_new_quota::TEXT);

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_monthly_quota(UUID, INTEGER) TO authenticated;


-- ─── RPC: monthly_reset_all (ejecutado por cron de Supabase / Vercel) ────────
-- Resetea quota de TODOS los usuarios cuyo periodo vencio.
-- Idempotente: si ya reseteo hoy, no hace nada.
CREATE OR REPLACE FUNCTION monthly_reset_all()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT user_id, monthly_quota
    FROM user_credits
    WHERE quota_period_end <= CURRENT_DATE
  LOOP
    UPDATE user_credits SET
      monthly_quota_remaining = monthly_quota,
      quota_period_start = CURRENT_DATE,
      quota_period_end = (CURRENT_DATE + INTERVAL '1 month')::DATE,
      updated_at = NOW()
    WHERE user_id = v_row.user_id;

    INSERT INTO credit_transactions (user_id, delta, source, reason)
    VALUES (v_row.user_id, v_row.monthly_quota, 'monthly_reset', 'Cron mensual');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION monthly_reset_all FROM PUBLIC;
GRANT EXECUTE ON FUNCTION monthly_reset_all TO service_role;


-- ─── Trigger: bootstrap user_credits al crear profile ────────────────────────
-- Asegura que cada usuario tenga su fila desde el momento del invite.
CREATE OR REPLACE FUNCTION trg_bootstrap_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_credits (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bootstrap_credits ON profiles;
CREATE TRIGGER trg_bootstrap_credits
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trg_bootstrap_user_credits();

-- Backfill: crear fila para todos los usuarios existentes
INSERT INTO user_credits (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
