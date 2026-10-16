-- Reliable image URLs: one stable picsum seed per special SKU (md5 of full product name).

CREATE OR REPLACE FUNCTION public.special_catalog_image_url(p_label text, p_product_name text DEFAULT NULL)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT 'https://picsum.photos/seed/' || md5(coalesce(nullif(trim(p_product_name), ''), trim(p_label))) || '/800/600';
$$;

UPDATE public.products p
SET image = public.special_catalog_image_url(
  CASE
    WHEN p.name LIKE 'Special #% — %' THEN split_part(p.name, ' — ', 2)
    ELSE p.name
  END,
  p.name
)
WHERE coalesce(p.is_special, false) IS TRUE;

CREATE OR REPLACE FUNCTION public.seed_special_product_catalog(p_count integer DEFAULT 200)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_names text[] := ARRAY[
    'Tesla Model S Plaid', 'Tesla Model X', 'Tesla Cybertruck', 'Mercedes-Benz S-Class',
    'BMW i7 xDrive60', 'Audi e-tron GT', 'Porsche Taycan Turbo S', 'Lamborghini Urus',
    'Ferrari Roma', 'Bentley Continental GT', 'Rolls-Royce Ghost', 'Range Rover Autobiography',
    'Apple Vision Pro', 'MacBook Pro 16" M3 Max', 'iPhone 16 Pro Max', 'iPad Pro M4',
    'Samsung Galaxy Z Fold6', 'Sony A1 II Camera', 'DJI Inspire 3 Drone', 'Bang & Olufsen Beosound',
    'Rolex Submariner Date', 'Rolex Day-Date 40', 'Patek Philippe Nautilus', 'Audemars Piguet Royal Oak',
    'Omega Speedmaster', 'Cartier Santos', 'Hublot Big Bang', 'Richard Mille RM 11',
    'Louis Vuitton Trunk Set', 'Hermès Birkin 30', 'Chanel Classic Flap', 'Dior Book Tote',
    'Bottega Veneta Cassette', 'Goyard Saint Louis GM', 'Prada Re-Edition', 'Balenciaga Hourglass',
    'Vertu Signature Cobra', 'Gold iPhone Custom', 'Diamond Encrusted Watch', 'Platinum Credit Card Set',
    'Home Cinema Gold Package', 'Smart Home Butler System', 'Private Jet Day Pass', 'Yacht Charter Weekend',
    'Luxury Safari Package', 'VIP Concert Suite', 'Art Gallery Masterpiece', 'Rare Whisky Collection',
    'Designer Furniture Suite', 'Marble Kitchen Package'
  ];
  v_existing int;
  v_inserted int := 0;
  v_i int;
  v_price numeric;
  v_name text;
  v_label text;
  v_image text;
BEGIN
  SELECT count(*)::int INTO v_existing FROM public.products WHERE coalesce(is_special, false) IS TRUE;
  IF v_existing >= p_count THEN
    RETURN 0;
  END IF;

  FOR v_i IN 1..p_count LOOP
    v_label := v_names[1 + ((v_i - 1) % array_length(v_names, 1))];
    v_name := format('Special #%s — %s', v_i, v_label);
    IF EXISTS (
      SELECT 1 FROM public.products
      WHERE is_special IS TRUE AND name = v_name
    ) THEN
      CONTINUE;
    END IF;

    v_price := round(
      2500 + power((v_i::numeric / greatest(p_count, 1)), 1.35) * (485000 - 2500),
      2
    );
    v_image := public.special_catalog_image_url(v_label, v_name);

    INSERT INTO public.products (name, price, rating_number, is_special, is_active, image)
    VALUES (v_name, v_price, 5, true, true, v_image);
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;
