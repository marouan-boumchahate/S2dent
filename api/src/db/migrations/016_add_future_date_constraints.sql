-- Migration to reject future dates for professors' hire_date and students' enrollment_date

-- 1. Professors hire_date trigger
CREATE OR REPLACE FUNCTION check_professor_hire_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hire_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'hire_date cannot be in the future';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_professors_hire_date ON professors;
CREATE TRIGGER trg_professors_hire_date
BEFORE INSERT OR UPDATE ON professors
FOR EACH ROW
EXECUTE FUNCTION check_professor_hire_date();


-- 2. Students enrollment_date trigger
CREATE OR REPLACE FUNCTION check_student_enrollment_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.enrollment_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'enrollment_date cannot be in the future';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_students_enrollment_date ON students;
CREATE TRIGGER trg_students_enrollment_date
BEFORE INSERT OR UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION check_student_enrollment_date();
