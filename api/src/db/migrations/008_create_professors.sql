DO $$ BEGIN
    CREATE TYPE employment_type_enum AS ENUM (
        'full_time',
        'part_time',
        'adjunct',
        'visiting',
        'contract'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE professor_rank_enum AS ENUM (
        'Assist. Prof',
        'Assoc. Prof',
        'Prof',
        'Lecturer',
        'Instructor'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS professors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,

    employee_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL, --(e.g., Dr., Prof., Mr., Ms.)

    rank professor_rank_enum NOT NULL,

    specialization VARCHAR(255),
    hire_date DATE NOT NULL,
    employment_type employment_type_enum NOT NULL DEFAULT 'full_time',
    
    office_location VARCHAR(255),
    office_hours TEXT,
    
    bio TEXT,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professors_user_id ON professors(user_id);
CREATE INDEX IF NOT EXISTS idx_professors_academy_id ON professors(academy_id);
CREATE INDEX IF NOT EXISTS idx_professors_department_id ON professors(department_id);
CREATE INDEX IF NOT EXISTS idx_professors_employee_num ON professors(employee_number);
CREATE INDEX IF NOT EXISTS idx_professors_title ON professors(title);
CREATE INDEX IF NOT EXISTS idx_professors_is_active ON professors(is_active);

CREATE OR REPLACE FUNCTION check_professor_hire_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hire_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'hire_date cannot be in the future';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_professors_hire_date ON professors;
CREATE TRIGGER trg_professors_hire_date
BEFORE INSERT OR UPDATE ON professors
FOR EACH ROW
EXECUTE FUNCTION check_professor_hire_date();