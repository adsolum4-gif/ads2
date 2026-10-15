-- Balance-based VIP tier for commission + Silver (VIP 3) at 1.5%
CREATE OR REPLACE FUNCTION public.resolve_user_pack(p_user_id uuid)
 RETURNS public.packs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_assigned public.packs%ROWTYPE;
  v_eligible public.packs%ROWTYPE;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    SELECT * INTO v_assigned FROM public.packs WHERE coalesce(is_active, true) ORDER BY usd_value ASC NULLS LAST LIMIT 1;
    RETURN v_assigned;
  END IF;

  IF v_wallet.package_id IS NOT NULL THEN
    SELECT * INTO v_assigned FROM public.packs WHERE id = v_wallet.package_id;
  END IF;

  SELECT * INTO v_eligible
  FROM public.packs
  WHERE coalesce(is_active, true)
    AND coalesce(usd_value, 0) <= coalesce(v_wallet.balance, 0)
  ORDER BY usd_value DESC
  LIMIT 1;

  IF v_eligible.id IS NOT NULL
     AND (v_assigned.id IS NULL OR v_eligible.usd_value > v_assigned.usd_value) THEN
    UPDATE public.wallets
      SET package_id = v_eligible.id, updated_at = now()
      WHERE user_id = p_user_id;
    UPDATE public.profiles
      SET total_number_can_play = v_eligible.daily_missions
      WHERE id = p_user_id;
    RETURN v_eligible;
  END IF;

  IF v_assigned.id IS NOT NULL THEN
    RETURN v_assigned;
  END IF;

  RETURN v_eligible;
END;
$function$;

UPDATE public.packs
SET profit_percentage = 1.5,
    description = replace(coalesce(description, ''), E'1.00% product commission', E'1.50% product commission')
WHERE name = 'VIP 3'
  AND coalesce(profit_percentage, 0) <> 1.5;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id
    FROM public.games
    WHERE pending IS TRUE AND coalesce(special_product, false) IS NOT TRUE
  LOOP
    PERFORM public.resolve_user_pack(r.user_id);
  END LOOP;
END $$;

UPDATE public.games g
SET commission = round(g.amount * coalesce(pk.profit_percentage, 0.5) / 100.0, 2)
FROM public.wallets w
JOIN public.packs pk ON pk.id = w.package_id
WHERE g.user_id = w.user_id
  AND g.pending IS TRUE
  AND coalesce(g.special_product, false) IS NOT TRUE;
