CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE RESTRICT,

    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    faculty VARCHAR(255) NOT NULL,
    total_years INT NOT NULL,
    description TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT uq_departments_academy_code UNIQUE (academy_id, code),
    CONSTRAINT uq_departments_academy_name UNIQUE (academy_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_academy_id ON departments(academy_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_faculty ON departments(faculty);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);
