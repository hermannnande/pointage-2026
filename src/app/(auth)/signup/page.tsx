"use client";

import { useState } from "react";
import Link from "next/link";

import { Clock, Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { trackFbEvent } from "@/components/fb-pixel";

import { signupAction, oauthLoginAction } from "../actions";

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

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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

    trackFbEvent(
      "CompleteRegistration",
      {
        content_name: "Inscription OControle",
        status: "completed",
      },
      { eventID: result.data?.metaEventId },
    );

    window.location.href = "/onboarding";
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

  function getFieldError(field: string): string | undefined {
    return fieldErrors[field]?.[0];
  }

  const isDisabled = loading || oauthLoading !== null;

  return (
    <>
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">OControle</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Créer un compte</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          7 jours d&apos;essai gratuit — Sans carte bancaire
        </p>
      </div>

      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardContent className="p-0 pt-4 sm:p-6">
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
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Awa Koné"
                  autoComplete="name"
                  required
                  disabled={isDisabled}
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
                  disabled={isDisabled}
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
                  disabled={isDisabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 caractères"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    disabled={isDisabled}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {getFieldError("password") && (
                  <p className="text-xs text-destructive">{getFieldError("password")}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isDisabled}>
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
          </div>
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
