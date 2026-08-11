-- DEV/TEST DATA ONLY.
-- Run automatically by `supabase db reset` in local development; never
-- applied to a production project. Requires migrations 0001-0006 to have
-- run first (managers + app_settings come from 0004_seed.sql).
--
-- Donations/follow-ups require a `profiles` row (recorded_by/created_by),
-- but real profiles only exist once someone actually signs in through
-- Clerk. These two fake profiles exist purely to satisfy that foreign key
-- for seeded historical rows — their clerk_user_id will never match a real
-- Clerk JWT, so nobody can ever authenticate as them.

insert into profiles (clerk_user_id, email, full_name, role, manager_id, is_active)
select 'seed_test_faqi', 'faqi@gmail.com', 'Faqihuddin', 'MANAGER', id, true
from managers where email = 'faqi@gmail.com';

insert into profiles (clerk_user_id, email, full_name, role, manager_id, is_active)
select 'seed_test_anees', 'anees@gmail.com', 'Mohammad Anees', 'MANAGER', id, true
from managers where email = 'anees@gmail.com';

-- ── test members ──────────────────────────────────────────
-- Scenario 1: donated this month, no follow-up needed.
insert into members (member_id, member_name, father_name, mobile_number, address,
  added_by_type, added_by_name, added_by_phone,
  reference_contact_type, reference_contact_name, reference_contact_phone, reference_contact_relationship,
  assigned_manager_id, status)
select 'T0001', 'Ahmed Khan', 'Abdul Khan', '+91 90000 00001', 'Hyderabad',
  'EXTERNAL_CONTACT', 'Abdul Rahman', '+91 90000 00011',
  'EXTERNAL_CONTACT', 'Mohammad Ali', '+91 90000 00021', 'Friend',
  id, 'ACTIVE'
from managers where email = 'faqi@gmail.com';

-- Scenario 2: no donation, no follow-up this month (candidate for pending after the cutoff day).
insert into members (member_id, member_name, father_name, mobile_number, address,
  added_by_type, added_by_name, added_by_phone,
  reference_contact_type, reference_contact_name, reference_contact_phone, reference_contact_relationship,
  assigned_manager_id, status)
select 'T0002', 'Yusuf Ibrahim', 'Ibrahim Sheikh', '+91 90000 00002', 'Hyderabad',
  'EXTERNAL_CONTACT', 'Salim Sheikh', '+91 90000 00012',
  'EXTERNAL_CONTACT', 'Nasir Hussain', '+91 90000 00022', 'Relative',
  id, 'ACTIVE'
from managers where email = 'faqi@gmail.com';

-- Scenario 3: no donation, but a completed follow-up this month.
insert into members (member_id, member_name, father_name, mobile_number, address,
  assigned_manager_id, status)
select 'T0003', 'Bilal Ahmed', 'Ahmed Sheikh', '+91 90000 00003', 'Hyderabad', id, 'ACTIVE'
from managers where email = 'faqi@gmail.com';

-- Scenario 4: donation and a completed follow-up in the same month.
insert into members (member_id, member_name, father_name, mobile_number, address,
  assigned_manager_id, status)
select 'T0004', 'Imran Sheikh', 'Sheikh Dawood', '+91 90000 00004', 'Hyderabad', id, 'ACTIVE'
from managers where email = 'faqi@gmail.com';

-- Scenario 5: multiple donations in the same month.
insert into members (member_id, member_name, father_name, mobile_number, address,
  assigned_manager_id, status)
select 'T0005', 'Salman Farooqui', 'Farooq Ahmed', '+91 90000 00005', 'Hyderabad', id, 'ACTIVE'
from managers where email = 'anees@gmail.com';

-- Scenario 6: follow-up attempted but NOT_INTERESTED (still counts as pending — only COMPLETED clears it).
insert into members (member_id, member_name, father_name, mobile_number, address,
  assigned_manager_id, status)
select 'T0006', 'Rafiq Ansari', 'Ansari Habib', '+91 90000 00006', 'Hyderabad', id, 'ACTIVE'
from managers where email = 'anees@gmail.com';

-- Scenario 7: inactive member (should never appear in active lists or pending follow-ups).
insert into members (member_id, member_name, father_name, mobile_number, address,
  assigned_manager_id, status)
