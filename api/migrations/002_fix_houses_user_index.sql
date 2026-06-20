-- Fix for: Cannot drop index 'user_id' (needed in a foreign key constraint)
-- Run this in phpMyAdmin AFTER 002_multi_home_admin.sql if that step failed.
--
-- If the FK name differs, run first:  SHOW CREATE TABLE houses;
-- Then replace houses_ibfk_1 below with the actual CONSTRAINT name.

ALTER TABLE houses DROP FOREIGN KEY houses_ibfk_1;

ALTER TABLE houses DROP INDEX user_id;

ALTER TABLE houses ADD INDEX idx_houses_user (user_id);

ALTER TABLE houses
  ADD CONSTRAINT houses_user_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Safe to re-run if earlier import stopped before these:
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

-- Promote your account (edit email):
-- UPDATE users SET role = 'super_admin' WHERE email = 'you@example.com';
