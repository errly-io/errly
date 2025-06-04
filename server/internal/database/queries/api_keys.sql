-- name: GetAPIKey :one
SELECT * FROM api_keys 
WHERE id = $1 LIMIT 1;

-- name: GetAPIKeyByHash :one
SELECT * FROM api_keys 
WHERE key_hash = $1 LIMIT 1;

-- name: GetAPIKeyByPrefix :one
SELECT * FROM api_keys 
WHERE key_prefix = $1 LIMIT 1;

-- name: ListAPIKeysByProject :many
SELECT * FROM api_keys
WHERE project_id = $1
ORDER BY created_at DESC;

-- name: CreateAPIKey :one
INSERT INTO api_keys (
  name, key_hash, key_prefix, project_id, scopes, expires_at
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: UpdateAPIKeyLastUsed :exec
UPDATE api_keys 
SET last_used_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: DeleteAPIKey :exec
DELETE FROM api_keys
WHERE id = $1;
