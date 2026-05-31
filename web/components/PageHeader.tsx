import NotificationBell from './NotificationBell';

interface PageHeaderProps {
  title: string;
  onAddNew?: () => void;
}

export default function PageHeader({ title, onAddNew }: PageHeaderProps) {
  return (
    <header className="bg-card border border-borderLine py-4 px-6 mb-6 rounded-2xl flex justify-between items-center shadow-lg">
      <h1 className="text-xl font-bold text-textLight">{title}</h1>

      <div className="flex items-center gap-3">
        {onAddNew && (
          <button
            onClick={onAddNew}
            className="px-4 py-2 bg-mint text-navy font-bold rounded-lg hover:opacity-90 transition"
          >
            + Add New
          </button>
        )}
        <NotificationBell />
      </div>
    </header>
  );
}