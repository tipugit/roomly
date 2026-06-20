-- SaaS Super Admin platform tables (run once after 002 migrations)
-- Skip statements that error if column/table already exists.

-- ── User extensions ──────────────────────────────────────────────
ALTER TABLE users ADD COLUMN phone VARCHAR(32) NOT NULL DEFAULT '' AFTER email;
ALTER TABLE users ADD COLUMN status ENUM('active','suspended','disabled') NOT NULL DEFAULT 'active' AFTER role;
ALTER TABLE users ADD COLUMN plan_id INT UNSIGNED NULL AFTER status;
ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP NULL DEFAULT NULL AFTER created_at;

-- ── House extensions ─────────────────────────────────────────────
ALTER TABLE houses ADD COLUMN status ENUM('active','suspended','archived') NOT NULL DEFAULT 'active' AFTER name;
ALTER TABLE houses ADD COLUMN last_activity_at TIMESTAMP NULL DEFAULT NULL AFTER created_at;

-- ── Subscription plans ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  member_limit INT UNSIGNED NOT NULL DEFAULT 10,
  house_limit INT UNSIGNED NOT NULL DEFAULT 1,
  bill_limit INT UNSIGNED NOT NULL DEFAULT 50,
  storage_limit_mb INT UNSIGNED NOT NULL DEFAULT 100,
  features_json JSON NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO subscription_plans (id, slug, name, member_limit, house_limit, bill_limit, storage_limit_mb, features_json, price_monthly, sort_order) VALUES
(1, 'free', 'Free', 10, 1, 50, 100, '{"analytics":true,"parking":true,"pdfExport":true,"attachments":false}', 0, 1),
(2, 'pro', 'Pro', 50, 5, 500, 1024, '{"analytics":true,"parking":true,"pdfExport":true,"attachments":true,"prioritySupport":true}', 19.99, 2),
(3, 'enterprise', 'Enterprise', 999, 99, 99999, 10240, '{"analytics":true,"parking":true,"pdfExport":true,"attachments":true,"prioritySupport":true,"apiAccess":true}', 99.99, 3);

UPDATE users SET plan_id = 1 WHERE plan_id IS NULL;

-- ── Platform settings (key-value JSON) ───────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT UNSIGNED NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES
('features', '{"parking":true,"announcements":true,"pdfExport":true,"emailNotifications":true,"qrSharing":true,"analytics":true,"attachments":true,"supportCenter":true,"publicBillLinks":true}'),
('branding', '{"platformName":"Roomly","logoUrl":"","faviconUrl":"","loginLogoUrl":"","footerText":"© Roomly","supportEmail":"","supportPhone":"","websiteUrl":""}'),
('global', '{"defaultCurrency":"USD","dateFormat":"MM/DD/YYYY","timezone":"UTC-5 (EST)","language":"English","defaultTheme":"light","registrationEnabled":true}');

-- ── Global announcements ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_announcements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  type ENUM('info','warning','maintenance','update') NOT NULL DEFAULT 'info',
  is_pinned TINYINT(1) NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_announcements_active (expires_at, is_pinned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Email templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  template_key VARCHAR(64) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html MEDIUMTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by INT UNSIGNED NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO email_templates (template_key, name, subject, body_html) VALUES
('welcome', 'Welcome Email', 'Welcome to {{platformName}}', '<p>Hi {{name}}, welcome to {{platformName}}!</p>'),
('password_reset', 'Password Reset', 'Reset your password', '<p>Hi {{name}}, click here to reset your password.</p>'),
('bill_notification', 'Bill Notification', 'New bill available', '<p>Hi {{name}}, a new bill has been created.</p>'),
('reminder', 'Reminder Email', 'Payment reminder', '<p>Hi {{name}}, this is a friendly payment reminder.</p>'),
('account_activation', 'Account Activation', 'Activate your account', '<p>Hi {{name}}, please activate your account.</p>');

-- ── Activity logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(64) NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  meta_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_activity_action (action),
  INDEX idx_activity_created (created_at),
  INDEX idx_activity_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Immutable audit logs ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Login history ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  browser VARCHAR(120) NULL,
  device VARCHAR(120) NULL,
  location VARCHAR(120) NULL,
  is_suspicious TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_login_user (user_id),
  INDEX idx_login_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Support tickets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  subject VARCHAR(255) NOT NULL,
  status ENUM('open','pending','resolved','closed') NOT NULL DEFAULT 'open',
  priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  assigned_to INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_tickets_status (status),
  INDEX idx_tickets_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  message TEXT NOT NULL,
  attachments_json JSON NULL,
  is_staff TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket_messages (ticket_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Backups metadata ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_backups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('pending','completed','failed') NOT NULL DEFAULT 'pending',
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── File storage tracking ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stored_files (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  house_id INT UNSIGNED NULL,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(512) NOT NULL,
  mime_type VARCHAR(120) NULL,
  size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE SET NULL,
  INDEX idx_files_user (user_id),
  INDEX idx_files_size (size_bytes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Admin notifications inbox ────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NOT NULL DEFAULT '',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  meta_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_read (is_read),
  INDEX idx_notif_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
