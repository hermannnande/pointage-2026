import { AppInstallPrompt } from "@/components/apk/app-install-prompt";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";

import LandingPage from "./(marketing)/page";

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <LandingPage />
      </main>
      <MarketingFooter />
      {/* Popup d'installation (auto, 1×/14 j) + bouton flottant mobile. */}
      <AppInstallPrompt />
    </div>
  );
}
