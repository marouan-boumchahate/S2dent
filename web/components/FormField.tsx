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
  disabled?: boolean; // New prop to lock down field interaction
  error?: string;
}

export default function FormField({
  label, 
  type = 'text', 
  value, 
  onChange, 
  required, 
  options, 
  maxLength, 
  placeholder, 
  isDate, 
  isTextarea,
  disabled = false, // Defaulting to active
  error
}: FormFieldProps) {
  const baseClass = `w-full bg-navy p-3 rounded-lg border ${
    error ? 'border-red-500 focus:border-red-500' : 'border-borderLine focus:border-electric'
  } text-textLight outline-none transition disabled:opacity-50 disabled:cursor-not-allowed`;

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
            disabled={disabled} // Locks the calendar overlay click actions
          />
        </div>
      ) : options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${baseClass} cursor-pointer`}
          required={required}
          disabled={disabled} // Freezes the dropdown menu selection list
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
          disabled={disabled} // Disables typing inside textareas
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
          disabled={disabled} // Disables typing inside typical inputs
        />
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}