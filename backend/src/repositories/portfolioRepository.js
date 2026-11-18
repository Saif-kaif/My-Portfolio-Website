/** Read access to profile, skills and achievements. All queries are parameterized. */
export function createPortfolioRepository(db) {
  async function getProfile() {
    const { rows } = await db.query(
      `SELECT full_name, university, department, academic_start_year, academic_end_year, cgpa, cgpa_scale
         FROM profile
        WHERE id = 1`,
    );
    return rows[0] ?? null;
  }

  async function listSkills() {
    const { rows } = await db.query(
      `SELECT id, name, category, display_order
         FROM skills
        ORDER BY display_order, name`,
    );
    return rows;
  }

  async function listAchievements() {
    const { rows } = await db.query(
      `SELECT id, title, award_level, description, certificate_url, display_order
         FROM achievements
        ORDER BY display_order, id`,
    );
    return rows;
  }

  async function updateAchievementCertificate(id, certificateUrl) {
    const { rows } = await db.query(
      `UPDATE achievements
          SET certificate_url = $2
        WHERE id = $1
    RETURNING id, title, award_level, description, certificate_url, display_order`,
      [id, certificateUrl],
    );
    return rows[0] ?? null;
  }

  return { getProfile, listSkills, listAchievements, updateAchievementCertificate };
}
