-- After deposit or ensure_current_game, align penalty_hold with balance.

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

CREATE OR REPLACE FUNCTION public.ensure_current_game()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_game public.games%ROWTYPE;
  v_prof public.profiles%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_pack public.packs%ROWTYPE;
  v_settings public.settings%ROWTYPE;
  v_neg public.negative_users%ROWTYPE;
  v_products jsonb;
  v_ids uuid[];
  v_amount numeric;
  v_commission numeric;
  v_special boolean := false;
  v_hold numeric := 0;
  v_count int := 0;
  v_has_game boolean := false;
  v_next int;
  v_slot boolean := false;
  v_pic int := 1;
  v_rate numeric;
  v_range_min int;
  v_range_max int;
  v_wrong_pool boolean := false;
  v_remaining numeric := 0;
  v_existing_special boolean := false;
  v_has_special_catalog boolean := false;
  v_n_specials int := 0;
  v_band_lo numeric := 0;
  v_band_hi numeric := 0;
  v_exclude_game uuid;
  v_balance numeric := 0;
  v_product_total numeric := 0;
  v_pending_uncleared_special boolean := false;
  v_freeze_pending_special boolean := false;
  v_on_hold_negative boolean := false;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.ensure_daily_reset();
  SELECT * INTO v_prof FROM public.profiles WHERE id = v_uid;
  IF NOT v_prof.is_active THEN RAISE EXCEPTION 'Account is inactive'; END IF;
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid;
  PERFORM public.sync_pending_special_financials(v_uid);
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid;
  v_balance := round(coalesce(v_wallet.balance, 0), 2);
  v_on_hold_negative := coalesce(v_wallet.on_hold, 0) <= -0.01;

  SELECT * INTO v_game FROM public.games WHERE user_id = v_uid AND pending = true ORDER BY created_at DESC LIMIT 1;
  v_has_game := FOUND;
  v_count := 0;
  IF v_has_game THEN
    SELECT count(*) INTO v_count FROM public.game_products WHERE game_id = v_game.id;
  END IF;
  v_existing_special := v_has_game AND coalesce(v_game.special_product, false) IS TRUE;
  v_pending_uncleared_special := v_on_hold_negative
    OR (v_existing_special AND coalesce(v_game.penalty_hold, 0) > 0.01);
  PERFORM public.assert_review_sets_not_exhausted(v_uid, v_prof, v_pending_uncleared_special);
  v_exclude_game := CASE WHEN v_has_game THEN v_game.id ELSE NULL END;

  IF v_on_hold_negative AND NOT v_has_game THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  SELECT * INTO v_pack FROM public.resolve_user_pack(v_uid);
  SELECT * INTO v_settings FROM public.settings WHERE id = 1;
  IF v_prof.current_number_count >= v_prof.total_number_can_play
     AND NOT v_pending_uncleared_special THEN
    RAISE EXCEPTION 'You have completed all tasks for today';
  END IF;
  IF coalesce(v_settings.minimum_balance_for_submissions, 0) > 0
     AND NOT v_prof.is_min_balance_for_submission_removed
     AND NOT v_pending_uncleared_special
     AND v_wallet.balance < v_settings.minimum_balance_for_submissions THEN
    RAISE EXCEPTION 'Minimum balance required for submissions';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.products WHERE is_active IS TRUE
  ) INTO v_has_special_catalog;

  v_next := GREATEST(coalesce(v_prof.current_number_count, 0), 0) + 1;

  SELECT * INTO v_neg
  FROM public.negative_users
  WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;

  IF FOUND AND NOT v_pending_uncleared_special AND NOT v_on_hold_negative
     AND NOT (v_has_game AND v_count > 0) THEN
    IF coalesce(v_neg.products_hit, 0) < 1 THEN
      SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(coalesce(v_neg.appearance_slots, '[]'::jsonb)) s(val)
        WHERE COALESCE((s.val #>> '{}')::int, (s.val->>'n')::int) = v_next
      ) INTO v_slot;
      IF v_slot THEN
        v_special := true;
        v_pic := LEAST(5, GREATEST(1, coalesce(v_neg.number_of_negative_products, 1)));
        v_range_min := v_neg.range_min;
        v_range_max := v_neg.range_max;
        v_band_lo := round(v_balance + coalesce(v_range_min, 0), 2);
        v_band_hi := round(v_balance + coalesce(v_range_max, 0), 2);
      END IF;
    END IF;
  END IF;

  IF v_special AND NOT v_has_special_catalog THEN
    RAISE EXCEPTION 'No active products available for special tasks';
  END IF;

  IF v_has_game THEN
    SELECT count(*) INTO v_count FROM public.game_products WHERE game_id = v_game.id;
    IF v_existing_special THEN
      v_special := true;
      IF v_neg.id IS NULL THEN
        SELECT * INTO v_neg
        FROM public.negative_users
        WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;
      END IF;
      v_pic := LEAST(5, GREATEST(1, coalesce(v_neg.number_of_negative_products, v_count, 1)));
      v_amount := round(coalesce(v_game.amount, 0), 2);
      v_hold := round(coalesce(v_game.penalty_hold, 0), 2);
      IF v_neg.id IS NOT NULL THEN
        v_range_min := v_neg.range_min;
        v_range_max := v_neg.range_max;
        v_band_lo := round(v_balance + coalesce(v_range_min, 0), 2);
        v_band_hi := round(v_balance + coalesce(v_range_max, 0), 2);
      END IF;
      IF NOT v_has_special_catalog THEN
        v_wrong_pool := true;
      END IF;
      IF v_count <> v_pic THEN
        v_wrong_pool := true;
      END IF;
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF v_product_total > 0 THEN
        v_amount := v_product_total;
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.game_products gp
        WHERE gp.game_id = v_game.id
          AND gp.product_id IN (
            SELECT public.special_product_ids_issued_to_user(v_uid, v_game.id)
          )
      ) THEN
        v_wrong_pool := true;
      END IF;
    ELSE
      IF coalesce(v_game.special_product, false) IS TRUE AND NOT v_special THEN
        v_wrong_pool := true;
      END IF;
      IF v_special THEN
        IF NOT v_has_special_catalog THEN
          v_wrong_pool := true;
        END IF;
        IF v_count <> v_pic THEN v_wrong_pool := true; END IF;
        SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
        FROM public.game_products gp
        JOIN public.products pr ON pr.id = gp.product_id
        WHERE gp.game_id = v_game.id;
        IF v_range_min IS NOT NULL AND v_range_max IS NOT NULL THEN
          v_band_lo := round(v_balance + coalesce(v_range_min, 0), 2);
          v_band_hi := round(v_balance + coalesce(v_range_max, 0), 2);
          IF v_product_total > v_band_hi + 0.01 OR v_product_total < v_band_lo - 0.01 THEN
            v_wrong_pool := true;
          END IF;
        END IF;
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM public.game_products gp
          JOIN public.products pr ON pr.id = gp.product_id
          WHERE gp.game_id = v_game.id AND pr.is_special IS TRUE
        ) INTO v_wrong_pool;
        SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
        FROM public.game_products gp
        JOIN public.products pr ON pr.id = gp.product_id
        WHERE gp.game_id = v_game.id;
        IF v_product_total > v_balance THEN
          v_wrong_pool := true;
        END IF;
        IF round(coalesce(v_game.amount, 0), 2) > v_balance THEN
          v_wrong_pool := true;
        END IF;
      END IF;
    END IF;
  END IF;

  IF v_special AND v_has_game AND v_count > 0 THEN
    IF EXISTS (
      SELECT 1 FROM public.game_products gp
      WHERE gp.game_id = v_game.id
        AND gp.product_id IN (SELECT public.special_product_ids_in_use(v_exclude_game))
    ) THEN
      v_wrong_pool := true;
    END IF;
  END IF;

  IF v_existing_special AND v_count > 0 THEN
    v_freeze_pending_special := NOT v_wrong_pool;
  END IF;

  IF v_on_hold_negative AND v_has_game AND v_count > 0 THEN
    v_freeze_pending_special := true;
  END IF;

  IF v_on_hold_negative AND NOT v_freeze_pending_special THEN
    RAISE EXCEPTION 'You have a pending transaction, please clear it to proceed.';
  END IF;

  IF NOT (v_has_game AND v_count > 0 AND coalesce(v_game.special_product, false) IS NOT TRUE AND NOT v_wrong_pool)
     AND NOT v_freeze_pending_special
     AND (NOT v_has_game OR v_count = 0 OR v_count <> v_pic OR v_wrong_pool
     OR (v_special IS TRUE AND coalesce(v_game.special_product, false) IS NOT TRUE
         AND coalesce(v_game.penalty_hold, 0) <= 0)) THEN
    IF v_special THEN
      IF v_range_min IS NULL OR v_range_max IS NULL THEN
        RAISE EXCEPTION 'Special product range not configured';
      END IF;
      v_band_lo := round(v_balance + v_range_min, 2);
      v_band_hi := round(v_balance + v_range_max, 2);
      v_ids := public.pick_special_product_bundle(
        v_uid, v_exclude_game, v_balance, v_range_min, v_range_max, v_pic
      );
      IF v_ids IS NULL OR COALESCE(array_length(v_ids, 1), 0) <> v_pic THEN
        RAISE EXCEPTION 'No product combination found for special task';
      END IF;
      SELECT round(coalesce(sum(price), 0), 2) INTO v_amount FROM public.products WHERE id = ANY(v_ids);
      v_hold := GREATEST(round(v_amount - v_balance, 2), 0);
    ELSE
      SELECT array_agg(id) INTO v_ids FROM (
        SELECT id
        FROM public.products
        WHERE is_active
          AND coalesce(is_special, false) IS NOT TRUE
          AND round(coalesce(price, 0), 2) <= v_balance
        ORDER BY random()
        LIMIT v_pic
      ) s;
    END IF;
    IF v_ids IS NULL THEN
      RAISE EXCEPTION 'No products available within your balance';
    END IF;

    IF NOT v_special THEN
      IF EXISTS (
        SELECT 1 FROM public.products pr
        WHERE pr.id = ANY(v_ids) AND coalesce(pr.is_special, false) IS TRUE
      ) THEN
        RAISE EXCEPTION 'Special products cannot be assigned to regular tasks';
      END IF;
    END IF;

    IF NOT v_special THEN
      SELECT coalesce(sum(price), 0) INTO v_amount FROM public.products WHERE id = ANY(v_ids);
      v_amount := round(v_amount, 2);
      IF v_amount > v_balance THEN
        RAISE EXCEPTION 'Task amount exceeds available balance';
      END IF;
      v_commission := round(v_amount * coalesce(v_pack.profit_percentage, 0.5) / 100.0, 2);
    ELSIF v_existing_special AND NOT v_wrong_pool THEN
      v_commission := v_game.commission;
      v_amount := round(coalesce(v_game.amount, 0), 2);
      v_hold := round(coalesce(v_game.penalty_hold, 0), 2);
    ELSE
      v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
      v_commission := round(v_amount * v_rate / 100.0, 2);
    END IF;

    IF NOT v_has_game THEN
      INSERT INTO public.games (user_id, amount, commission, pending, special_product, rating_no, penalty_hold)
      VALUES (v_uid, v_amount, v_commission, true, v_special, 5, CASE WHEN v_special THEN coalesce(v_hold, 0) ELSE 0 END)
      RETURNING * INTO v_game;
    ELSE
      UPDATE public.games
        SET amount = v_amount,
            commission = v_commission,
            special_product = v_special,
            rating_no = coalesce(v_game.rating_no, 5),
            penalty_hold = CASE WHEN v_special THEN coalesce(v_hold, 0) ELSE 0 END
      WHERE id = v_game.id
      RETURNING * INTO v_game;
      DELETE FROM public.game_products WHERE game_id = v_game.id;
    END IF;

    INSERT INTO public.game_products (game_id, product_id)
    SELECT v_game.id, unnest(v_ids);
  ELSE
    IF v_special AND NOT v_existing_special THEN
      v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_amount
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      v_hold := GREATEST(round(v_amount - v_balance, 2), coalesce(v_game.penalty_hold, 0));
      v_commission := round(v_amount * v_rate / 100.0, 2);
      UPDATE public.games
        SET special_product = true,
            penalty_hold = coalesce(v_hold, v_game.penalty_hold, 0),
            amount = v_amount,
            commission = v_commission
      WHERE id = v_game.id
      RETURNING * INTO v_game;
    ELSIF NOT v_special THEN
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF v_product_total > v_balance OR round(coalesce(v_game.amount, 0), 2) > v_balance THEN
        v_wrong_pool := true;
      END IF;
      IF v_wrong_pool THEN
        RETURN public.ensure_current_game();
      END IF;
      v_commission := round(v_game.amount * coalesce(v_pack.profit_percentage, 0.5) / 100.0, 2);
      UPDATE public.games
        SET special_product = false,
            penalty_hold = 0,
            commission = v_commission
      WHERE id = v_game.id
      RETURNING * INTO v_game;
    END IF;
  END IF;

  IF coalesce(v_game.special_product, false) AND NOT v_special AND NOT v_pending_uncleared_special THEN
    UPDATE public.games
      SET special_product = false, penalty_hold = 0
      WHERE id = v_game.id;
    DELETE FROM public.game_products WHERE game_id = v_game.id;
    RETURN public.ensure_current_game();
  END IF;

  IF v_freeze_pending_special THEN
    IF coalesce(v_game.special_product, false) OR coalesce(v_game.penalty_hold, 0) > 0 THEN
      v_special := true;
    END IF;
    UPDATE public.games
      SET special_product = coalesce(v_game.special_product, v_special),
          pending = true
      WHERE id = v_game.id
      RETURNING * INTO v_game;
    IF coalesce(v_game.special_product, false) AND v_count > 0 THEN
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF v_product_total > 0 THEN
        v_amount := v_product_total;
        v_hold := GREATEST(round(v_amount - v_balance, 2), 0);
        v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
        v_commission := round(v_amount * v_rate / 100.0, 2);
        IF round(coalesce(v_game.amount, 0), 2) <> v_amount
           OR round(coalesce(v_game.penalty_hold, 0), 2) <> v_hold
           OR round(coalesce(v_game.commission, 0), 2) <> v_commission THEN
          UPDATE public.games
            SET amount = v_amount,
                penalty_hold = v_hold,
                commission = v_commission
          WHERE id = v_game.id
          RETURNING * INTO v_game;
        END IF;
        IF v_neg.id IS NULL THEN
          SELECT * INTO v_neg
          FROM public.negative_users
          WHERE user_id = v_uid AND is_active IS TRUE AND coalesce(scheduled_for_next_reset, false) IS NOT TRUE;
        END IF;
        IF v_hold <= 0.009 AND v_neg.id IS NOT NULL
           AND (coalesce(v_neg.held_amount, 0) > 0 OR coalesce(v_neg.hold_applied, false)) THEN
          UPDATE public.negative_users
            SET held_amount = 0, hold_applied = false
          WHERE id = v_neg.id;
        END IF;
      END IF;
    END IF;
  END IF;

  IF NOT coalesce(v_game.special_product, false) THEN
    IF NOT v_on_hold_negative THEN
      SELECT round(coalesce(sum(pr.price), 0), 2) INTO v_product_total
      FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id;
      IF v_product_total > v_balance OR round(coalesce(v_game.amount, 0), 2) > v_balance THEN
        RAISE EXCEPTION 'Task amount exceeds available balance';
      END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.game_products gp
      JOIN public.products pr ON pr.id = gp.product_id
      WHERE gp.game_id = v_game.id AND coalesce(pr.is_special, false) IS TRUE
    ) THEN
      RAISE EXCEPTION 'Special products cannot be assigned to regular tasks';
    END IF;
  END IF;

  IF v_special
     AND coalesce(v_hold, 0) > 0
     AND v_neg.id IS NOT NULL
     AND NOT v_freeze_pending_special
     AND (
       coalesce(v_neg.hold_applied, false) IS NOT TRUE
       OR abs(coalesce(v_wallet.on_hold, 0) + v_hold) > 0.05
     ) THEN
    UPDATE public.wallets
      SET on_hold = -abs(v_hold), updated_at = now()
      WHERE user_id = v_uid;
    UPDATE public.negative_users
      SET held_amount = abs(v_hold), hold_applied = true
      WHERE id = v_neg.id;
    INSERT INTO public.notifications (user_id, title, message, is_read)
    VALUES (
      v_uid,
      'Special product',
      'You received a special product. Please reach out to customer care for any clarification.',
      false
    );
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_uid;
  END IF;

  IF coalesce(v_game.special_product, false) THEN
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'image', pr.image,
          'name', pr.name,
          'price', pr.price
        )
        ORDER BY pr.name
      ),
      '[]'::jsonb
    ) INTO v_products
    FROM public.game_products gp
    JOIN public.products pr ON pr.id = gp.product_id
    WHERE gp.game_id = v_game.id;
  ELSE
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'image', pr.image,
          'name', pr.name,
          'price', pr.price
        )
        ORDER BY pr.name
      ),
      '[]'::jsonb
    ) INTO v_products
    FROM public.game_products gp
    JOIN public.products pr ON pr.id = gp.product_id
    WHERE gp.game_id = v_game.id;
  END IF;

  v_remaining := CASE WHEN coalesce(v_wallet.on_hold, 0) < 0 THEN abs(v_wallet.on_hold) ELSE 0 END;

  IF coalesce(v_game.special_product, false) THEN
    v_rate := GREATEST(coalesce(v_pack.profit_percentage, 0.5) * coalesce(v_pack.grouped_multiplier, 10), 5);
  ELSE
    v_rate := coalesce(v_pack.profit_percentage, 0.5);
  END IF;

  RETURN jsonb_build_object(
    'id', v_game.id,
    'products', v_products,
    'amount', v_game.amount,
    'commission', v_game.commission,
    'profit_rate', v_rate,
    'pack_name', v_pack.name,
    'created_at', v_game.created_at,
    'rating_no', v_game.rating_no,
    'pending', v_game.pending,
    'special_product', v_game.special_product,
    'penalty_hold', v_game.penalty_hold,
    'range_min', v_range_min,
    'range_max', v_range_max,
    'top_up_amount', NULLIF(v_remaining, 0),
    'special_clear_amount', CASE WHEN v_game.special_product THEN v_game.penalty_hold ELSE NULL END
  );
