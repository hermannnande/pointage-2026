import { Clock, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-muted/40 via-background to-muted/30 p-4">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
          <Clock className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold tracking-tight">OControle</span>
        <p className="text-sm text-muted-foreground">Configuration de votre espace</p>
      </div>

      <div className="w-full max-w-lg">{children}</div>

      <div className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Vos données sont protégées et sécurisées</span>
      </div>
    </div>
  );
}
