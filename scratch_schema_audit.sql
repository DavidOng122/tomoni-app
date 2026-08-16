-- Audit: what fields exist on fixed_plans that could define occurrence end time
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'fixed_plans'
ORDER BY ordinal_position;

-- Audit: what fields exist on invitations
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'invitations'
ORDER BY ordinal_position;
