-- Thematic product images matched to special SKU labels.

CREATE OR REPLACE FUNCTION public.special_catalog_image_url(p_label text, p_product_name text DEFAULT NULL)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $$
  SELECT CASE trim(p_label)
    WHEN 'Tesla Model S Plaid' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/20180630_Tesla_Model_S_70D_2015_midnight_blue_left_front.jpg/960px-20180630_Tesla_Model_S_70D_2015_midnight_blue_left_front.jpg'
    WHEN 'Tesla Model X' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c6/Tesla_Model_X_100D_1X7A6736.jpg/960px-Tesla_Model_X_100D_1X7A6736.jpg'
    WHEN 'Tesla Cybertruck' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/2024_Tesla_Cybertruck_Foundation_Series_IMG_0634_%28cropped%29.jpg/960px-2024_Tesla_Cybertruck_Foundation_Series_IMG_0634_%28cropped%29.jpg'
    WHEN 'Mercedes-Benz S-Class' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/MERCEDES-BENZ_S-CLASS_%28V221%29_China.jpg/960px-MERCEDES-BENZ_S-CLASS_%28V221%29_China.jpg'
    WHEN 'BMW i7 xDrive60' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/BMW_7-Series_%28G70%29_750e_1X7A1899.jpg/960px-BMW_7-Series_%28G70%29_750e_1X7A1899.jpg'
    WHEN 'Audi e-tron GT' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/2024_Audi_S_e-tron_GT_DSC_2915.jpg/960px-2024_Audi_S_e-tron_GT_DSC_2915.jpg'
    WHEN 'Porsche Taycan Turbo S' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Porsche_Taycan_GTS_%28Safety_Car%29_at_the_2025_Adelaide_Grand_Final_Parade_-_08.jpg/960px-Porsche_Taycan_GTS_%28Safety_Car%29_at_the_2025_Adelaide_Grand_Final_Parade_-_08.jpg'
    WHEN 'Lamborghini Urus' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Lamborghini_Urus_Performante_1X7A6805.jpg/960px-Lamborghini_Urus_Performante_1X7A6805.jpg'
    WHEN 'Ferrari Roma' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9b/Ferrari_Roma_IMG_9620.jpg/960px-Ferrari_Roma_IMG_9620.jpg'
    WHEN 'Bentley Continental GT' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Bentley_Continental_GTC_%284th_gen.%29_DSC_6982.jpg/960px-Bentley_Continental_GTC_%284th_gen.%29_DSC_6982.jpg'
    WHEN 'Rolls-Royce Ghost' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Monaco-Rolls-Royce-4071031.jpg/960px-Monaco-Rolls-Royce-4071031.jpg'
    WHEN 'Range Rover Autobiography' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Land_Rover_Range_Rover_Autobiography_2016.jpg/960px-Land_Rover_Range_Rover_Autobiography_2016.jpg'
    WHEN 'Apple Vision Pro' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Apple_Vision_Pro_on_display.jpg/960px-Apple_Vision_Pro_on_display.jpg'
    WHEN 'MacBook Pro 16" M3 Max' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c4/Apple_MacBook_Pro_15%22_%282017%29.jpg/960px-Apple_MacBook_Pro_15%22_%282017%29.jpg'
    WHEN 'iPhone 16 Pro Max' THEN 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&q=80'
    WHEN 'iPad Pro M4' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ee/Apple_iPad.jpg/960px-Apple_iPad.jpg'
    WHEN 'Samsung Galaxy Z Fold6' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Front_of_the_Samsung_Galaxy_Z_Fold_4.jpg/960px-Front_of_the_Samsung_Galaxy_Z_Fold_4.jpg'
    WHEN 'Sony A1 II Camera' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/00/Sony-Alpha-A700-Front.jpg/960px-Sony-Alpha-A700-Front.jpg'
    WHEN 'DJI Inspire 3 Drone' THEN 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
    WHEN 'Bang & Olufsen Beosound' THEN 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'
    WHEN 'Rolex Submariner Date' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/Rolex_Submariner_Professional.JPG/960px-Rolex_Submariner_Professional.JPG'
    WHEN 'Rolex Day-Date 40' THEN 'https://upload.wikimedia.org/wikipedia/commons/1/18/Rolex_Day_Date.jpg'
    WHEN 'Patek Philippe Nautilus' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Patek-Philippe-Nautilus-5711-1A-010-1.jpg/960px-Patek-Philippe-Nautilus-5711-1A-010-1.jpg'
    WHEN 'Audemars Piguet Royal Oak' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Audemars_Piguet_Royal_Oak_ref._15202.jpg/960px-Audemars_Piguet_Royal_Oak_ref._15202.jpg'
    WHEN 'Omega Speedmaster' THEN 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&q=80'
    WHEN 'Cartier Santos' THEN 'https://upload.wikimedia.org/wikipedia/commons/3/33/Cartier_Santos_gold_silver_watch.jpg'
    WHEN 'Hublot Big Bang' THEN 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80'
    WHEN 'Richard Mille RM 11' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/RM_030_Automatic.jpg/960px-RM_030_Automatic.jpg'
    WHEN 'Louis Vuitton Trunk Set' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/39/Famille-Vuitton_1888.jpg/960px-Famille-Vuitton_1888.jpg'
    WHEN 'Hermès Birkin 30' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/Pink_Birkin_bag_%282%29.jpg/960px-Pink_Birkin_bag_%282%29.jpg'
    WHEN 'Chanel Classic Flap' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9d/Chanel_2.55.jpg/960px-Chanel_2.55.jpg'
    WHEN 'Dior Book Tote' THEN 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'
    WHEN 'Bottega Veneta Cassette' THEN 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=800&q=80'
    WHEN 'Goyard Saint Louis GM' THEN 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
    WHEN 'Prada Re-Edition' THEN 'https://upload.wikimedia.org/wikipedia/commons/1/10/BAG_0116.jpg'
    WHEN 'Balenciaga Hourglass' THEN 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80'
    WHEN 'Vertu Signature Cobra' THEN 'https://upload.wikimedia.org/wikipedia/commons/8/88/Vertu_mobile.jpg'
    WHEN 'Gold iPhone Custom' THEN 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&q=80'
    WHEN 'Diamond Encrusted Watch' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/Diamond-studded_Omega_watch_%2826272019658%29.jpg/960px-Diamond-studded_Omega_watch_%2826272019658%29.jpg'
    WHEN 'Platinum Credit Card Set' THEN 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80'
    WHEN 'Home Cinema Gold Package' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3c/Home_cinema_01.jpg/960px-Home_cinema_01.jpg'
    WHEN 'Smart Home Butler System' THEN 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80'
    WHEN 'Private Jet Day Pass' THEN 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Private_Jet_-_geograph.org.uk_-_133018.jpg'
    WHEN 'Yacht Charter Weekend' THEN 'https://upload.wikimedia.org/wikipedia/commons/b/be/Christina_Luxury_Yacht_Lounge.jpg'
    WHEN 'Luxury Safari Package' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d7/Elefantes_africanos_de_sabana_%28Loxodonta_africana%29%2C_Elephant_Sands%2C_Botsuana%2C_2018-07-28%2C_DD_114-117_PAN.jpg/960px-Elefantes_africanos_de_sabana_%28Loxodonta_africana%29%2C_Elephant_Sands%2C_Botsuana%2C_2018-07-28%2C_DD_114-117_PAN.jpg'
    WHEN 'VIP Concert Suite' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Harbourfront_Centre_Concert_Stage%2C_Toronto_2026.jpg/960px-Harbourfront_Centre_Concert_Stage%2C_Toronto_2026.jpg'
    WHEN 'Art Gallery Masterpiece' THEN 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80'
    WHEN 'Rare Whisky Collection' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Bottle_of_whisky_from_the_Scotch_Malt_Whisky_Society.jpg/960px-Bottle_of_whisky_from_the_Scotch_Malt_Whisky_Society.jpg'
    WHEN 'Designer Furniture Suite' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c8/Hester_Diamond_Living_Room_by_Rachel_Kaminsky.9.2020_01.jpg/960px-Hester_Diamond_Living_Room_by_Rachel_Kaminsky.9.2020_01.jpg'
    WHEN 'Marble Kitchen Package' THEN 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Marble_for_Countertops_01.jpg/960px-Marble_for_Countertops_01.jpg'
    ELSE 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80'
  END;
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
