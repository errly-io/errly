-- name: GetProject :one
SELECT * FROM projects
WHERE id = $1 LIMIT 1;

-- name: GetProjectBySlug :one
SELECT * FROM projects
WHERE space_id = $1 AND slug = $2 LIMIT 1;

-- name: ListProjectsBySpace :many
SELECT * FROM projects
WHERE space_id = $1
ORDER BY created_at DESC;

-- name: CreateProject :one
INSERT INTO projects (
  name, slug, space_id, platform, framework, description, settings
) VALUES (
  $1, $2, $3, $4, $5, $6, $7
)
RETURNING *;

-- name: UpdateProject :one
UPDATE projects
SET name = $2, platform = $3, framework = $4, description = $5, settings = $6, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteProject :exec
DELETE FROM projects
WHERE id = $1;
