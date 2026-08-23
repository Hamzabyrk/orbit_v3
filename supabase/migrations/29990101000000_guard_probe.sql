-- GECICI: yikici migration guard'inin gercekten engelledigini dogrulamak icin.
-- Var olmayan bir nesneyi hedefler; yanlislikla merge edilse bile zararsizdir.
drop table if exists public.__guard_probe__;
