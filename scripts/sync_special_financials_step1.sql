-- Run this FIRST in Supabase SQL editor (creates function + fixes Learntodoit111)

-- After deposit or ensure_current_game, align penalty_hold with balance; uncleared special only when money still owed.

-- Recompute penalty_hold from balance vs pending special catalog sum; clear negative-user hold flags when paid up.

CREATE OR REPLACE FUNCTION public.sync_pending_special_financials(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_game public.games%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_pack public.packs%ROWTYPE;
  v_total numeric := 0;
  v_shortfall numeric := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_game
  FROM public.games
  WHERE user_id = p_user_id
    AND pending IS TRUE
    AND coalesce(special_product, false) IS TRUE
  ORDER BY created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_total
  FROM public.game_products gp
  JOIN public.products pr ON pr.id = gp.product_id
  WHERE gp.game_id = v_game.id;

  IF v_total <= 0 THEN
    v_total := round(coalesce(v_game.amount, 0), 2);
  END IF;

  v_shortfall := GREATEST(round(v_total - coalesce(v_wallet.balance, 0), 2), 0);

  -- Fully funded, or wallet hold cleared via confirmed deposits (top-up flow complete).
  IF (v_shortfall <= 0.009 OR coalesce(v_wallet.on_hold, 0) >= -0.009)
     AND coalesce(v_wallet.on_hold, 0) >= -0.009 THEN
    SELECT * INTO v_pack FROM public.resolve_user_pack(p_user_id);
    UPDATE public.games
    SET penalty_hold = 0,
        special_product = false,
        amount = CASE WHEN v_total > 0 THEN v_total ELSE amount END,
        commission = CASE
          WHEN v_total > 0 THEN round(v_total * coalesce(v_pack.profit_percentage, 0.5) / 100.0, 2)
          ELSE commission
        END
    WHERE id = v_game.id;
    UPDATE public.negative_users
    SET held_amount = 0,
        hold_applied = false
    WHERE user_id = p_user_id
      AND is_active IS TRUE;
  ELSE
    UPDATE public.games
    SET penalty_hold = v_shortfall,
        amount = CASE WHEN v_total > 0 THEN v_total ELSE amount END
    WHERE id = v_game.id;
  END IF;
END;
$function$;


-- One-time repair for stuck accounts (safe to re-run)
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM public.profiles WHERE username ILIKE 'Learntodoit111' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    PERFORM public.sync_pending_special_financials(v_uid);
  END IF;
END $$;
