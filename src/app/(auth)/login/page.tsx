"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { loginAction, oauthLoginAction } from "../actions";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    errorParam === "auth_callback_failed" ? "La connexion a échoué. Veuillez réessayer." : null,
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (!result.success) {
      setError(result.error || "Une erreur est survenue");
      setLoading(false);
      return;
    }

    window.location.href = redirect || "/dashboard";
  }

  async function handleOAuth(provider: "google" | "facebook") {
    setOauthLoading(provider);
    setError(null);

    const result = await oauthLoginAction(provider);

    if (!result.success) {
      setError(result.error || "Erreur de connexion");
      setOauthLoading(null);
      return;
    }

    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  }

  const isDisabled = loading || oauthLoading !== null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2.5"
        disabled={isDisabled}
        onClick={() => handleOAuth("google")}
      >
        {oauthLoading === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="h-5 w-5" />
        )}
        Continuer avec Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou avec votre email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="votre@email.com"
            autoComplete="email"
            required
            disabled={isDisabled}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-primary hover:underline"
              tabIndex={-1}
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            disabled={isDisabled}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isDisabled}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">OControle</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Connexion</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Entrez vos identifiants pour accéder à votre espace
        </p>
      </div>

      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardContent className="p-0 pt-4 sm:p-6">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
        <CardFooter className="flex-col gap-3 p-0 pt-6 sm:p-6 sm:pt-4">
          <p className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Créer un compte
            </Link>
          </p>
          <Link
            href="/employe"
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
          >
            Vous êtes employé ? Connectez-vous ici →
          </Link>
        </CardFooter>
      </Card>
    </>
  );
}
