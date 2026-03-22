import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar username={user.instagramUsername} isActive={user.config?.isActive ?? false} />
      <main className="flex-1 p-8 ml-64">{children}</main>
    </div>
  );
}
