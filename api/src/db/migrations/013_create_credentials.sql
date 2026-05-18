DO $$ BEGIN
    CREATE TYPE credential_type AS ENUM (
        'attendance','enrollment','degree',
        'achievement','certificate','transcript'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE credential_status AS ENUM (
        'pending','issued', 'revoked'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type credential_type NOT NULL,
    description TEXT,
    
    locale VARCHAR(10) DEFAULT 'en',

    authorizer_wallet_address VARCHAR(42) NOT NULL, -- academy wallet address
    issuer_wallet_address VARCHAR(42) NOT NULL,

    student_wallet_address VARCHAR(42) NOT NULL,
    credential_index INTEGER,

    issue_tx_hash VARCHAR(66),
    issued_at TIMESTAMPTZ,
    
    revoke_tx_hash VARCHAR(66),
    revocation_reason TEXT,
    revoked_at TIMESTAMPTZ,

    status credential_status,

    payload JSONB NOT NULL,
    payload_hash VARCHAR(66),
    encrypted_payload Text,
    signature VARCHAR(132),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credentials_type ON credentials(type);
CREATE INDEX idx_credentials_authorizer ON credentials(authorizer_wallet_address);
CREATE INDEX idx_credentials_issuer ON credentials(issuer_wallet_address);
CREATE INDEX idx_credentials_student ON credentials(student_wallet_address);
CREATE INDEX idx_credentials_status ON credentials(status);
CREATE INDEX idx_credentials_payload ON credentials USING GIN(payload);