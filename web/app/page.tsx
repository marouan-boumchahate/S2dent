import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "S2dent System | Dashboard Overview",
};

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard Overview" />
    </div>
  );
}