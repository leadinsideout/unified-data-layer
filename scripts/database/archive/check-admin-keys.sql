-- Check API keys for admin user

SELECT
  ak.id,
  ak.name,
  ak.key_prefix,
  ak.is_revoked,
  ak.created_at,
  a.email as admin_email,
  a.name as admin_name
FROM api_keys ak
JOIN admins a ON a.id = ak.admin_id
WHERE a.email = 'admin@insideoutdev.com'
ORDER BY ak.created_at DESC;
