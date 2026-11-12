import type { Metadata } from "next";
import { LoginForm } from "@/components/dashboard/LoginForm";

export const metadata: Metadata = { title: "Team sign in | Thriftesque", robots: { index: false, follow: false } };

export default function LoginPage() {
  return <LoginForm />;
}
