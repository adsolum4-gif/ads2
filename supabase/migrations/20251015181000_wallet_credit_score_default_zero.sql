-- New registrations should start at 0% credit score (admin can raise later).
ALTER TABLE public.wallets
  ALTER COLUMN credit_score SET DEFAULT 0;
