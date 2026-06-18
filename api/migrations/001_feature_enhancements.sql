-- Roomly feature enhancements migration
-- Run once in phpMyAdmin after upgrading. Safe to re-run only on fresh DBs.

ALTER TABLE bill_expenses
  ADD COLUMN share_mode VARCHAR(16) NOT NULL DEFAULT 'all' AFTER icon,
  ADD COLUMN shared_by JSON NULL AFTER share_mode;

ALTER TABLE bills
  ADD COLUMN announcement_title VARCHAR(120) NULL AFTER selected_roommate_ids,
  ADD COLUMN announcement_message TEXT NULL AFTER announcement_title,
  ADD COLUMN parking_snapshot JSON NULL AFTER announcement_message;
