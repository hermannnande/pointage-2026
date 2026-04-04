"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { employeeLoginAction } from "./actions";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [siteCode, setSiteCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await employeeLoginAction({
      siteCode: siteCode.trim(),
      password: password,
    });

    if (result.success) {
      router.push("/espace-employe");
    } else {
      setError(result.error || "Erreur de connexion");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <Clock className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">OControle</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Espace employé — Pointage
          </p>
        </div>
      </div>

      <Card className="shadow-xl">
        <CardContent className="space-y-5 p-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Connexion employé</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entrez les informations données par votre responsable
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteCode">Code du site</Label>
              <Input
                id="siteCode"
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value.toUpperCase())}
                placeholder="Ex : A7K2M9"
                required
                disabled={loading}
                maxLength={10}
                className="text-center font-mono text-lg tracking-widest"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Le code à 6 caractères donné par votre responsable
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 text-base"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Se connecter
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-3 p-6 pt-0">
          <div className="w-full rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
            Vous n&apos;avez pas vos identifiants ?
            <br />
            Demandez-les à votre responsable ou manager.
          </div>
          <Link
            href="/login"
            className="text-xs text-primary hover:underline"
          >
            Connexion administrateur →
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
