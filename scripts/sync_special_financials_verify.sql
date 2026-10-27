-- After applying step1, step2, step3, step4 — check Learntodoit111 (or any username).

SELECT p.username,
       w.balance,
       w.on_hold,
       g.id AS pending_game_id,
       g.special_product,
       g.penalty_hold,
       g.amount,
       g.commission,
       (SELECT round(coalesce(sum(pr.price), 0), 2)
        FROM game_products gp
        JOIN products pr ON pr.id = gp.product_id
        WHERE gp.game_id = g.id) AS catalog_sum
FROM profiles p
JOIN wallets w ON w.user_id = p.id
LEFT JOIN LATERAL (
  SELECT *
  FROM games
  WHERE user_id = p.id AND pending IS TRUE
  ORDER BY created_at DESC
  LIMIT 1
) g ON true
WHERE p.username ILIKE 'Learntodoit111';
