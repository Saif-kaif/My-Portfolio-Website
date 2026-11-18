/** Storage for contact form submissions. */
export function createContactRepository(db) {
  async function create({ name, email, message }) {
    const { rows } = await db.query(
      `INSERT INTO contact_messages (sender_name, sender_email, message)
       VALUES ($1, $2, $3)
    RETURNING id, created_at`,
      [name, email, message],
    );
    return rows[0];
  }

  async function list({ limit, offset }) {
    const [{ rows }, countResult] = await Promise.all([
      db.query(
        `SELECT id, sender_name, sender_email, message, created_at
           FROM contact_messages
          ORDER BY created_at DESC, id DESC
          LIMIT $1 OFFSET $2`,
        [limit, offset],
      ),
      db.query('SELECT count(*)::int AS total FROM contact_messages'),
    ]);
    return { rows, total: countResult.rows[0]?.total ?? 0 };
  }

  async function remove(id) {
    const { rowCount } = await db.query('DELETE FROM contact_messages WHERE id = $1', [id]);
    return rowCount > 0;
  }

  return { create, list, remove };
}
