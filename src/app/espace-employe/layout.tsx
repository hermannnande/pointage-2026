import { Clock } from "lucide-react";

export default function EmployeeSpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-slate-50 via-white to-primary/5">
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Clock className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold">OControle</span>
          </div>
          <span className="text-xs text-muted-foreground">Espace employé</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
