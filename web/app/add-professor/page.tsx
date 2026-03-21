import AddTeacherForm from "@/components/AddTeacherForm";

export default function AddProfessorPage() {
  return (
    <div className="flex flex-col h-full">
      {/* bar */}
      <header className="bg-card border border-borderLine py-4 px-6 mb-6 rounded-2xl flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold text-textLight">Professor Management</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-textMuted">Admin User</span>
          <div className="w-10 h-10 rounded-full bg-navy border border-borderLine flex items-center justify-center text-electric font-bold">
            A
          </div>
        </div>
      </header>
      
      {/* containar size */}
      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-6xl bg-card p-8 rounded-3xl shadow-xl border border-borderLine flex flex-col min-h-[75vh]">
          <AddTeacherForm />
        </div>
      </div>
    </div>
  );
}