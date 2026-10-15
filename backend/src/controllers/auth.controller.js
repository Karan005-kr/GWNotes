const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/audit.service');

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || null;
}

async function recordLogin({ adminId = null, email, status, req }) {
  try {
    await pool.execute(
      `INSERT INTO login_history (admin_id, attempted_email, status, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [adminId, email || null, status, clientIp(req), req.headers['user-agent'] || null]
    );
  } catch (error) {
    console.error('Login history write failed:', error.message);
  }
}

async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password } = req.body;

  const [rows] = await pool.execute(
    `SELECT id, name, email, password_hash, role, is_active
     FROM admins
     WHERE email = ?
     LIMIT 1`,
    [email]
  );

  const admin = rows[0];

  if (!admin) {
    await recordLogin({ email, status: 'FAILED', req });
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!admin.is_active) {
    await recordLogin({ adminId: admin.id, email, status: 'FAILED', req });
    throw new ApiError(403, 'This admin account is disabled.');
  }

  const passwordMatches = await bcrypt.compare(password, admin.password_hash);
  if (!passwordMatches) {
    await recordLogin({ adminId: admin.id, email, status: 'FAILED', req });
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = jwt.sign(
    {
      sub: String(admin.id),
      id: admin.id,
      email: admin.email,
      role: admin.role,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  await pool.execute('UPDATE admins SET last_login_at = NOW() WHERE id = ?', [admin.id]);
  await recordLogin({ adminId: admin.id, email, status: 'SUCCESS', req });
  await writeAudit({
    adminId: admin.id,
    entityType: 'ACCOUNT',
    entityId: admin.id,
    action: 'LOGIN',
    metadata: { role: admin.role },
  });

  return res.json({
    success: true,
    message: 'Login successful.',
    data: {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    },
  });
}

async function me(req, res) {
  return res.json({
    success: true,
    message: 'Authenticated admin.',
    data: req.admin,
  });
}

async function logout(req, res) {
  try {
    await pool.execute(
      `UPDATE login_history
       SET logout_time = NOW()
       WHERE admin_id = ? AND status = 'SUCCESS' AND logout_time IS NULL
       ORDER BY id DESC
       LIMIT 1`,
      [req.admin.id]
    );
  } catch (error) {
    console.error('Logout history update failed:', error.message);
  }

  await writeAudit({
    adminId: req.admin.id,
    entityType: 'ACCOUNT',
    entityId: req.admin.id,
    action: 'LOGOUT',
  });

  return res.json({
    success: true,
    message: 'Logged out successfully. Remove the bearer token on the client.',
  });
}

module.exports = { login, me, logout };
