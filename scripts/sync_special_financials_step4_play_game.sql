-- Run after updated step1 + step2. Marks negative-user slot complete when submitting a graduated pending task.

CREATE OR REPLACE FUNCTION public.play_game(p_rating_score integer, p_comment text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_hold numeric := 0;
  v_sponsor uuid;
  v_sponsor_pct numeric;
  v_sponsor_bonus numeric;
  v_ref_username text;
  v_done int;
  v_total int;
  v_sets_allowed int;
  v_slot_hit boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT coalesce(on_hold, 0) INTO v_hold FROM public.wallets WHERE user_id = v_uid;
  IF v_hold <= -0.01 THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  PERFORM public.ensure_current_game();
  SELECT * INTO v_game FROM public.games WHERE user_id = v_uid AND pending = true ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No pending task'; END IF;

  SELECT coalesce(on_hold, 0) INTO v_hold FROM public.wallets WHERE user_id = v_uid;
  IF v_hold <= -0.01 THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  SELECT coalesce(current_number_count, 0) INTO v_done FROM public.profiles WHERE id = v_uid;

  SELECT EXISTS (
    SELECT 1 FROM public.negative_users nu
    WHERE nu.user_id = v_uid
      AND nu.is_active IS TRUE
      AND coalesce(nu.products_hit, 0) < 1
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(nu.appearance_slots, '[]'::jsonb)) s(val)
        WHERE COALESCE((s.val #>> '{}')::int, (s.val->>'n')::int) = v_done + 1
      )
  ) INTO v_slot_hit;

  UPDATE public.games
    SET pending = false, rating_score = p_rating_score, comment = coalesce(p_comment, ''), updated_at = now()
    WHERE id = v_game.id;

  IF coalesce(v_game.special_product, false) IS TRUE OR v_slot_hit THEN
    UPDATE public.negative_users
      SET products_hit = 1,
          hold_applied = false,
          held_amount = 0
      WHERE user_id = v_uid AND is_active IS TRUE;
  END IF;

  UPDATE public.profiles
    SET current_number_count = current_number_count + 1,
        total_games_played = total_games_played + 1,
        today_profit = today_profit + v_game.commission
    WHERE id = v_uid;

  SELECT current_number_count, total_number_can_play
    INTO v_done, v_total
  FROM public.profiles
  WHERE id = v_uid;
  IF coalesce(v_total, 0) > 0 AND coalesce(v_done, 0) >= v_total THEN
    v_sets_allowed := public.user_review_sets_allowed(v_uid);
    UPDATE public.profiles
      SET review_sets_completed = LEAST(coalesce(review_sets_completed, 0) + 1, GREATEST(v_sets_allowed, 1))
      WHERE id = v_uid
        AND coalesce(review_sets_completed, 0) < GREATEST(v_sets_allowed, 1);
  END IF;

  UPDATE public.wallets
    SET commission = coalesce(commission, 0) + v_game.commission,
        balance = coalesce(balance, 0) + v_game.commission,
        salary = coalesce(salary, 0) + v_game.commission,
        updated_at = now()
    WHERE user_id = v_uid;

  SELECT p.referred_by, p.username
    INTO v_sponsor, v_ref_username
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_sponsor IS NOT NULL AND coalesce(v_game.commission, 0) > 0 THEN
    SELECT coalesce(s.percentage_of_sponsors, 0) INTO v_sponsor_pct FROM public.settings s WHERE s.id = 1;
    v_sponsor_bonus := round(v_game.commission * v_sponsor_pct / 100.0, 2);
    IF v_sponsor_bonus > 0 THEN
      UPDATE public.profiles
        SET today_profit = coalesce(today_profit, 0) + v_sponsor_bonus
        WHERE id = v_sponsor;
      UPDATE public.wallets
        SET balance = coalesce(balance, 0) + v_sponsor_bonus,
            commission = coalesce(commission, 0) + v_sponsor_bonus,
            salary = coalesce(salary, 0) + v_sponsor_bonus,
            referral_earnings = coalesce(referral_earnings, 0) + v_sponsor_bonus,
            updated_at = now()
        WHERE user_id = v_sponsor;
      INSERT INTO public.notifications (user_id, title, message, is_read)
      VALUES (
        v_sponsor,
        'Referral earnings',
        format(
          'You earned $%s referral bonus (%s%% of $%s) from %s''s product submission.',
          trim(to_char(v_sponsor_bonus, 'FM999999990.00')),
          trim(to_char(v_sponsor_pct, 'FM999990.##')),
          trim(to_char(v_game.commission, 'FM999999990.00')),
          coalesce(v_ref_username, 'your referral')
        ),
        false
      );
    END IF;
  END IF;

  BEGIN
    RETURN public.ensure_current_game();
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'id', v_game.id, 'pending', false, 'amount', v_game.amount, 'commission', v_game.commission,
      'special_product', v_game.special_product, 'penalty_hold', v_game.penalty_hold, 'products', '[]'::jsonb
    );
  END;
END;
$function$;
