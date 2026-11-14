import { BottomNav } from "@/components/app-shell/bottom-nav";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { QuickAddHost } from "@/components/quick-add/quick-add-host";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
};

export function AppShell({ title, children }: AppShellProps) {
  return (
    <QuickAddHost>
      <div className="flex min-h-dvh bg-background text-foreground">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={title} />
          <main
            className="flex-1 px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6"
            id="main-content"
          >
            {children}
          </main>
          <BottomNav />
        </div>
      </div>
    </QuickAddHost>
  );
}
