const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const ApiError = require('../utils/ApiError');
const { writeAudit } = require('../services/audit.service');

function parseId(value, label = 'id') {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, `Invalid ${label}.`);
  return id;
}

async function listUploaders(_req, res) {
  const [rows] = await pool.query(
    `SELECT id, name, email, role, is_active, last_login_at, created_at
     FROM admins
     WHERE role = 'UPLOADER'
     ORDER BY created_at DESC, id DESC`
  );
  res.json({ success: true, message: 'Uploaders fetched.', data: rows });
}

async function createUploader(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const [result] = await pool.execute(
      `INSERT INTO admins (name, email, password_hash, role, is_active, created_by)
       VALUES (?, ?, ?, 'UPLOADER', 1, ?)`,
      [name, email, passwordHash, req.admin.id]
    );

    await writeAudit({
      adminId: req.admin.id,
      entityType: 'ACCOUNT',
      entityId: result.insertId,
      action: 'CREATE_UPLOADER',
      metadata: { email },
    });

    res.status(201).json({
      success: true,
      message: 'Uploader created.',
      data: { id: result.insertId, name, email, role: 'UPLOADER', is_active: 1 },
    });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') {
      throw new ApiError(409, 'An admin account with this email already exists.');
    }
    throw error;
  }
}

async function setUploaderStatus(req, res) {
  const uploaderId = parseId(req.params.id, 'uploader id');
  const isActive = Boolean(req.body.is_active);

  const [rows] = await pool.execute(
    `SELECT id, role, email FROM admins WHERE id = ? LIMIT 1`,
    [uploaderId]
  );
  const uploader = rows[0];
  if (!uploader || uploader.role !== 'UPLOADER') throw new ApiError(404, 'Uploader not found.');

  await pool.execute('UPDATE admins SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, uploaderId]);
  await writeAudit({
    adminId: req.admin.id,
    entityType: 'ACCOUNT',
    entityId: uploaderId,
    action: isActive ? 'ENABLE_UPLOADER' : 'DISABLE_UPLOADER',
    metadata: { email: uploader.email },
  });

  res.json({ success: true, message: `Uploader ${isActive ? 'enabled' : 'disabled'}.` });
}

async function listAuditLogs(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 500);
  const [rows] = await pool.execute(
    `SELECT al.id, al.admin_id, a.name admin_name, a.email admin_email, a.role admin_role,
            al.entity_type, al.entity_id, al.action, al.metadata, al.created_at
     FROM audit_logs al
     LEFT JOIN admins a ON a.id = al.admin_id
     ORDER BY al.created_at DESC, al.id DESC
     LIMIT ?`,
    [limit]
  );
  res.json({ success: true, message: 'Activity logs fetched.', data: rows });
}

async function listLoginHistory(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '100', 10) || 100, 1), 500);
  const [rows] = await pool.execute(
    `SELECT lh.id, lh.admin_id, a.name admin_name, a.email admin_email, a.role admin_role,
            lh.attempted_email, lh.login_time, lh.logout_time, lh.status, lh.ip_address, lh.user_agent
     FROM login_history lh
     LEFT JOIN admins a ON a.id = lh.admin_id
     ORDER BY lh.login_time DESC, lh.id DESC
     LIMIT ?`,
    [limit]
  );
  res.json({ success: true, message: 'Login history fetched.', data: rows });
}

module.exports = {
  listUploaders,
  createUploader,
  setUploaderStatus,
  listAuditLogs,
  listLoginHistory,
};
