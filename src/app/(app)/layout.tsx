import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-zinc-50">
      <AppNav />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
    </div>
  );
}
