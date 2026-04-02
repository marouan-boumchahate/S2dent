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

    wallet_address VARCHAR(42) UNIQUE NOT NULL,

    academy_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) UNIQUE NOT NULL,
    short_name VARCHAR(50) UNIQUE NOT NULL,
    type academy_type NOT NULL,

    description TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(255),

    email VARCHAR(320) UNIQUE NOT NULL,
    phone VARCHAR(32),

    legal_name VARCHAR(255) UNIQUE NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    tax_id VARCHAR(100) UNIQUE NOT NULL,
    billing_email VARCHAR(320),

    CONSTRAINT chk_academies_short_name_uppercase CHECK (short_name = upper(short_name))
);

CREATE INDEX IF NOT EXISTS idx_academies_wallet_address ON academies(wallet_address);
CREATE INDEX IF NOT EXISTS idx_academies_academy_number ON academies(academy_number);
CREATE INDEX IF NOT EXISTS idx_academies_email ON academies(email);
CREATE INDEX IF NOT EXISTS idx_academies_name ON academies(name);
CREATE INDEX IF NOT EXISTS idx_academies_short_name ON academies(short_name);
CREATE INDEX IF NOT EXISTS idx_academies_legal_name ON academies(legal_name);
CREATE INDEX IF NOT EXISTS idx_academies_registration_number ON academies(registration_number);
CREATE INDEX IF NOT EXISTS idx_academies_tax_id ON academies(tax_id);