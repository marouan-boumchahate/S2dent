DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM (
        'active',
        'inactive',
        'graduated'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,

    student_number VARCHAR(50) UNIQUE NOT NULL,

    cgpa NUMERIC(3,2) DEFAULT 0.00 CHECK (cgpa >= 0.00 AND cgpa <= 4.00),

    enrollment_status enrollment_status NOT NULL DEFAULT 'active',
    enrollment_date DATE NOT NULL,
    expected_graduation_date DATE NOT NULL,
    actual_graduation_date DATE
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_department_id ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
