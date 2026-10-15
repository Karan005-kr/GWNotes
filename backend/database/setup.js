require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function columnExists(connection, dbName, tableName, columnName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [dbName, tableName, columnName]
  );
  return Boolean(rows[0]);
}

async function tableExists(connection, dbName, tableName) {
  const [rows] = await connection.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=? LIMIT 1`,
    [dbName, tableName]
  );
  return Boolean(rows[0]);
}

async function migrateAdminAccess(connection, dbName) {
  if (!(await tableExists(connection, dbName, 'admins'))) return;

  if (!(await columnExists(connection, dbName, 'admins', 'last_login_at'))) {
    await connection.query('ALTER TABLE admins ADD COLUMN last_login_at DATETIME NULL AFTER is_active');
  }
  if (!(await columnExists(connection, dbName, 'admins', 'created_by'))) {
    await connection.query('ALTER TABLE admins ADD COLUMN created_by BIGINT UNSIGNED NULL AFTER last_login_at');
  }

  // Make the migration safe for databases created by older versions that used ADMIN.
  await connection.query(
    "ALTER TABLE admins MODIFY COLUMN role ENUM('SUPER_ADMIN','ADMIN','UPLOADER') NOT NULL DEFAULT 'UPLOADER'"
  );
  await connection.query("UPDATE admins SET role='UPLOADER' WHERE role='ADMIN'");
  await connection.query(
    "ALTER TABLE admins MODIFY COLUMN role ENUM('SUPER_ADMIN','UPLOADER') NOT NULL DEFAULT 'UPLOADER'"
  );

  await connection.query(`
    CREATE TABLE IF NOT EXISTS login_history (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      admin_id BIGINT UNSIGNED NULL,
      attempted_email VARCHAR(255) NULL,
      login_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      logout_time DATETIME NULL,
      status ENUM('SUCCESS','FAILED') NOT NULL DEFAULT 'SUCCESS',
      ip_address VARCHAR(100) NULL,
      user_agent TEXT NULL,
      PRIMARY KEY (id),
      KEY idx_login_admin (admin_id),
      KEY idx_login_time (login_time),
      KEY idx_login_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Older manually-created login_history tables may have fewer columns.
  if (!(await columnExists(connection, dbName, 'login_history', 'attempted_email'))) {
    await connection.query('ALTER TABLE login_history ADD COLUMN attempted_email VARCHAR(255) NULL AFTER admin_id');
  }
  if (!(await columnExists(connection, dbName, 'login_history', 'logout_time'))) {
    await connection.query('ALTER TABLE login_history ADD COLUMN logout_time DATETIME NULL AFTER login_time');
  }
  if (!(await columnExists(connection, dbName, 'login_history', 'ip_address'))) {
    await connection.query('ALTER TABLE login_history ADD COLUMN ip_address VARCHAR(100) NULL AFTER status');
  }
  if (!(await columnExists(connection, dbName, 'login_history', 'user_agent'))) {
    await connection.query('ALTER TABLE login_history ADD COLUMN user_agent TEXT NULL AFTER ip_address');
  }

  // Failed logins can have no matching admin account.
  await connection.query('ALTER TABLE login_history MODIFY COLUMN admin_id BIGINT UNSIGNED NULL');
}

async function main() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  const dbName = (process.env.DB_NAME || 'studyvault').replace(/[^a-zA-Z0-9_]/g, '');
  const connection = await mysql.createConnection(config);

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${dbName}\``);

    const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
    const seed = await fs.readFile(path.join(__dirname, 'seed.sql'), 'utf8');

    await connection.query(schema);
    await migrateAdminAccess(connection, dbName);
    await connection.query(seed);

    const adminName = process.env.SEED_ADMIN_NAME || 'StudyVault Admin';
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@studyvault.local').toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await connection.execute(
      `INSERT INTO admins (name,email,password_hash,role,is_active)
       VALUES (?,?,?,'SUPER_ADMIN',1)
       ON DUPLICATE KEY UPDATE
         name=VALUES(name),
         role='SUPER_ADMIN',
         is_active=1`,
      [adminName, adminEmail, passwordHash]
    );

    console.log(`Database '${dbName}' is ready.`);
    console.log(`Development SUPER_ADMIN: ${adminEmail}`);
    console.log('Admin roles, login history, universities, courses and sample subjects are ready.');
    console.log('Existing user-created academic data is preserved.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Database setup failed:', error.message);
  process.exit(1);
});
