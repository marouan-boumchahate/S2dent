DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'student', 
        'professor', 
        'academy',
        'system_admin'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_address VARCHAR(42) UNIQUE,
    
    is_identity_issued BOOLEAN DEFAULT FALSE,
    identity_tx_hash VARCHAR(66),
    
    nonce VARCHAR(64),
    nonce_expires_at TIMESTAMP,

    role user_role NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identities_wallet_address ON identities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_identities_role ON identities(role);