END;
$function$;



CREATE OR REPLACE FUNCTION private.apply_confirmed_deposit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_amount numeric := coalesce(NEW.amount, 0);
  v_hold numeric := 0;
  v_apply numeric := 0;
  v_rev_balance numeric := 0;
  v_rev_hold numeric := 0;
  v_amount_text text;
  v_message text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF coalesce(OLD.status, '') = 'Confirmed'
     AND coalesce(NEW.status, '') IS DISTINCT FROM 'Confirmed' THEN
    v_rev_balance := coalesce(OLD.confirmed_balance_delta, OLD.amount, 0);
    v_rev_hold := coalesce(OLD.confirmed_hold_delta, 0);

    IF v_rev_balance <> 0 OR v_rev_hold <> 0 THEN
      UPDATE public.wallets
      SET balance = coalesce(balance, 0) - v_rev_balance,
          on_hold = coalesce(on_hold, 0) - v_rev_hold,
          updated_at = now()
      WHERE user_id = OLD.user_id;
    END IF;

    UPDATE public.deposits
    SET confirmed_balance_delta = NULL,
        confirmed_hold_delta = NULL
    WHERE id = OLD.id;

    v_amount_text := to_char(coalesce(OLD.amount, 0), 'FM999999990.00');
    DELETE FROM public.notifications
    WHERE deposit_id = OLD.id
       OR (
         user_id = OLD.user_id
         AND title = 'Deposit confirmed'
         AND deposit_id IS NULL
         AND message = format('Your deposit of $%s has been confirmed and credited to your wallet.', v_amount_text)
       );

    PERFORM public.sync_vip_from_balance(OLD.user_id);
    RETURN NEW;
  END IF;

  IF NEW.status = 'Confirmed'
     AND coalesce(OLD.status, '') IS DISTINCT FROM 'Confirmed'
     AND v_amount > 0 THEN
    SELECT coalesce(on_hold, 0) INTO v_hold
    FROM public.wallets
    WHERE user_id = NEW.user_id
    FOR UPDATE;

    IF v_hold < 0 THEN
      v_apply := least(v_amount, abs(v_hold));
    END IF;

    UPDATE public.wallets
    SET balance = coalesce(balance, 0) + v_amount,
        on_hold = coalesce(v_hold, 0) + v_apply,
        updated_at = now()
    WHERE user_id = NEW.user_id;

    UPDATE public.deposits
    SET confirmed_balance_delta = v_amount,
        confirmed_hold_delta = v_apply
    WHERE id = NEW.id;

    v_amount_text := to_char(v_amount, 'FM999999990.00');
    v_message := format('Your deposit of $%s has been confirmed and credited to your wallet.', v_amount_text);

    DELETE FROM public.notifications
    WHERE user_id = NEW.user_id
      AND title = 'Deposit confirmed'
      AND message = v_message
      AND (deposit_id = NEW.id OR deposit_id IS NULL);

    INSERT INTO public.notifications (user_id, title, message, is_read, deposit_id)
    VALUES (NEW.user_id, 'Deposit confirmed', v_message, false, NEW.id);

    PERFORM public.sync_pending_special_financials(NEW.user_id);
    PERFORM public.sync_vip_from_balance(NEW.user_id);
  END IF;

  RETURN NEW;
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
