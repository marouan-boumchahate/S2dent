ALTER TABLE students ADD COLUMN advisor_id UUID REFERENCES professors(id) ON DELETE SET NULL;
CREATE INDEX idx_students_advisor_id ON students(advisor_id);
