-- Phone numbers stop being guessed. Historically members.mobile_number/
-- added_by_phone/reference_contact_phone were stored country-code-stripped
-- (normalizeMobileNumber, api/_lib/phone.ts) and the dial code was
-- re-guessed from the stored digit count whenever a full international
-- number was needed (toWhatsAppNumber) — ambiguous for any two countries
-- that share a local-number length (Saudi/UAE both 9 digits, Qatar/
-- Kuwait/Bahrain/Oman all 8). From now on the country is captured
-- explicitly at entry time (a picker, not a guess) and stored alongside
-- the already-local-only number, so the dial code is a deterministic
-- lookup instead of a guess. See src/lib/countries.ts for the country
-- table this pairs with.
--
-- managers.phone never went through any stripping at all (unlike the
-- members columns above), so its backfill below additionally has to
-- detect and strip a leading dial code before it can determine a country.

alter table members add column mobile_country text;
alter table members add column added_by_country text;
alter table members add column reference_contact_country text;
alter table managers add column phone_country text;
-- Only relevant when contacted_person_type = 'OTHER' (every other type
-- auto-fills contacted_person_phone from a member/manager whose own
-- country is one of the columns above) — no backfill needed, since a
-- pre-existing contacted_person_phone here was never reliably attributable
-- to any one country any more than the columns above were, and this one
-- has no digit-count-based fallback to lean on (free text, never
-- normalized at all).
alter table monthly_followups add column contacted_person_country text;

-- Backfill only where reliably determinable. A bare 10-digit local number
-- is unambiguously India in the existing 7-country table (the only
-- 10-digit entry) — every other length (8 or 9 digits, the Gulf
-- countries) is genuinely ambiguous with no country ever recorded to
-- disambiguate it, so those rows are deliberately left NULL rather than
-- guessed. This foundation's member base is overwhelmingly Indian, so
-- this is expected to resolve the large majority of existing rows.
update members set mobile_country = 'IN'
  where mobile_country is null and mobile_number is not null
    and length(regexp_replace(mobile_number, '\D', '', 'g')) = 10;

update members set added_by_country = 'IN'
  where added_by_country is null and added_by_phone is not null
    and length(regexp_replace(added_by_phone, '\D', '', 'g')) = 10;

update members set reference_contact_country = 'IN'
  where reference_contact_country is null and reference_contact_phone is not null
    and length(regexp_replace(reference_contact_phone, '\D', '', 'g')) = 10;

-- managers.phone: strip a detected dial code first (mirroring
-- normalizeMobileNumber's own rule — an explicit "+"/"00" prefix, or an
-- exact digit-count match for that code's local length), same priority
-- order as the app's COUNTRY_CODES table, before falling back to the bare
-- 10-digit-is-India rule used above.
with digits as (
  select id, phone,
    (trim(phone) like '+%' or regexp_replace(phone, '\D', '', 'g') like '00%') as has_intl_prefix,
    case when regexp_replace(phone, '\D', '', 'g') like '00%'
      then substring(regexp_replace(phone, '\D', '', 'g') from 3)
      else regexp_replace(phone, '\D', '', 'g')
    end as raw_digits
  from managers
  where phone_country is null
),
-- Each CTE below only ever references the PREVIOUS CTE's own output
-- columns (never a sibling column computed in the same select list, which
-- Postgres doesn't allow) — that's why this is split into detect-then-
-- resolve stages instead of one flat case expression.
matched_code as (
  select id, raw_digits,
    case
      when raw_digits like '91%' and (has_intl_prefix or length(raw_digits) = 12) then 'IN'
      when raw_digits like '966%' and (has_intl_prefix or length(raw_digits) = 12) then 'SA'
      when raw_digits like '971%' and (has_intl_prefix or length(raw_digits) = 12) then 'AE'
      when raw_digits like '974%' and (has_intl_prefix or length(raw_digits) = 11) then 'QA'
      when raw_digits like '965%' and (has_intl_prefix or length(raw_digits) = 11) then 'KW'
      when raw_digits like '973%' and (has_intl_prefix or length(raw_digits) = 11) then 'BH'
      when raw_digits like '968%' and (has_intl_prefix or length(raw_digits) = 11) then 'OM'
      else null
    end as detected_country
  from digits
),
resolved as (
  select id,
    coalesce(detected_country, case when detected_country is null and length(raw_digits) = 10 then 'IN' end) as country,
    case
      when detected_country = 'IN' then substring(raw_digits from 3)
      when detected_country in ('SA', 'AE', 'QA', 'KW', 'BH', 'OM') then substring(raw_digits from 4)
      when detected_country is null and length(raw_digits) = 10 then raw_digits
      else null
    end as local_number
  from matched_code
)
update managers m
set phone_country = resolved.country,
    phone = coalesce(resolved.local_number, m.phone)
from resolved
where m.id = resolved.id and resolved.country is not null;

-- Uniqueness moves from mobile_number alone to (mobile_country,
-- mobile_number) — a shared local number in two different (or two
-- still-unknown/NULL) countries is no longer a false collision. Postgres
-- never treats two NULLs as equal in a unique constraint, so legacy
-- NULL-country rows don't newly conflict with each other either.
alter table members drop constraint if exists members_mobile_number_key;
alter table members add constraint members_mobile_country_number_key unique (mobile_country, mobile_number);
