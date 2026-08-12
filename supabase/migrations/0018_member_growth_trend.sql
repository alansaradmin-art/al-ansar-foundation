-- Admin Dashboard: "Member Growth Trend" widget — new members added per
-- month for a given year. Server-side aggregation (same generate_series
-- pattern as month_wise_report in 0006_dashboard_functions.sql) so the
-- dashboard never has to pull the full member list client-side to bucket
-- it by month, keeping this scalable past 500+ members.

create function member_growth_trend(p_year smallint)
returns table (
  month smallint,
  year smallint,
  new_members bigint
) as $$
  select
    gs.month::smallint,
    p_year,
    (select count(*) from members m
     where extract(month from m.created_at) = gs.month
       and extract(year from m.created_at) = p_year)
  from generate_series(1, 12) as gs(month)
  order by gs.month
$$ language sql stable;
