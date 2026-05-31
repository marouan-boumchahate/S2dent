import Sidebar from "@/components/Sidebar";
import { NotificationProvider } from "@/components/NotificationContext";
import { LogoProvider } from "@/lib/logoContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LogoProvider>
      <NotificationProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-8 bg-navy">
            {children}
          </main>
        </div>
      </NotificationProvider>
    </LogoProvider>
  );
}