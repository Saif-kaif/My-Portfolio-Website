/** Admin users and server-side sessions. */
export function createAdminRepository(db) {
  async function findUserByUsername(username) {
    const { rows } = await db.query(
      'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
      [username],
    );
    return rows[0] ?? null;
  }

  async function recordLogin(adminId) {
    await db.query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [adminId]);
  }

  async function createSession(adminId, tokenHash, expiresAt) {
    await db.query(
      'INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES ($1, $2, $3)',
      [tokenHash, adminId, expiresAt],
    );
  }

  async function findSessionAdmin(tokenHash) {
    const { rows } = await db.query(
      `SELECT u.id, u.username, s.expires_at
         FROM admin_sessions s
         JOIN admin_users u ON u.id = s.admin_id
        WHERE s.token_hash = $1
          AND s.expires_at > now()`,
      [tokenHash],
    );
    return rows[0] ?? null;
  }

  async function deleteSession(tokenHash) {
    await db.query('DELETE FROM admin_sessions WHERE token_hash = $1', [tokenHash]);
  }

  async function deleteExpiredSessions() {
    const { rowCount } = await db.query('DELETE FROM admin_sessions WHERE expires_at <= now()');
    return rowCount;
  }

  return { findUserByUsername, recordLogin, createSession, findSessionAdmin, deleteSession, deleteExpiredSessions };
}
