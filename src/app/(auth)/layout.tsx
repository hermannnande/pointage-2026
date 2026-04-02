import { Clock } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      {/* Left panel - branding */}
      <div className="hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/20">
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold">OControle</span>
        </div>

        <div className="max-w-md">
          <blockquote className="text-lg font-medium leading-relaxed opacity-90">
            &ldquo;Depuis que j&apos;utilise OControle, je sais exactement qui
            est présent dans mes boutiques, même quand je ne suis pas sur
            place.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm opacity-70">
            Awa K. — Gérante, 2 boutiques à Abidjan
          </p>
        </div>

        <p className="text-xs opacity-50">
          &copy; {new Date().getFullYear()} OControle
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
