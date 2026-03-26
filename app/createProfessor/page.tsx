import AddTeacherForm from "@/components/AddTeacherForm";
import PageHeader from "@/components/PageHeader";

export default function AddProfessorPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Professor Management"/>

      <div className="flex-1 flex justify-center">
        <div className="w-full max-w-6xl bg-card p-8 rounded-3xl shadow-xl border border-borderLine flex flex-col min-h-[75vh]">
          <AddTeacherForm/>
        </div>
      </div>
    </div>
  );
}