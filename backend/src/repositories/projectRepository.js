import { PROJECT_FIELDS } from '../utils/validation.js';

const COLUMNS =
  'id, title, description, technologies, image_url, github_url, demo_url, project_date, created_at, updated_at';

/** CRUD for projects. Column names come from a fixed whitelist; values are always parameters. */
export function createProjectRepository(db) {
  async function list() {
    const { rows } = await db.query(
      `SELECT ${COLUMNS}
         FROM projects
        ORDER BY project_date DESC NULLS LAST, created_at DESC`,
    );
    return rows;
  }

  async function findById(id) {
    const { rows } = await db.query(`SELECT ${COLUMNS} FROM projects WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async function create(project) {
    const { rows } = await db.query(
      `INSERT INTO projects (title, description, technologies, image_url, github_url, demo_url, project_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING ${COLUMNS}`,
      [
        project.title,
        project.description,
        project.technologies ?? [],
        project.image_url ?? null,
        project.github_url ?? null,
        project.demo_url ?? null,
        project.project_date ?? null,
      ],
    );
    return rows[0];
  }

  async function update(id, fields) {
    const keys = PROJECT_FIELDS.filter((key) => Object.hasOwn(fields, key));
    if (keys.length === 0) return findById(id);

    const assignments = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const { rows } = await db.query(
      `UPDATE projects SET ${assignments} WHERE id = $1 RETURNING ${COLUMNS}`,
      [id, ...keys.map((key) => fields[key])],
    );
    return rows[0] ?? null;
  }

  async function remove(id) {
    const { rowCount } = await db.query('DELETE FROM projects WHERE id = $1', [id]);
    return rowCount > 0;
  }

  return { list, findById, create, update, remove };
}
