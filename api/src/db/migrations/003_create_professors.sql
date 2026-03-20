CREATE TABLE IF NOT EXISTS professors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    academy_id UUID NOT NULL REFERENCES academies(id) ON DELETE RESTRICT,

    full_name VARCHAR(255) NOT NULL,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(255) NOT NULL,
    faculty VARCHAR(255) NOT NULL,
    title VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_professors_user_id ON professors(user_id);
CREATE INDEX IF NOT EXISTS idx_professors_academy_id ON professors(academy_id);
CREATE INDEX IF NOT EXISTS idx_professors_employee_num ON professors(employee_number);