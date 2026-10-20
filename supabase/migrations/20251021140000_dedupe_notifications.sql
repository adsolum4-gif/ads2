-- One deposit confirmation and one unread copy of any identical notice.

CREATE OR REPLACE FUNCTION public.notifications_skip_duplicate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.title = 'Deposit confirmed' THEN
    IF EXISTS (
      SELECT 1
      FROM public.notifications n
      WHERE n.user_id = NEW.user_id
        AND n.title = NEW.title
        AND n.message = NEW.message
        AND (
          n.deposit_id IS NOT DISTINCT FROM NEW.deposit_id
          OR n.created_at > now() - interval '6 hours'
          OR n.is_read IS NOT TRUE
        )
    ) THEN
      RETURN NULL;
    END IF;
  ELSIF EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = NEW.user_id
      AND n.title IS NOT DISTINCT FROM NEW.title
      AND n.message IS NOT DISTINCT FROM NEW.message
      AND (n.is_read IS NOT TRUE OR n.created_at > now() - interval '10 minutes')
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS notifications_skip_duplicate ON public.notifications;
CREATE TRIGGER notifications_skip_duplicate
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.notifications_skip_duplicate();

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

    PERFORM public.sync_vip_from_balance(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$function$;

DELETE FROM public.notifications a
USING public.notifications b
WHERE a.user_id = b.user_id
  AND a.title IS NOT DISTINCT FROM b.title
  AND a.message IS NOT DISTINCT FROM b.message
  AND a.created_at < b.created_at
  AND a.title IN ('Deposit confirmed', 'Special product');
