-- Special negative-user tasks pick active catalog SKUs (catalog-sum design).
-- Do not require products.is_special on game_products insert.

CREATE OR REPLACE FUNCTION public.enforce_special_product_assignment_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_special_game boolean;
  v_is_special_product boolean;
BEGIN
  SELECT g.user_id, coalesce(g.special_product, false)
    INTO v_user_id, v_special_game
  FROM public.games g
  WHERE g.id = NEW.game_id;

  SELECT coalesce(pr.is_special, false)
    INTO v_is_special_product
  FROM public.products pr
  WHERE pr.id = NEW.product_id;

  IF NOT coalesce(v_special_game, false) THEN
    IF coalesce(v_is_special_product, false) THEN
      RAISE EXCEPTION 'Special products cannot be assigned to regular tasks';
    END IF;
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.game_products gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.product_id = NEW.product_id
      AND gp.game_id <> NEW.game_id
      AND g.pending IS TRUE
      AND coalesce(g.special_product, false) IS TRUE
  ) THEN
    RAISE EXCEPTION 'Special product already assigned to another pending task';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.game_products gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.product_id = NEW.product_id
      AND gp.game_id <> NEW.game_id
      AND g.user_id = v_user_id
      AND coalesce(g.special_product, false) IS TRUE
  ) THEN
    RAISE EXCEPTION 'User already received this special product';
  END IF;

  RETURN NEW;
END;
$function$;
