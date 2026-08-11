-- Al Ansar Foundation — seed data
-- profiles rows are NOT seeded here: a profile only exists once its owner
-- has actually signed in via Clerk (clerk_user_id is unknown ahead of time).
-- The Clerk webhook (api/webhooks/clerk.ts) creates the profile on first
-- sign-in, matching by email against the managers table below, and
-- special-cases alansar.admin@gmail.com to role = ADMIN.

insert into app_settings (key, value) values
  ('FOLLOW_UP_PENDING_DAY', '20');

insert into managers (full_name, phone, email, status) values
  ('Faqihuddin',        '+91 91611 81847', 'faqi@gmail.com',        'ACTIVE'),
  ('Mohammad Anees',    '+91 98735 59343', 'anees@gmail.com',       'ACTIVE'),
  ('Anwarul Haque',     '+91 96190 89689', 'anwar@gmail.com',       'ACTIVE'),
  ('Mohammad Saleem',   '+91 72777 22228', 'saleem@gmail.com',      'ACTIVE'),
  ('Abdul Haseeb',      '+91 87953 54687', 'ahaseeb7538@gmail.com', 'ACTIVE'),
  ('Abdurrashid',       '+91 86800 00762', 'rashid@gmail.com',      'ACTIVE'),
  ('Molana Hashim',     '+91 99181 63330', 'hashim@gmail.com',      'ACTIVE'),
  ('Mohammad Yusuf',    '+91 94885 89359', 'yusuf@gmail.com',       'ACTIVE'),
  ('Ahmadullah',        '+91 80818 33851', 'ahmadullah@gmail.com',  'ACTIVE'),
  ('Mohammad Naseem',   '+91 99193 53638', 'naseem@gmail.com',      'ACTIVE'),
  -- NOTE: source list gave Mohammad Anwar the same email as Anwarul Haque
  -- (anwar@gmail.com). Seeded with a placeholder so setup isn't blocked —
  -- correct this in Admin > Managers before inviting Mohammad Anwar, using
  -- whatever email he will actually sign in with.
  ('Mohammad Anwar',    '+91 79047 57073', 'anwar.m@gmail.com',     'ACTIVE');
