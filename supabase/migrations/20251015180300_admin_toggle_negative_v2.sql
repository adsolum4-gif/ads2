CREATE OR REPLACE FUNCTION public.admin_toggle_negative_user(p_id uuid, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.negative_users%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO v_row FROM public.negative_users WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Negative user not found'; END IF;

  IF p_active THEN
    UPDATE public.negative_users
      SET is_active = true, products_hit = 0, held_amount = 0, hold_applied = false
      WHERE id = p_id
      RETURNING * INTO v_row;
    IF coalesce(v_row.scheduled_for_next_reset, false) IS NOT TRUE THEN
      BEGIN
        v_row := public.negative_user_activate_window(v_row.user_id);
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  ELSE
    IF v_row.is_active IS TRUE AND coalesce(v_row.held_amount, 0) <> 0 THEN
      UPDATE public.wallets
        SET on_hold = coalesce(on_hold, 0) + v_row.held_amount, updated_at = now()
        WHERE user_id = v_row.user_id;
    END IF;
    UPDATE public.negative_users
      SET is_active = false, held_amount = 0, products_hit = 0, hold_applied = false
      WHERE id = p_id
      RETURNING * INTO v_row;
  END IF;
  RETURN to_jsonb(v_row);
END;
$function$;
