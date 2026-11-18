-- =====================================================================
-- Seed data — ONLY verified information. Idempotent.
-- Projects are intentionally NOT seeded: they stay empty until real
-- projects are added through the admin interface or API.
-- =====================================================================

INSERT INTO profile (
    id, full_name, university, department,
    academic_start_year, academic_end_year, cgpa, cgpa_scale
) VALUES (
    1, 'Saifuzzaman Kaif', 'Independent University, Bangladesh', 'Computer Science and Engineering',
    2024, 2028, 3.65, 4.00
)
ON CONFLICT (id) DO UPDATE SET
    full_name           = EXCLUDED.full_name,
    university          = EXCLUDED.university,
    department          = EXCLUDED.department,
    academic_start_year = EXCLUDED.academic_start_year,
    academic_end_year   = EXCLUDED.academic_end_year,
    cgpa                = EXCLUDED.cgpa,
    cgpa_scale          = EXCLUDED.cgpa_scale;

INSERT INTO skills (name, category, display_order) VALUES
    ('Python', 'Programming Languages', 1),
    ('Java',   'Programming Languages', 2),
    ('HTML',   'Web Development',       3),
    ('SQL',    'Database',              4)
ON CONFLICT (name, category) DO UPDATE SET
    display_order = EXCLUDED.display_order;

-- No date, issuer details, certificate ID or activity details are stored
-- because none have been verified. certificate_url can be set later.
INSERT INTO achievements (title, award_level, description, certificate_url, display_order) VALUES
    ('The Duke of Edinburgh''s International Award', 'Bronze', NULL, NULL, 1)
ON CONFLICT (title) DO UPDATE SET
    award_level   = EXCLUDED.award_level,
    display_order = EXCLUDED.display_order;
