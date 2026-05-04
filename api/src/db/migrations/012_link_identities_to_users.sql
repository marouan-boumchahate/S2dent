ALTER TABLE identities
    ADD COLUMN IF NOT EXISTS user_id UUID NULL
    REFERENCES users(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
