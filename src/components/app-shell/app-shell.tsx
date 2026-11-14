import { ChartBottomNav } from "@/components/app-shell/chart-bottom-nav";
import { ChartTopNav } from "@/components/app-shell/chart-top-nav";
import { ChartTopbar } from "@/components/app-shell/chart-topbar";
import { DirtyNavigationProvider } from "@/components/app-shell/dirty-navigation";
import { ListTopbar } from "@/components/app-shell/list-topbar";
import { QuickAddHost } from "@/components/quick-add/quick-add-host";

export type AppShellVariant = "list" | "chart" | "settings";

type AppShellProps = {
  title: string;
  children: React.ReactNode;
  /** list = kartotéka; chart = dekurz; settings = account/global */
  variant?: AppShellVariant;
  /** Required for chart variant */
  patientId?: string;
  patientDisplayName?: string;
};

export function AppShell({
  title,
  children,
  variant = "list",
  patientId,
  patientDisplayName,
}: AppShellProps) {
  const isChart =
    variant === "chart" && Boolean(patientId) && Boolean(patientDisplayName);

  const body = (
    <div
      className={
        isChart
          ? "flex min-h-dvh flex-col bg-background text-foreground"
          : "flex min-h-dvh flex-col bg-background text-foreground"
      }
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      data-shell={isChart ? "chart" : variant}
    >
      {isChart ? (
        <>
          <ChartTopbar
            title={title}
            patientId={patientId!}
            patientDisplayName={patientDisplayName!}
          />
          <ChartTopNav patientId={patientId!} />
        </>
      ) : (
        <ListTopbar title={title} />
      )}

      <main
        className={
          isChart
            ? "flex-1 px-4 py-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6"
            : "flex-1 px-4 py-4 md:px-6 md:pb-6"
        }
        id="main-content"
      >
        {children}
      </main>

      {isChart ? <ChartBottomNav patientId={patientId!} /> : null}
    </div>
  );

  if (isChart) {
    return (
      <QuickAddHost>
        <DirtyNavigationProvider>{body}</DirtyNavigationProvider>
      </QuickAddHost>
    );
  }

  return body;
}
