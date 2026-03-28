interface PageHeaderProps{
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <header className="bg-card border border-borderLine py-4 px-6 mb-6 rounded-2xl flex justify-between items-center shadow-lg">
      <h1 className="text-xl font-bold text-textLight">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-textMuted">Admin User</span>
        <div className="w-10 h-10 rounded-full bg-navy border border-borderLine flex items-center justify-center text-electric font-bold">
          A
        </div>
      </div>
    </header>
  );
}