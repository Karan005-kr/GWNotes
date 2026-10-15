-- Optional manual reference migration.
-- Normally use: npm run db:setup

ALTER TABLE admins
  MODIFY COLUMN role ENUM('SUPER_ADMIN','ADMIN','UPLOADER') NOT NULL DEFAULT 'UPLOADER';

UPDATE admins SET role='UPLOADER' WHERE role='ADMIN';

ALTER TABLE admins
  MODIFY COLUMN role ENUM('SUPER_ADMIN','UPLOADER') NOT NULL DEFAULT 'UPLOADER';

-- If these columns already exist, skip the corresponding ALTER line manually.
-- The JS setup script performs these checks automatically.
