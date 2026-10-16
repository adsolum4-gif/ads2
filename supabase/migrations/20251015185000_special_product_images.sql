-- Image URLs for the 50 luxury SKUs (Special #N — {label}); applied to all special catalog rows.

CREATE OR REPLACE FUNCTION public.special_catalog_image_url(p_label text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT CASE trim(p_label)
    WHEN 'Tesla Model S Plaid' THEN 'https://images.unsplash.com/photo-1617788138013-5f9cbe184c04?auto=format&fit=crop&w=800&q=80'
    WHEN 'Tesla Model X' THEN 'https://images.unsplash.com/photo-1629897048517-3d7988183418?auto=format&fit=crop&w=800&q=80'
    WHEN 'Tesla Cybertruck' THEN 'https://images.unsplash.com/photo-1619316709047-c87d4c4c8a8a?auto=format&fit=crop&w=800&q=80'
    WHEN 'Mercedes-Benz S-Class' THEN 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80'
    WHEN 'BMW i7 xDrive60' THEN 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80'
    WHEN 'Audi e-tron GT' THEN 'https://images.unsplash.com/photo-1606660419411-9349f691d3d0?auto=format&fit=crop&w=800&q=80'
    WHEN 'Porsche Taycan Turbo S' THEN 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
    WHEN 'Lamborghini Urus' THEN 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=800&q=80'
    WHEN 'Ferrari Roma' THEN 'https://images.unsplash.com/photo-1583121274602-3e2820c50fa8?auto=format&fit=crop&w=800&q=80'
    WHEN 'Bentley Continental GT' THEN 'https://images.unsplash.com/photo-1563720360172-32a3691f8d3c?auto=format&fit=crop&w=800&q=80'
    WHEN 'Rolls-Royce Ghost' THEN 'https://images.unsplash.com/photo-1631297863554-261462140812?auto=format&fit=crop&w=800&q=80'
    WHEN 'Range Rover Autobiography' THEN 'https://images.unsplash.com/photo-1519641470094-69137963c069?auto=format&fit=crop&w=800&q=80'
    WHEN 'Apple Vision Pro' THEN 'https://images.unsplash.com/photo-1713619583673-7235665432d9?auto=format&fit=crop&w=800&q=80'
    WHEN 'MacBook Pro 16" M3 Max' THEN 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80'
    WHEN 'iPhone 16 Pro Max' THEN 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80'
    WHEN 'iPad Pro M4' THEN 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80'
    WHEN 'Samsung Galaxy Z Fold6' THEN 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80'
    WHEN 'Sony A1 II Camera' THEN 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80'
    WHEN 'DJI Inspire 3 Drone' THEN 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=800&q=80'
    WHEN 'Bang & Olufsen Beosound' THEN 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80'
    WHEN 'Rolex Submariner Date' THEN 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80'
    WHEN 'Rolex Day-Date 40' THEN 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'
    WHEN 'Patek Philippe Nautilus' THEN 'https://images.unsplash.com/photo-1622431354716-095054a000ee?auto=format&fit=crop&w=800&q=80'
    WHEN 'Audemars Piguet Royal Oak' THEN 'https://images.unsplash.com/photo-1614164185128-e4d17199616f?auto=format&fit=crop&w=800&q=80'
    WHEN 'Omega Speedmaster' THEN 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&w=800&q=80'
    WHEN 'Cartier Santos' THEN 'https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=800&q=80'
    WHEN 'Hublot Big Bang' THEN 'https://images.unsplash.com/photo-1548171912-e79a3602e772?auto=format&fit=crop&w=800&q=80'
    WHEN 'Richard Mille RM 11' THEN 'https://images.unsplash.com/photo-1594534475808-b18a0a053e2e?auto=format&fit=crop&w=800&q=80'
    WHEN 'Louis Vuitton Trunk Set' THEN 'https://images.unsplash.com/photo-1564422170191-4bd349346e30?auto=format&fit=crop&w=800&q=80'
    WHEN 'Hermès Birkin 30' THEN 'https://images.unsplash.com/photo-1584917865442-de89a76e5620?auto=format&fit=crop&w=800&q=80'
    WHEN 'Chanel Classic Flap' THEN 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80'
    WHEN 'Dior Book Tote' THEN 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80'
    WHEN 'Bottega Veneta Cassette' THEN 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=800&q=80'
    WHEN 'Goyard Saint Louis GM' THEN 'https://images.unsplash.com/photo-1591561954557-26941136b49c?auto=format&fit=crop&w=800&q=80'
    WHEN 'Prada Re-Edition' THEN 'https://images.unsplash.com/photo-1584917865442-de89a76e5620?auto=format&fit=crop&w=800&q=80'
    WHEN 'Balenciaga Hourglass' THEN 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80'
    WHEN 'Vertu Signature Cobra' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80'
    WHEN 'Gold iPhone Custom' THEN 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80'
    WHEN 'Diamond Encrusted Watch' THEN 'https://images.unsplash.com/photo-1523170335258-f5ed11844d49?auto=format&fit=crop&w=800&q=80'
    WHEN 'Platinum Credit Card Set' THEN 'https://images.unsplash.com/photo-1563013547-5ae1628a29be?auto=format&fit=crop&w=800&q=80'
    WHEN 'Home Cinema Gold Package' THEN 'https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80'
    WHEN 'Smart Home Butler System' THEN 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80'
    WHEN 'Private Jet Day Pass' THEN 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80'
    WHEN 'Yacht Charter Weekend' THEN 'https://images.unsplash.com/photo-1567899378494-47b22e2f96b5?auto=format&fit=crop&w=800&q=80'
    WHEN 'Luxury Safari Package' THEN 'https://images.unsplash.com/photo-1516426122078-c23a76319801?auto=format&fit=crop&w=800&q=80'
    WHEN 'VIP Concert Suite' THEN 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80'
    WHEN 'Art Gallery Masterpiece' THEN 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=800&q=80'
    WHEN 'Rare Whisky Collection' THEN 'https://images.unsplash.com/photo-1527281400683-379aae1b2537?auto=format&fit=crop&w=800&q=80'
    WHEN 'Designer Furniture Suite' THEN 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80'
    WHEN 'Marble Kitchen Package' THEN 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=800&q=80'
    ELSE 'https://images.unsplash.com/photo-1606660419411-9349f691d3d0?auto=format&fit=crop&w=800&q=80'
  END;
$$;

UPDATE public.products p
SET image = public.special_catalog_image_url(
  CASE
    WHEN p.name LIKE 'Special #% — %' THEN split_part(p.name, ' — ', 2)
    ELSE p.name
  END
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
    v_image := public.special_catalog_image_url(v_label);

    INSERT INTO public.products (name, price, rating_number, is_special, is_active, image)
    VALUES (v_name, v_price, 5, true, true, v_image);
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN v_inserted;
END;
$$;
