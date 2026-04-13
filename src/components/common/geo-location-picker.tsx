"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  CrosshairIcon,
  Link2,
  Loader2,
  MapPin,
  Navigation,
  Search,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface GeoCoords {
  lat: number;
  lng: number;
}

interface GeoLocationPickerProps {
  coords: GeoCoords | null;
  onCoordsChange: (coords: GeoCoords) => void;
  onAddressResolved?: (address: string) => void;
}

function extractCoordsFromUrl(url: string): GeoCoords | null {
  const cleaned = url.trim();

  // Google Maps: /@lat,lng or @lat,lng
  const atMatch = cleaned.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  // Google Maps: /place/lat,lng or ?q=lat,lng or &ll=lat,lng
  const qMatch = cleaned.match(/[?&](?:q|ll|center)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  // Google Maps short link data param: !3d(lat)!4d(lng)
  const bangMatch = cleaned.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (bangMatch) return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };

  // maps.app.goo.gl or goo.gl links can't be parsed directly — we'll try via fetch
  // WhatsApp shared location: https://maps.google.com/?q=lat,lng (already handled by qMatch)

  // Yandex Maps: ll=lng,lat (note: Yandex uses lng,lat order)
  const yandexMatch = cleaned.match(/[?&]ll=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/);
  if (yandexMatch) return { lat: parseFloat(yandexMatch[2]), lng: parseFloat(yandexMatch[1]) };

  // Apple Maps: ll=lat,lng
  const appleMatch = cleaned.match(/maps\.apple\.com.*[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (appleMatch) return { lat: parseFloat(appleMatch[1]), lng: parseFloat(appleMatch[2]) };

  // OpenStreetMap: #map=zoom/lat/lng
  const osmMatch = cleaned.match(/#map=\d+\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/);
  if (osmMatch) return { lat: parseFloat(osmMatch[1]), lng: parseFloat(osmMatch[2]) };

  // Raw coordinates: lat, lng (try as last resort)
  const rawMatch = cleaned.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/);
  if (rawMatch) {
    const a = parseFloat(rawMatch[1]);
    const b = parseFloat(rawMatch[2]);
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
  }

  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.display_name
      ? (data.display_name as string).split(",").slice(0, 3).join(",").trim()
      : null;
  } catch {
    return null;
  }
}

async function searchAddress(query: string): Promise<Array<{ lat: number; lng: number; display: string }>> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=fr`,
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data as Array<{ lat: string; lon: string; display_name: string }>).map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display: r.display_name,
    }));
  } catch {
    return [];
  }
}

type GeoStatus = "idle" | "loading" | "success" | "error" | "denied";

export function GeoLocationPicker({ coords, onCoordsChange, onAddressResolved }: GeoLocationPickerProps) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(coords ? "success" : "idle");
  const [activeTab, setActiveTab] = useState("auto");

  // Link input
  const [linkInput, setLinkInput] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);

  // Manual input
  const [manualLat, setManualLat] = useState(coords?.lat.toString() ?? "");
  const [manualLng, setManualLng] = useState(coords?.lng.toString() ?? "");

  // Search input
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; display: string }>>([]);

  const applyCoords = useCallback(
    async (lat: number, lng: number) => {
      onCoordsChange({ lat, lng });
      setGeoStatus("success");
      if (onAddressResolved) {
        const addr = await reverseGeocode(lat, lng);
        if (addr) onAddressResolved(addr);
      }
    },
    [onCoordsChange, onAddressResolved],
  );

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        void applyCoords(lat, lng);
      },
      (err) => {
        setGeoStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [applyCoords]);

  async function handleLinkPaste() {
    if (!linkInput.trim()) return;
    setLinkLoading(true);
    try {
      let extracted = extractCoordsFromUrl(linkInput);

      if (!extracted && (linkInput.includes("goo.gl") || linkInput.includes("maps.app"))) {
        try {
          const resp = await fetch(`/api/resolve-url?url=${encodeURIComponent(linkInput.trim())}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.resolvedUrl) {
              extracted = extractCoordsFromUrl(data.resolvedUrl);
            }
          }
        } catch {
          // fallback
        }
      }

      if (!extracted) {
        toast.error("Impossible d'extraire les coordonnées de ce lien. Vérifiez le lien et réessayez.");
        return;
      }
      if (!isValidCoord(extracted.lat, extracted.lng)) {
        toast.error("Les coordonnées extraites sont invalides.");
        return;
      }
      await applyCoords(extracted.lat, extracted.lng);
      toast.success("Position extraite du lien avec succès !");
      setLinkInput("");
    } finally {
      setLinkLoading(false);
    }
  }

  function handleManualSubmit() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isValidCoord(lat, lng)) {
      toast.error("Coordonnées invalides. Latitude: -90 à 90, Longitude: -180 à 180");
      return;
    }
    void applyCoords(lat, lng);
    toast.success("Coordonnées enregistrées !");
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const results = await searchAddress(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) {
        toast.error("Aucun résultat trouvé. Essayez avec plus de détails.");
      }
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>
        <Navigation className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
        Position GPS du site
      </Label>

      {/* Success banner */}
      {geoStatus === "success" && coords && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Position enregistrée
              </p>
              <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-green-700 underline hover:text-green-900 dark:text-green-300"
              >
                Voir sur Google Maps
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-green-700 hover:text-green-800 dark:text-green-300"
              onClick={() => {
                setGeoStatus("idle");
              }}
            >
              Modifier
            </Button>
          </div>
        </div>
      )}

      {/* Loading */}
      {geoStatus === "loading" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm font-medium">Localisation en cours...</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Autorisez l&apos;accès à votre position
          </p>
        </div>
      )}

      {/* Error/Denied */}
      {(geoStatus === "denied" || geoStatus === "error") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {geoStatus === "denied" ? "Accès à la position refusé" : "Impossible de vous localiser"}
          </p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
            Utilisez une autre méthode ci-dessous pour définir la position du site.
          </p>
        </div>
      )}

      {/* Input tabs — shown when no coords or editing */}
      {(geoStatus === "idle" || geoStatus === "denied" || geoStatus === "error") && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="auto" className="gap-1 text-xs">
              <CrosshairIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">GPS Auto</span>
              <span className="sm:hidden">GPS</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-1 text-xs">
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lien Maps</span>
              <span className="sm:hidden">Lien</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1 text-xs">
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Rechercher</span>
              <span className="sm:hidden">Rech.</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1 text-xs">
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Manuel</span>
              <span className="sm:hidden">Saisie</span>
            </TabsTrigger>
          </TabsList>

          {/* GPS Auto */}
          <TabsContent value="auto" className="mt-3">
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
              <CrosshairIcon className="mx-auto h-8 w-8 text-primary/60" />
              <p className="mt-2 text-sm font-medium">
                Localisez votre site automatiquement
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Placez-vous sur le lieu de travail et cliquez ci-dessous
              </p>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="mt-3 gap-2"
                onClick={requestGeolocation}
              >
                <Navigation className="h-4 w-4" />
                Me localiser maintenant
              </Button>
            </div>
          </TabsContent>

          {/* Lien Google Maps / WhatsApp */}
          <TabsContent value="link" className="mt-3">
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">Coller un lien de localisation</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Liens acceptés : Google Maps, WhatsApp (localisation partagée), Yandex Maps, Apple Maps, OpenStreetMap
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="https://maps.google.com/... ou https://maps.app.goo.gl/..."
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void handleLinkPaste())}
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="shrink-0 gap-1"
                  disabled={linkLoading || !linkInput.trim()}
                  onClick={() => void handleLinkPaste()}
                >
                  {linkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Extraire
                </Button>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">Comment obtenir le lien :</p>
                <ol className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  <li>1. Ouvrez <strong>Google Maps</strong> sur votre téléphone</li>
                  <li>2. Cherchez ou touchez longuement le lieu de travail</li>
                  <li>3. Appuyez sur <strong>Partager</strong></li>
                  <li>4. Copiez le lien et collez-le ci-dessus</li>
                </ol>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ou depuis <strong>WhatsApp</strong> : ouvrez une localisation partagée → menu ⋮ → <strong>Ouvrir dans Maps</strong> → copiez le lien
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Recherche d'adresse */}
          <TabsContent value="search" className="mt-3">
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">Rechercher une adresse</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tapez l&apos;adresse ou le nom du lieu comme dans Google Maps
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Boutique Cocody, Abidjan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void handleSearch())}
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="shrink-0 gap-1"
                  disabled={searchLoading || !searchQuery.trim()}
                  onClick={() => void handleSearch()}
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Chercher
                </Button>
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-52 space-y-1 overflow-y-auto">
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-lg p-2.5 text-left transition-colors hover:bg-primary/5"
                      onClick={() => {
                        void applyCoords(r.lat, r.lng);
                        setSearchResults([]);
                        setSearchQuery("");
                        toast.success("Position définie !");
                      }}
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-xs">{r.display}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Saisie manuelle */}
          <TabsContent value="manual" className="mt-3">
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-medium">Saisie manuelle des coordonnées</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Entrez la latitude et la longitude. Vous pouvez les trouver sur Google Maps en cliquant droit → &quot;Plus d&apos;infos sur cet endroit&quot;.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    placeholder="Ex: 5.3364"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    placeholder="Ex: -3.9638"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-1"
                disabled={!manualLat || !manualLng}
                onClick={handleManualSubmit}
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider les coordonnées
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
