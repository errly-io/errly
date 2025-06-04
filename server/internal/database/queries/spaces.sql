-- name: GetSpace :one
SELECT * FROM spaces 
WHERE id = $1 LIMIT 1;

-- name: GetSpaceBySlug :one
SELECT * FROM spaces 
WHERE slug = $1 LIMIT 1;

-- name: ListSpaces :many
SELECT * FROM spaces
ORDER BY created_at DESC;

-- name: CreateSpace :one
INSERT INTO spaces (
  name, slug, description, settings
) VALUES (
  $1, $2, $3, $4
)
RETURNING *;

-- name: UpdateSpace :one
UPDATE spaces 
SET name = $2, description = $3, settings = $4, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteSpace :exec
DELETE FROM spaces
WHERE id = $1;
