CREATE TABLE IF NOT EXISTS identity_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    certificate_pem TEXT NOT NULL,
    chain_pem TEXT NOT NULL,
    fingerprint TEXT NOT NULL UNIQUE,
    subject_distinguished_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_certificates_wallet
    ON identity_certificates (wallet_address);

CREATE INDEX IF NOT EXISTS idx_identity_certificates_fingerprint
    ON identity_certificates (fingerprint);