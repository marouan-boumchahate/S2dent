interface ButtonProps {
    title: string;
    onClick?: () => void; // Made optional since type="submit" automatically handles clicks inside forms
    variant?: 'primary' | 'danger' | 'custom';
    type?: 'button' | 'submit' | 'reset';
    className?: string;
    disabled?: boolean;
}

export default function Button({ 
    title, 
    onClick, 
    variant = 'primary', 
    type = 'button', 
    className = '',
    disabled = false 
}: ButtonProps) {

    // Define standard defaults, but allow 'custom' to let parent classNames take full control
    const baseColors = 
        variant === 'danger' 
            ? 'bg-red-600 text-white hover:opacity-90' 
            : variant === 'custom'
            ? '' 
            : 'bg-mint text-navy hover:opacity-90'; // Defaulting primary to your dashboard theme color

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${baseColors} ${className}`}
        >
            {title}
        </button>
    );
}