DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM (
        'active',
        'inactive',
        'suspended',
        'withdrawn',
        'graduated'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM (
        'male',
        'female'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE RESTRICT,

    student_number VARCHAR(50) UNIQUE NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) NOT NULL,

    date_of_birth DATE NOT NULL,
    gender gender_enum NOT NULL,
    national_id VARCHAR(100) UNIQUE NOT NULL,

    phone VARCHAR(20),

    address TEXT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,

    department VARCHAR(255) NOT NULL,
    faculty VARCHAR(255) NOT NULL,
    current_level VARCHAR(50) NOT NULL,
    actual_study_duration_in_years INT NOT NULL,

    enrollment_status enrollment_status NOT NULL DEFAULT 'active',
    enrollment_date DATE NOT NULL,
    expected_graduation_date DATE NOT NULL,
    actual_graduation_date DATE NOT NULL,

    photo_url VARCHAR(500),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_status ON students(enrollment_status);
