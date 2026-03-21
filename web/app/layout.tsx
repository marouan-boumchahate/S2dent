import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "S2dent System",
  description: "University Blockchain Record System",
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-navy text-textLight antialiased flex h-screen overflow-hidden">
        <Sidebar />

        {/* to show the content */}
        <main className="flex-1 overflow-y-auto p-8 bg-navy">
          {children}
        </main>

      </body>
    </html>
  );
}