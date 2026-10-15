const fs = require('fs');
const mysql = require('mysql2/promise');
const { env } = require('./env');

function buildSslConfig() {
  if (!env.DB_SSL) return undefined;

  const ssl = {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  };

  if (env.DB_SSL_CA_ABSOLUTE_PATH) {
    if (!fs.existsSync(env.DB_SSL_CA_ABSOLUTE_PATH)) {
      throw new Error(
        `Database SSL CA file not found: ${env.DB_SSL_CA_ABSOLUTE_PATH}`
      );
    }

    ssl.ca = fs.readFileSync(env.DB_SSL_CA_ABSOLUTE_PATH, 'utf8');
  }

  return ssl;
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
});

async function testDatabaseConnection() {
  const connection = await pool.getConnection();

  try {
    await connection.query('SELECT 1');
  } finally {
    connection.release();
  }
}

module.exports = { pool, testDatabaseConnection };
