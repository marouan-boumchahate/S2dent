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

    user_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT,

    wallet_address VARCHAR(42) UNIQUE,
    role user_role NOT NULL,
    
    nonce VARCHAR(64),
    nonce_expires_at TIMESTAMP,

    issue_identity_tx_hash VARCHAR(66),
    revoke_identity_tx_hash VARCHAR(66) DEFAULT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_wallet_address ON identities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_identities_role ON identities(role);