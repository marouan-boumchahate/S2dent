import NotificationBell from './NotificationBell';

interface PageHeaderProps {
  title: string;
  onAddNew?: () => void;
}

export default function PageHeader({ title, onAddNew }: PageHeaderProps) {
  let actionLabel = 'Add New';
  if (title === 'Students') {
    actionLabel = 'Add Student';
  } else if (title === 'Professors') {
    actionLabel = 'Add Professor';
  } else if (title === 'Credentials') {
    actionLabel = 'Create Credential';
  } else if (title === 'Departments') {
    actionLabel = 'Add Department';
  }

  return (
    <header className="bg-card border border-borderLine py-4 px-6 mb-6 rounded-2xl flex justify-between items-center shadow-lg">
      <h1 className="text-xl font-bold text-textLight">{title}</h1>

      <div className="flex items-center gap-3">
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-mint hover:bg-mint/95 text-navy font-bold text-sm rounded-xl active:scale-[0.98] transition-all shadow-sm shadow-mint/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>{actionLabel}</span>
          </button>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}