"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { signupAction } from "../actions";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const result = await signupAction({
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      password: formData.get("password") as string,
    });

    if (!result.success) {
      setError(result.error || "Une erreur est survenue");
      setFieldErrors(result.errors || {});
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  function getFieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  return (
    <>
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">PointSync</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          14 jours d&apos;essai gratuit — Sans carte bancaire
        </p>
      </div>

      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardContent className="p-0 pt-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Awa Koné"
                autoComplete="name"
                required
                disabled={loading}
              />
              {getFieldError("fullName") && (
                <p className="text-xs text-destructive">{getFieldError("fullName")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="votre@email.com"
                autoComplete="email"
                required
                disabled={loading}
              />
              {getFieldError("email") && (
                <p className="text-xs text-destructive">{getFieldError("email")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone (optionnel)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+225 07 00 00 00 00"
                autoComplete="tel"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 8 caractères"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={loading}
              />
              {getFieldError("password") && (
                <p className="text-xs text-destructive">{getFieldError("password")}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                "Créer mon compte gratuit"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              En créant un compte, vous acceptez nos{" "}
              <Link href="#" className="underline hover:text-foreground">
                conditions d&apos;utilisation
              </Link>
            </p>
          </form>
        </CardContent>
        <CardFooter className="flex-col p-0 pt-6 sm:p-6 sm:pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Déjà inscrit ?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </CardFooter>
      </Card>
    </>
  );
}
