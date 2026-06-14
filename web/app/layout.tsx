import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
// @ts-ignore
import "./globals.css";
import { cn } from "@/lib/utils";
import { AlertProvider } from "@/components/AlertContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "S2dent System",
  description: "University Blockchain Record System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, lora.variable)}>
      <body className="bg-navy text-textLight antialiased">
        <AlertProvider>
          {children}
        </AlertProvider>
      </body>
    </html>
  );
}