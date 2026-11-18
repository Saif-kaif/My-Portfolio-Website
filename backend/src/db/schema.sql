-- =====================================================================
-- Saifuzzaman Kaif Portfolio — PostgreSQL schema
-- Idempotent: safe to run multiple times (requires PostgreSQL 12+).
-- =====================================================================

-- ---------------------------------------------------------------------
-- profile: exactly one row describing the portfolio owner
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile (
    id                  SMALLINT     PRIMARY KEY DEFAULT 1,
    full_name           VARCHAR(120) NOT NULL,
    university          VARCHAR(200) NOT NULL,
    department          VARCHAR(200) NOT NULL,
    academic_start_year SMALLINT     NOT NULL,
    academic_end_year   SMALLINT     NOT NULL,
    cgpa                NUMERIC(3,2) NOT NULL,
    cgpa_scale          NUMERIC(3,2) NOT NULL DEFAULT 4.00,
    CONSTRAINT profile_single_row  CHECK (id = 1),
    CONSTRAINT profile_years_valid CHECK (
        academic_start_year BETWEEN 1900 AND 2100
        AND academic_end_year BETWEEN academic_start_year AND 2100
    ),
    CONSTRAINT profile_cgpa_valid  CHECK (cgpa_scale > 0 AND cgpa >= 0 AND cgpa <= cgpa_scale)
);

-- ---------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skills (
    id            INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(60) NOT NULL,
    category      VARCHAR(60) NOT NULL,
    display_order INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT skills_name_not_blank     CHECK (btrim(name) <> ''),
    CONSTRAINT skills_category_not_blank CHECK (btrim(category) <> ''),
    CONSTRAINT skills_name_category_key  UNIQUE (name, category)
);
CREATE INDEX IF NOT EXISTS skills_display_order_idx ON skills (display_order, name);

-- ---------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS achievements (
    id              INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title           VARCHAR(200)  NOT NULL,
    award_level     VARCHAR(60),
    description     TEXT,
    certificate_url VARCHAR(2048),
    display_order   INTEGER       NOT NULL DEFAULT 0,
    CONSTRAINT achievements_title_key UNIQUE (title),
    CONSTRAINT achievements_certificate_url_scheme
        CHECK (certificate_url IS NULL OR certificate_url ~* '^(https?://|/[^/])')
);
CREATE INDEX IF NOT EXISTS achievements_display_order_idx ON achievements (display_order, id);

-- ---------------------------------------------------------------------
-- projects (intentionally empty until real projects are added)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id           INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title        VARCHAR(150)  NOT NULL,
    description  TEXT          NOT NULL,
    technologies TEXT[]        NOT NULL DEFAULT '{}',
    image_url    VARCHAR(2048),
    github_url   VARCHAR(2048),
    demo_url     VARCHAR(2048),
    project_date DATE,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT projects_title_not_blank     CHECK (btrim(title) <> ''),
    CONSTRAINT projects_description_length  CHECK (char_length(description) BETWEEN 1 AND 5000),
    CONSTRAINT projects_technologies_count  CHECK (cardinality(technologies) <= 20),
    CONSTRAINT projects_image_url_scheme    CHECK (image_url  IS NULL OR image_url  ~* '^(https?://|/[^/])'),
    CONSTRAINT projects_github_url_scheme   CHECK (github_url IS NULL OR github_url ~* '^https?://'),
    CONSTRAINT projects_demo_url_scheme     CHECK (demo_url   IS NULL OR demo_url   ~* '^https?://')
);
CREATE INDEX IF NOT EXISTS projects_listing_idx ON projects (project_date DESC NULLS LAST, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;
CREATE TRIGGER projects_set_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------
-- contact_messages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_name  VARCHAR(100) NOT NULL,
    sender_email VARCHAR(254) NOT NULL,
    message      TEXT         NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT contact_messages_name_length    CHECK (char_length(sender_name) BETWEEN 2 AND 100),
    CONSTRAINT contact_messages_email_format   CHECK (sender_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    CONSTRAINT contact_messages_message_length CHECK (char_length(message) BETWEEN 10 AND 2000)
);
CREATE INDEX IF NOT EXISTS contact_messages_created_at_idx ON contact_messages (created_at DESC);

-- ---------------------------------------------------------------------
-- Administration: users (scrypt password hashes) and server-side sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username      VARCHAR(64) NOT NULL,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    CONSTRAINT admin_users_username_key UNIQUE (username)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash CHAR(64)    PRIMARY KEY,           -- SHA-256 of the session token; raw token is never stored
    admin_id   INTEGER     NOT NULL REFERENCES admin_users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS admin_sessions_admin_id_idx   ON admin_sessions (admin_id);
