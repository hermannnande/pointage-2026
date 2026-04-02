"use client";

import { useState } from "react";
import Link from "next/link";

import { ArrowLeft, Clock, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { forgotPasswordAction } from "../actions";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const emailValue = formData.get("email") as string;
    setEmail(emailValue);

    const result = await forgotPasswordAction({ email: emailValue });

    if (!result.success) {
      setError(result.error || "Une erreur est survenue");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <>
      <div className="mb-8 flex items-center gap-2.5 lg:hidden">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Clock className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">OControle</span>
      </div>

      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la connexion
      </Link>

      {sent ? (
        <Card className="border-0 shadow-none sm:border sm:shadow-sm">
          <CardContent className="p-0 pt-4 sm:p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Email envoyé</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Si un compte existe avec l&apos;adresse{" "}
                <span className="font-medium text-foreground">{email}</span>,
                vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Pensez à vérifier votre dossier spam.
              </p>
              <div className="mt-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSent(false); setError(null); }}
                >
                  Renvoyer l&apos;email
                </Button>
                <Button className="w-full" asChild>
                  <Link href="/login">Retour à la connexion</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Mot de passe oublié</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Entrez votre email et nous vous enverrons un lien de réinitialisation
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
                  <Label htmlFor="email">Adresse email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="votre@email.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
