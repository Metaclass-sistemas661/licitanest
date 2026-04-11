\pset format unaligned
\pset tuples_only on
SELECT table_name || ': ' || string_agg(column_name, ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' GROUP BY table_name ORDER BY table_name;
