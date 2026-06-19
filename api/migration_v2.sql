-- Run once on existing databases (phpMyAdmin or mysql CLI)
ALTER TABLE roommates ADD COLUMN move_out_date VARCHAR(32) NOT NULL DEFAULT '' AFTER join_date;
ALTER TABLE roommates ADD COLUMN note TEXT NULL AFTER move_out_date;
ALTER TABLE bills ADD COLUMN title VARCHAR(120) NULL AFTER month_label;
