-- Multi-home + super admin migration (run once via phpMyAdmin)
-- Skip any statement that errors because the column/index already exists.

ALTER TABLE users
  ADD COLUMN role ENUM('user','super_admin') NOT NULL DEFAULT 'user' AFTER name;

ALTER TABLE houses
  ADD COLUMN name VARCHAR(120) NOT NULL DEFAULT 'My House' AFTER id;

-- user_id was UNIQUE (1 house per user). Drop FK first, then the unique index, then re-add FK + normal index.
-- If FK name differs, run: SHOW CREATE TABLE houses;
ALTER TABLE houses DROP FOREIGN KEY houses_ibfk_1;

ALTER TABLE houses DROP INDEX user_id;

ALTER TABLE houses ADD INDEX idx_houses_user (user_id);

ALTER TABLE houses
  ADD CONSTRAINT houses_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS house_memberships (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  house_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  role ENUM('owner','admin','member') NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_house_user (house_id, user_id),
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_memberships_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO house_memberships (house_id, user_id, role)
SELECT h.id, h.user_id, 'owner'
FROM houses h
WHERE h.user_id IS NOT NULL;

UPDATE houses h
SET h.name = COALESCE(
  NULLIF(JSON_UNQUOTE(JSON_EXTRACT(h.settings_json, '$.houseName')), ''),
  'My House'
)
WHERE h.name = 'My House' OR h.name = '';

-- Promote your account to super admin (replace email):
-- UPDATE users SET role = 'super_admin' WHERE email = 'you@example.com';
