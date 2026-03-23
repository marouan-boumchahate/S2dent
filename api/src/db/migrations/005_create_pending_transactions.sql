DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'pending',
        'confirmed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pending_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash TEXT NOT NULL UNIQUE,
    payload JSONB NOT NULL,
    status transaction_status DEFAULT transaction_status('pending'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);