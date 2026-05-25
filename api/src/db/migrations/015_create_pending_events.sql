CREATE TABLE IF NOT EXISTS pending_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    wallet_address VARCHAR(42) NOT NULL,
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_events_wallet_address ON pending_events(wallet_address);
