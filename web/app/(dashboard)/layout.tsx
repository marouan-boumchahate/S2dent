import Sidebar from "@/components/Sidebar";
import { NotificationProvider } from "@/components/NotificationContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 bg-navy">
          {children}
        </main>
      </div>
    </NotificationProvider>
  );
}