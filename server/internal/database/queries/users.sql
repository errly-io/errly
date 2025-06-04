-- name: GetUser :one
SELECT * FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 LIMIT 1;

-- name: ListUsersBySpace :many
SELECT * FROM users
WHERE space_id = $1
ORDER BY created_at DESC;

-- name: CreateUser :one
INSERT INTO users (
  email, name, avatar_url, space_id, role, settings
) VALUES (
  $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: UpdateUser :one
UPDATE users
SET name = $2, avatar_url = $3, role = $4, settings = $5, updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;
