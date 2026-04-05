DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM (
        'male',
        'female'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(255) UNIQUE NOT NULL,

    date_of_birth DATE NOT NULL,
    gender gender_enum NOT NULL,
    national_id VARCHAR(100) UNIQUE NOT NULL,
    nationality VARCHAR(100) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),

    photo_url VARCHAR(500),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
