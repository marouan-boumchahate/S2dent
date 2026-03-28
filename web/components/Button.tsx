interface ButtonProps {
    title: string;
    onClick: () => void;
    variant?: 'primary' | 'danger';
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}

export default function Button({ title, onClick, variant = 'primary', type = 'button', className = '' }: ButtonProps) {

    const bgColor = variant === 'danger' ? 'bg-red-600' : 'bg-blue-600';

    return (
        <button
            type={type}
            onClick={onClick}
            className={`${bgColor} text-white px-4 py-2 rounded-lg hover:opacity-80 transition-all ${className}`}
        >
            {title}
        </button>
    );
}