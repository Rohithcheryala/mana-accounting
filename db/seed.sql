-- =========================================================================
-- Seed data for mana-accounting. Safe to re-run (uses ON CONFLICT DO NOTHING).
-- =========================================================================

INSERT INTO partner (id, name) VALUES
  (1, 'Rohith'),
  (2, 'Yash'),
  (3, 'Madhu')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (name, kind) VALUES
  -- expenses
  ('Fuel',          'expense'),
  ('Service',       'expense'),
  ('Repairs',       'expense'),
  ('Tyres',         'expense'),
  ('Battery',       'expense'),
  ('Insurance',     'expense'),
  ('EMI',           'expense'),
  ('Road tax',      'expense'),
  ('Toll',          'expense'),
  ('Parking',       'expense'),
  ('Cleaning',      'expense'),
  ('Accessories',   'expense'),
  ('Fines',         'expense'),
  ('Platform fee',  'expense'),
  ('Misc expense',  'expense'),
  -- incomes
  ('Rental',        'income'),
  ('Fuel charge',   'income'),
  ('Damage charge', 'income'),
  ('Late fee',      'income'),
  ('Misc income',   'income')
ON CONFLICT (name) DO NOTHING;
