DO $$ BEGIN
    CREATE TYPE academy_type AS ENUM (
        'university',
        'college',
        'school',
        'institute',
        'online_platform',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS academies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    type academy_type NOT NULL,
    country VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    website VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_academies_user_id ON academies(user_id);
CREATE INDEX IF NOT EXISTS idx_academies_name ON academies(name);