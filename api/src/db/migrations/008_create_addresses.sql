CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    street VARCHAR(255),
    district VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),

    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,

    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

CREATE INDEX IF NOT EXISTS idx_addresses_city ON addresses(city);
CREATE INDEX IF NOT EXISTS idx_addresses_country ON addresses(country);
CREATE INDEX IF NOT EXISTS idx_addresses_postal_code ON addresses(postal_code);