select 'T0007', 'Zubair Khan', 'Khan Aslam', '+91 90000 00007', 'Hyderabad', id, 'INACTIVE'
from managers where email = 'anees@gmail.com';

-- Scenario 8: missing phone numbers on Added By / Reference Contact — Call/WhatsApp should render disabled, not hidden.
insert into members (member_id, member_name, father_name, mobile_number, address,
  added_by_type, added_by_name,
  assigned_manager_id, status)
select 'T0008', 'Kareem Siddiqui', 'Siddiqui Anwar', '+91 90000 00008', 'Hyderabad',
  'EXTERNAL_CONTACT', 'Waseem Siddiqui',
  id, 'ACTIVE'
from managers where email = 'anees@gmail.com';

-- ── test donations ────────────────────────────────────────
insert into donations (member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, transaction_reference, recorded_by)
select m.id, current_date, extract(month from current_date)::int, extract(year from current_date)::int, 500, 'UPI', 'UPI2026TEST001', p.id
from members m, profiles p where m.member_id = 'T0001' and p.clerk_user_id = 'seed_test_faqi';

insert into donations (member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, recorded_by)
select m.id, current_date, extract(month from current_date)::int, extract(year from current_date)::int, 1000, 'CASH', p.id
from members m, profiles p where m.member_id = 'T0004' and p.clerk_user_id = 'seed_test_faqi';

insert into donations (member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, transaction_reference, recorded_by)
select m.id, current_date - 10, extract(month from current_date - 10)::int, extract(year from current_date - 10)::int, 250, 'ONLINE', 'ONL2026TEST002', p.id
from members m, profiles p where m.member_id = 'T0005' and p.clerk_user_id = 'seed_test_anees';

insert into donations (member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, transaction_reference, recorded_by)
select m.id, current_date - 3, extract(month from current_date - 3)::int, extract(year from current_date - 3)::int, 5000, 'BANK_TRANSFER', 'BANK2026TEST003', p.id
from members m, profiles p where m.member_id = 'T0005' and p.clerk_user_id = 'seed_test_anees';

-- last month's donation, for donation-history screens
insert into donations (member_id, donation_date, donation_month, donation_year, amount_inr, payment_method, recorded_by)
select m.id, (date_trunc('month', current_date) - interval '1 day')::date,
  extract(month from date_trunc('month', current_date) - interval '1 day')::int,
  extract(year from date_trunc('month', current_date) - interval '1 day')::int,
  1000, 'CASH', p.id
from members m, profiles p where m.member_id = 'T0001' and p.clerk_user_id = 'seed_test_faqi';

-- ── test follow-ups ───────────────────────────────────────
insert into monthly_followups (member_id, manager_id, month, year, follow_up_date, follow_up_status, follow_up_method, contacted_person_type, contacted_person_name, contacted_person_phone, remarks, created_by)
select m.id, m.assigned_manager_id, extract(month from current_date)::int, extract(year from current_date)::int,
  current_date, 'COMPLETED', 'PHONE', 'MEMBER', m.member_name, m.mobile_number, 'Spoke with member directly.', p.id
from members m, profiles p where m.member_id = 'T0003' and p.clerk_user_id = 'seed_test_faqi';

insert into monthly_followups (member_id, manager_id, month, year, follow_up_date, follow_up_status, follow_up_method, contacted_person_type, contacted_person_name, contacted_person_phone, remarks, created_by)
select m.id, m.assigned_manager_id, extract(month from current_date)::int, extract(year from current_date)::int,
  current_date, 'COMPLETED', 'WHATSAPP', 'MEMBER', m.member_name, m.mobile_number, 'Confirmed over WhatsApp.', p.id
from members m, profiles p where m.member_id = 'T0004' and p.clerk_user_id = 'seed_test_faqi';

insert into monthly_followups (member_id, manager_id, month, year, follow_up_date, follow_up_status, follow_up_method, contacted_person_type, contacted_person_name, contacted_person_phone, remarks, created_by)
select m.id, m.assigned_manager_id, extract(month from current_date)::int, extract(year from current_date)::int,
  current_date, 'NOT_INTERESTED', 'PHONE', 'MEMBER', m.member_name, m.mobile_number, 'Asked not to be contacted this month.', p.id
from members m, profiles p where m.member_id = 'T0006' and p.clerk_user_id = 'seed_test_anees';
