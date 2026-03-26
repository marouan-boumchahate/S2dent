interface FormFieldProps {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  options?: string[]
}

export default function FormField({
  label, type = 'text', value, onChange, required, options
}: FormFieldProps) {
  const baseClass = "w-full bg-navy p-3 rounded-lg border border-borderLine text-textLight focus:border-electric outline-none transition"

  return (
    <div>
      <label className="block text-textMuted mb-2">{label}</label>
      {options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${baseClass} cursor-pointer`}
          required={required}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseClass}
          required={required}
        />
      )}
    </div>
  )
}