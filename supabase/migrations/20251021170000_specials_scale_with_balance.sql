CREATE OR REPLACE FUNCTION public.pick_special_product_bundle(
  p_user_id uuid,
  p_exclude_game uuid,
  p_target numeric,
  p_n integer
)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_n int := LEAST(5, GREATEST(1, COALESCE(p_n, 1)));
  v_lines numeric[];
  v_ids uuid[] := ARRAY[]::uuid[];
  v_i int;
  v_line numeric;
  v_pid uuid;
  v_balance numeric := 0;
BEGIN
  SELECT coalesce(balance, 0) INTO v_balance FROM public.wallets WHERE user_id = p_user_id;
  v_lines := public.special_bundle_amount_lines(p_target, v_n);
  FOR v_i IN 1..COALESCE(array_length(v_lines, 1), 0) LOOP
    v_line := v_lines[v_i];
    SELECT pr.id INTO v_pid
    FROM public.products pr
    WHERE pr.is_active IS TRUE AND pr.is_special IS TRUE
      AND pr.id <> ALL (COALESCE(v_ids, ARRAY[]::uuid[]))
      AND pr.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
      AND pr.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
      AND round(coalesce(pr.price, 0), 2) <= v_balance
      AND (
        v_balance >= 18000
        OR pr.name !~* '(tesla|mercedes-benz|bmw i7|audi e-tron|porsche taycan|lamborghini|ferrari|bentley continental|rolls-royce|range rover)'
      )
    ORDER BY abs(round(coalesce(pr.price, 0), 2) - v_line), random()
    LIMIT 1;
    IF v_pid IS NULL THEN
      SELECT pr.id INTO v_pid
      FROM public.products pr
      WHERE pr.is_active IS TRUE AND pr.is_special IS TRUE
        AND pr.id <> ALL (COALESCE(v_ids, ARRAY[]::uuid[]))
        AND pr.id NOT IN (SELECT public.special_product_ids_in_use(p_exclude_game))
        AND pr.id NOT IN (SELECT public.special_product_ids_issued_to_user(p_user_id, p_exclude_game))
        AND (
          v_balance >= 18000
          OR pr.name !~* '(tesla|mercedes-benz|bmw i7|audi e-tron|porsche taycan|lamborghini|ferrari|bentley continental|rolls-royce|range rover)'
        )
      ORDER BY pr.price, random()
      LIMIT 1;
    END IF;
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'No special products available for bundle (need % items)', v_n;
    END IF;
    v_ids := array_append(v_ids, v_pid);
  END LOOP;
  RETURN v_ids;
END;
$function$;
