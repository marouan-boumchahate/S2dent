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

DO $$ BEGIN
    CREATE TYPE identity_status AS ENUM (
        'pending',
        'issued',
        'revoked',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    academy_id UUID NULL REFERENCES academies(id) ON DELETE RESTRICT,

    signature TEXT,
    wallet_address VARCHAR(42) UNIQUE,
    public_key VARCHAR(132) UNIQUE,
    role user_role NOT NULL,
    
    nonce VARCHAR(128),
    nonce_expires_at TIMESTAMP,

    issue_identity_tx_hash VARCHAR(66),
    issued_at TIMESTAMP,

    revoke_identity_tx_hash VARCHAR(66) DEFAULT NULL,
    revoked_at TIMESTAMP,
    revocation_reason TEXT,
    
    status identity_status NOT NULL DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT chk_only_one_fk CHECK (
        (academy_id IS NOT NULL AND user_id IS NULL)
        OR
        (academy_id IS NULL AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_wallet_address ON identities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_identities_role ON identities(role);