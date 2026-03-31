import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-mono text-8xl font-bold tracking-tight text-primary sm:text-9xl">
          404
        </p>
        <div className="mt-6 space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Page introuvable
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Button asChild size="lg">
            <Link href="/">Retour à l&apos;accueil</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Tableau de bord</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
