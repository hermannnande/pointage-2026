"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  // 1) Priorite aux coordonnees de destination explicites (liens d'itineraire).
  const destinationMatch = cleaned.match(/[?&](?:destination|daddr)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/i);
  if (destinationMatch) {
    return { lat: parseFloat(destinationMatch[1]), lng: parseFloat(destinationMatch[2]) };
  }

  // 2) Coordonnees du lieu (Google Place share).
  const bangMatch = cleaned.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
  if (bangMatch) return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };

  const qMatch = cleaned.match(/[?&](?:q|ll|center)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/);
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };

  const yandexMatch = cleaned.match(/[?&]ll=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/);
  if (yandexMatch) return { lat: parseFloat(yandexMatch[2]), lng: parseFloat(yandexMatch[1]) };

  const appleMatch = cleaned.match(/maps\.apple\.com.*[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (appleMatch) return { lat: parseFloat(appleMatch[1]), lng: parseFloat(appleMatch[2]) };

  const osmMatch = cleaned.match(/#map=\d+\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/);
  if (osmMatch) return { lat: parseFloat(osmMatch[1]), lng: parseFloat(osmMatch[2]) };

  const rawMatch = cleaned.match(/^(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)$/);
  if (rawMatch) {
    const a = parseFloat(rawMatch[1]);
    const b = parseFloat(rawMatch[2]);
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
  }

  // 3) Fallback: centre de carte / viewport (moins fiable pour l'itineraire).
  const atMatch = cleaned.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  return null;
}

function looksLikeUrl(input: string): boolean {
  const t = input.trim().toLowerCase();
  return t.startsWith("http") || t.includes("maps") || t.includes("goo.gl");
}

function looksLikeCoords(input: string): boolean {
  return /^-?\d+\.?\d*\s*[,;\s]\s*-?\d+\.?\d*$/.test(input.trim());
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function geolocationErrorMessage(err: GeolocationPositionError): string {
  if (err.code === 1) return "Accès à la position refusé. Autorisez la localisation dans les paramètres.";
  if (err.code === 2) return "Position introuvable. Activez le GPS précis puis réessayez.";
  if (err.code === 3) return "Délai dépassé. Réessayez dans un endroit dégagé.";
  return "Impossible de vous localiser. Utilisez la barre de recherche.";
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
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [liveSearchLoading, setLiveSearchLoading] = useState(false);
  const [autoAccuracy, setAutoAccuracy] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Array<{ lat: number; lng: number; display: string }>>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (coords) setGeoStatus("success");
  }, [coords]);

  useEffect(() => {
    const value = input.trim();

    if (!value || looksLikeUrl(value) || looksLikeCoords(value) || value.length < 3) {
      setLiveSearchLoading(false);
      setSearchResults([]);
      return;
    }

    setLiveSearchLoading(true);
    const timeoutId = window.setTimeout(() => {
      void searchAddress(value)
        .then((results) => {
          setSearchResults(results);
        })
        .finally(() => {
          setLiveSearchLoading(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
      setLiveSearchLoading(false);
    };
  }, [input]);

  const applyCoords = useCallback(
    async (lat: number, lng: number, accuracy?: number | null) => {
      onCoordsChange({ lat, lng });
      setGeoStatus("success");
      setAutoAccuracy(accuracy ?? null);
      setSearchResults([]);
      setInput("");
      if (onAddressResolved) {
        const addr = await reverseGeocode(lat, lng);
        if (addr) onAddressResolved(addr);
      }
    },
    [onCoordsChange, onAddressResolved],
  );

  async function getGeoSample(timeoutMs: number): Promise<GeolocationPosition> {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
      );
    });
  }

  async function requestGeolocation() {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non supportée par votre navigateur.");
      return;
    }
    setGeoLoading(true);
    try {
      const samples: GeolocationPosition[] = [];
      let lastErr: GeolocationPositionError | null = null;

      for (let i = 0; i < 3; i += 1) {
        try {
          const sample = await getGeoSample(i === 0 ? 15_000 : 10_000);
          samples.push(sample);
        } catch (err) {
          lastErr = err as GeolocationPositionError;
        }
        if (i < 2) await sleep(900);
      }

      if (samples.length === 0) {
        if (lastErr) toast.error(geolocationErrorMessage(lastErr));
        else toast.error("Impossible de vous localiser. Utilisez la barre de recherche.");
        return;
      }

      const best = samples.reduce((prev, curr) =>
        curr.coords.accuracy < prev.coords.accuracy ? curr : prev,
      );

      if (!isValidCoord(best.coords.latitude, best.coords.longitude)) {
        toast.error("Coordonnées GPS invalides détectées. Réessayez.");
        return;
      }

      const roundedAccuracy = Math.round(best.coords.accuracy);
      if (best.coords.accuracy > 120) {
        toast.error(
          `Signal GPS trop imprécis (±${roundedAccuracy}m). Activez la localisation précise puis réessayez.`,
        );
        return;
      }

      await applyCoords(best.coords.latitude, best.coords.longitude, best.coords.accuracy);
      toast.success(`Position GPS détectée (précision ±${roundedAccuracy}m)`);
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSubmit() {
    const value = input.trim();
    if (!value) return;

    setProcessing(true);
    setSearchResults([]);

    try {
      if (looksLikeCoords(value)) {
        const extracted = extractCoordsFromUrl(value);
        if (extracted && isValidCoord(extracted.lat, extracted.lng)) {
          await applyCoords(extracted.lat, extracted.lng);
          toast.success("Coordonnées enregistrées !");
          return;
        }
        toast.error("Coordonnées invalides. Format attendu : 5.3364, -3.9638");
        return;
      }

      if (looksLikeUrl(value)) {
        let extracted = extractCoordsFromUrl(value);

        if (!extracted && (value.includes("goo.gl") || value.includes("maps.app"))) {
          try {
            const resp = await fetch(`/api/resolve-url?url=${encodeURIComponent(value)}`);
            if (resp.ok) {
              const data = await resp.json();
              if (data.resolvedUrl) {
                extracted = extractCoordsFromUrl(data.resolvedUrl);
              }
            }
          } catch { /* fallback to search */ }
        }

        if (extracted && isValidCoord(extracted.lat, extracted.lng)) {
          await applyCoords(extracted.lat, extracted.lng);
          toast.success("Position extraite du lien !");
          return;
        }
        toast.error("Impossible d'extraire les coordonnées de ce lien.");
        return;
      }

      const results = await searchAddress(value);
      if (results.length === 0) {
        toast.error("Aucun résultat. Essayez avec plus de détails (ex: nom + ville).");
        return;
      }
      if (results.length === 1) {
        await applyCoords(results[0].lat, results[0].lng);
        toast.success("Position trouvée !");
        return;
      }
      setSearchResults(results);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-3">
      <Label>
        <Navigation className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
        Position GPS du site
      </Label>

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
              {autoAccuracy != null && (
                <p className="mt-1 text-[11px] text-green-700/90 dark:text-green-300/90">
                  Précision GPS mesurée: ±{Math.round(autoAccuracy)}m
                </p>
              )}
              <p className="mt-1 text-[11px] text-green-700/90 dark:text-green-300/90">
                Le pointage utilise ces coordonnees GPS exactes (pas uniquement le texte d&apos;adresse).
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
              onClick={() => setGeoStatus("idle")}
            >
              Modifier
            </Button>
          </div>
        </div>
      )}

      {geoStatus !== "success" && (
        <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          {/* Bouton GPS auto */}
          <Button
            type="button"
            variant="default"
            className="w-full gap-2"
            disabled={geoLoading}
            onClick={() => void requestGeolocation()}
          >
            {geoLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            {geoLoading ? "Localisation en cours..." : "Me localiser automatiquement"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Barre de recherche unifiée */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Adresse, lien Google Maps, ou coordonnées GPS..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void handleSubmit())}
              />
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              className="shrink-0"
              disabled={processing || liveSearchLoading || !input.trim()}
              onClick={() => void handleSubmit()}
            >
              {processing || liveSearchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "OK"}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Accepte : adresse (ex: Cocody, Abidjan) · lien Google Maps / WhatsApp · coordonnées (ex: 5.336, -3.963)
          </p>

          {!looksLikeUrl(input.trim()) && !looksLikeCoords(input.trim()) && input.trim().length >= 3 && (
            <p className="text-[11px] text-muted-foreground">
              Résultats en temps réel pendant la saisie...
            </p>
          )}

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border bg-background p-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Sélectionnez le bon emplacement :
              </p>
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-lg p-2.5 text-left transition-colors hover:bg-primary/5"
                  onClick={() => {
                    void applyCoords(r.lat, r.lng);
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
      )}
    </div>
  );
}
