import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "S2dent System | Dashboard Overview",
};

// mian dashboard page for the system it will be edit later for now this tempporary interface 
export default function Home() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-electric">Dashboard Overview</h1>
        <p className="text-textMuted mt-2">Welcome back to S2dent System Admin Panel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-card p-6 rounded-2xl border border-borderLine shadow-lg transition hover:border-mint">
          <h3 className="text-textLight font-medium">Total Professors</h3>
          <p className="text-4xl font-bold text-mint mt-4">24</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-borderLine shadow-lg transition hover:border-mint">
          <h3 className="text-textLight font-medium">Total Students</h3>
          <p className="text-4xl font-bold text-electric mt-4">1,250</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-borderLine shadow-lg transition hover:border-mint">
          <h3 className="text-textLight font-medium">Blockchain Records</h3>
          <p className="text-4xl font-bold text-violet mt-4">8,432</p>
        </div>

      </div>
    </div>
  );
}