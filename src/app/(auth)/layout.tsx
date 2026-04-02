import Image from "next/image";
import { BarChart3, Clock, ShieldCheck, Users } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      {/* Left panel - branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex">
        <Image
          src="/images/auth-ocontrole-poster.png"
          alt="Gérante africaine utilisant OControle dans sa boutique"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/25 to-primary/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/16 backdrop-blur-sm">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-xl font-bold">OControle</span>
              <span className="text-xs text-white/70">
                Suivi moderne de présence
              </span>
            </div>
          </div>

          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Pointage simple, fiable et professionnel
            </div>

            <div className="max-w-lg">
              <h2 className="text-4xl font-bold leading-tight">
                Pilotez vos équipes en temps réel, même à distance.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/80">
                OControle vous aide a suivre les présences, les retards et
                les heures travaillées de façon claire, élégante et rassurante.
              </p>
            </div>

            <div className="grid max-w-lg grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/14 bg-white/12 p-4 backdrop-blur-sm">
                <Users className="h-4 w-4 text-white/80" />
                <p className="mt-3 text-xl font-semibold">500+</p>
                <p className="text-xs text-white/70">équipes suivies</p>
              </div>
              <div className="rounded-2xl border border-white/14 bg-white/12 p-4 backdrop-blur-sm">
                <BarChart3 className="h-4 w-4 text-white/80" />
                <p className="mt-3 text-xl font-semibold">Temps réel</p>
                <p className="text-xs text-white/70">tableaux clairs</p>
              </div>
              <div className="rounded-2xl border border-white/14 bg-white/12 p-4 backdrop-blur-sm">
                <Clock className="h-4 w-4 text-white/80" />
                <p className="mt-3 text-xl font-semibold">1 clic</p>
                <p className="text-xs text-white/70">pour pointer</p>
              </div>
            </div>

            <div className="max-w-md rounded-3xl border border-white/14 bg-white/12 p-6 backdrop-blur-md">
              <blockquote className="text-lg font-medium leading-relaxed text-white/95">
                &ldquo;Depuis que j&apos;utilise OControle, je sais exactement qui
                est présent dans mes boutiques, même quand je ne suis pas sur
                place.&rdquo;
              </blockquote>
              <p className="mt-4 text-sm text-white/75">
                Awa K. — Gérante, 2 boutiques à Abidjan
              </p>
            </div>
          </div>

          <p className="text-xs text-white/55">
            &copy; {new Date().getFullYear()} OControle
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
