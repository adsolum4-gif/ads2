CREATE OR REPLACE FUNCTION public.admin_clear_user_on_hold(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_prev numeric;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'Select a user'; END IF;

  SELECT p.username, coalesce(w.on_hold, 0) INTO v_username, v_prev
  FROM public.profiles p
  JOIN public.wallets w ON w.user_id = p.id
  WHERE p.id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;

  UPDATE public.wallets SET on_hold = 0, updated_at = now() WHERE user_id = p_user_id;

  UPDATE public.negative_users
    SET held_amount = 0, hold_applied = false
  WHERE user_id = p_user_id;

  DELETE FROM public.game_products
  WHERE game_id IN (SELECT id FROM public.games WHERE user_id = p_user_id AND pending IS TRUE);

  DELETE FROM public.games WHERE user_id = p_user_id AND pending IS TRUE;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'username', v_username,
    'previous_on_hold', v_prev,
    'on_hold', 0
  );
END;
$function$;
