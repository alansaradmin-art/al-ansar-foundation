-- A transaction/UPI reference represents one real-world payment and can
-- never legitimately repeat across two different donations. Partial
-- index: NULL (cash donations never carry one) never collides, and a
-- soft-deleted donation's reference can be reused by a corrected entry.
-- Global, not per-member — the reference is an external absolute
-- identifier, not member-scoped data.
create unique index donations_transaction_reference_key
  on donations (transaction_reference)
  where transaction_reference is not null and not is_deleted;
