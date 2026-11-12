import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = { title: "Dashboard | Thriftesque", robots: { index: false, follow: false } };

// A static shell. Data loads in the browser with the team member's session, and RLS decides what comes back (D-020).
export default function DashboardPage() {
  return <Dashboard />;
}
