import DatePicker from "react-datepicker";
// @ts-ignore
import "react-datepicker/dist/react-datepicker.css";

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  options?: string[];
  maxLength?: number;
  placeholder?: string;
  isDate?: boolean;
  isTextarea?: boolean;
}

export default function FormField({
  label, type = 'text', value, onChange, required, options, maxLength, placeholder, isDate, isTextarea
}: FormFieldProps) {
  const baseClass = "w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition";

  return (
    <div>
      <label className="block text-textMuted mb-2">{label}</label>
      {isDate ? (
        <div className="w-full">
          <DatePicker
            selected={value ? new Date(value) : null}
            onChange={(date: Date | null) => onChange(date ? date.toISOString().split('T')[0] : '')}
            dateFormat="yyyy-MM-dd"
            placeholderText="YYYY-MM-DD"
            className={baseClass}
            required={required}
            wrapperClassName="w-full"
          />
        </div>
      ) : options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${baseClass} cursor-pointer`}
          required={required}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt || 'Select...'}</option>
          ))}
        </select>
      ) : isTextarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${baseClass} resize-none`}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={4}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseClass}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}