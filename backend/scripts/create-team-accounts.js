require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const accounts = [
  {
    name: 'Main Admin',
    email: 'karanje8765@gmail.com',
    password: 'Karanje@123',
    role: 'SUPER_ADMIN'
  },
  {
    name: 'Bhoomi',
    email: 'BHJ.mnverma@gmail.com',
    password: 'Bhoomi@123',
    role: 'UPLOADER'
  },
  {
    name: 'Aryan',
    email: 'aryanjamdagni0028@gmail.com',
    password: 'Sharma_sahab@123',
    role: 'UPLOADER'
  },
  {
    name: 'Anushka',
    email: 'anushkatandon08@gmail.com',
    password: 'tandon_london@123',
    role: 'UPLOADER'
  }
];

async function createTeamAccounts() {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // -------------------------------
    // MAIN SUPER ADMIN
    // -------------------------------

    const mainAdmin = accounts[0];
    const mainHash = await bcrypt.hash(mainAdmin.password, 12);

    // Check whether target main admin already exists
    const [existingTarget] = await connection.execute(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [mainAdmin.email]
    );

    let superAdminId;

    if (existingTarget.length > 0) {
      superAdminId = existingTarget[0].id;

      await connection.execute(
        `UPDATE admins
         SET name = ?,
             password_hash = ?,
             role = 'SUPER_ADMIN',
             is_active = 1
         WHERE id = ?`,
        [
          mainAdmin.name,
          mainHash,
          superAdminId
        ]
      );
    } else {
      // Find current development SUPER_ADMIN
      const [existingSuper] = await connection.execute(
        `SELECT id
         FROM admins
         WHERE role = 'SUPER_ADMIN'
         ORDER BY id ASC
         LIMIT 1`
      );

      if (existingSuper.length > 0) {
        superAdminId = existingSuper[0].id;

        // Convert existing default admin into new Main Admin
        await connection.execute(
          `UPDATE admins
           SET name = ?,
               email = ?,
               password_hash = ?,
               role = 'SUPER_ADMIN',
               is_active = 1
           WHERE id = ?`,
          [
            mainAdmin.name,
            mainAdmin.email,
            mainHash,
            superAdminId
          ]
        );
      } else {
        const [result] = await connection.execute(
          `INSERT INTO admins
           (name, email, password_hash, role, is_active)
           VALUES (?, ?, ?, 'SUPER_ADMIN', 1)`,
          [
            mainAdmin.name,
            mainAdmin.email,
            mainHash
          ]
        );

        superAdminId = result.insertId;
      }
    }

    // -------------------------------
    // THREE UPLOADERS
    // -------------------------------

    for (const account of accounts.slice(1)) {
      const passwordHash = await bcrypt.hash(account.password, 12);

      await connection.execute(
        `INSERT INTO admins
         (
           name,
           email,
           password_hash,
           role,
           is_active,
           created_by
         )
         VALUES (?, ?, ?, 'UPLOADER', 1, ?)

         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           password_hash = VALUES(password_hash),
           role = 'UPLOADER',
           is_active = 1,
           created_by = VALUES(created_by)`,
        [
          account.name,
          account.email,
          passwordHash,
          superAdminId
        ]
      );
    }

    await connection.commit();

    console.log('');
    console.log('======================================');
    console.log(' TEAM ACCOUNTS CREATED SUCCESSFULLY');
    console.log('======================================');
    console.log('');

    for (const account of accounts) {
      console.log(`${account.name}`);
      console.log(`Email: ${account.email}`);
      console.log(`Password: ${account.password}`);
      console.log(`Role: ${account.role}`);
      console.log('--------------------------------------');
    }

  } catch (error) {
    await connection.rollback();

    console.error('');
    console.error('Failed to create team accounts:');
    console.error(error.message);

    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

createTeamAccounts();