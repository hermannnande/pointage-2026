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

  const destinationMatch = cleaned.match(/[?&](?:destination|daddr)=(-?\d+\.?\d*)[,+](-?\d+\.?\d*)/i);
  if (destinationMatch) {
    return { lat: parseFloat(destinationMatch[1]), lng: parseFloat(destinationMatch[2]) };
  }

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

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const resp = await fetch(
      `/api/geocode?mode=reverse&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.display
      ? (data.display as string).split(",").slice(0, 3).join(",").trim()
      : null;
  } catch {
    return null;
  }
}

async function searchAutocomplete(
  query: string,
): Promise<Array<{ placeId: string; display: string }>> {
  try {
    const resp = await fetch(`/api/geocode?mode=autocomplete&q=${encodeURIComponent(query)}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data?.predictions)) return [];
    return (data.predictions as Array<{ placeId: string; display: string }>).map((p) => ({
      placeId: String(p.placeId),
      display: String(p.display),
    }));
  } catch {
    return [];
  }
}

async function resolvePlaceId(
  placeId: string,
): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const resp = await fetch(`/api/geocode?mode=place&place_id=${encodeURIComponent(placeId)}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!Number.isFinite(data?.lat) || !Number.isFinite(data?.lng)) return null;
    return { lat: Number(data.lat), lng: Number(data.lng), display: String(data.display ?? "") };
  } catch {
    return null;
  }
}

async function searchAddress(
  query: string,
): Promise<Array<{ lat: number; lng: number; display: string }>> {
  try {
    const resp = await fetch(`/api/geocode?mode=search&q=${encodeURIComponent(query)}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!Array.isArray(data?.results)) return [];
    return (data.results as Array<{ lat: number; lng: number; display: string }>).map((r) => ({
      lat: Number(r.lat),
      lng: Number(r.lng),
      display: String(r.display),
    }));
  } catch {
    return [];
  }
}

type GeoStatus = "idle" | "loading" | "success" | "error" | "denied";

export function GeoLocationPicker({
  coords,
  onCoordsChange,
  onAddressResolved,
}: GeoLocationPickerProps) {
  const [geoStatus, setGeoStatus] = useState<GeoStatus>(coords ? "success" : "idle");
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [liveSearchLoading, setLiveSearchLoading] = useState(false);
  const [autoAccuracy, setAutoAccuracy] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ placeId: string; display: string }>
  >([]);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);

  useEffect(() => {
    if (coords) setGeoStatus("success");
  }, [coords]);

  useEffect(() => {
    const value = input.trim();

    if (!value || looksLikeUrl(value) || looksLikeCoords(value) || value.length < 2) {
      setLiveSearchLoading(false);
      setSuggestions([]);
      return;
    }

    setLiveSearchLoading(true);
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void searchAutocomplete(value)
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .finally(() => {
          if (!cancelled) setLiveSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [input]);

  const applyCoords = useCallback(
    async (lat: number, lng: number, accuracy?: number | null, resolvedAddr?: string | null) => {
      onCoordsChange({ lat, lng });
      setGeoStatus("success");
      setAutoAccuracy(accuracy ?? null);
      setSuggestions([]);
      setInput("");
      setResolvingPlaceId(null);
      if (onAddressResolved) {
        if (resolvedAddr) {
          onAddressResolved(resolvedAddr);
        } else {
          const addr = await reverseGeocode(lat, lng);
          if (addr) onAddressResolved(addr);
        }
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
      toast.error("Géolocalisation non supportée. Utilisez la saisie manuelle ci-dessous.");
      setAutoFailed(true);
      return;
    }
    setGeoLoading(true);
    setAutoFailed(false);
    try {
      const samples: GeolocationPosition[] = [];
      let lastErr: GeolocationPositionError | null = null;

      for (let i = 0; i < 5; i += 1) {
        try {
          const sample = await getGeoSample(i === 0 ? 15_000 : 10_000);
          samples.push(sample);
          if (sample.coords.accuracy <= 50) break;
        } catch (err) {
          lastErr = err as GeolocationPositionError;
        }
        if (i < 4) await sleep(1200);
      }

      if (samples.length === 0) {
        if (lastErr) {
          if (lastErr.code === 1) {
            toast.error("Accès à la position refusé. Autorisez la localisation puis réessayez, ou utilisez la saisie manuelle.");
          } else if (lastErr.code === 2) {
            toast.error("Position introuvable. Activez le GPS précis puis réessayez, ou utilisez la saisie manuelle.");
          } else {
            toast.error("Délai dépassé. Réessayez ou utilisez la saisie manuelle ci-dessous.");
          }
        } else {
          toast.error("Impossible de vous localiser. Utilisez la saisie manuelle ci-dessous.");
        }
        setAutoFailed(true);
        return;
      }

      const best = samples.reduce((prev, curr) =>
        curr.coords.accuracy < prev.coords.accuracy ? curr : prev,
      );

      if (!isValidCoord(best.coords.latitude, best.coords.longitude)) {
        toast.error("Coordonnées GPS invalides. Utilisez la saisie manuelle ci-dessous.");
        setAutoFailed(true);
        return;
      }

      const roundedAccuracy = Math.round(best.coords.accuracy);

      if (best.coords.accuracy > 50) {
        toast.warning(
          `Position approximative (±${roundedAccuracy}m). Coordonnées acceptées. Relancez pour plus de précision.`,
        );
      }

      await applyCoords(best.coords.latitude, best.coords.longitude, best.coords.accuracy);
      toast.success(`Position détectée (précision ±${roundedAccuracy}m)`);
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleSelectSuggestion(placeId: string, display: string) {
    setResolvingPlaceId(placeId);
    try {
      const result = await resolvePlaceId(placeId);
      if (result && isValidCoord(result.lat, result.lng)) {
        const addr = result.display || display;
        await applyCoords(result.lat, result.lng, null, addr.split(",").slice(0, 3).join(",").trim());
        toast.success("Position définie !");
      } else {
        toast.error("Impossible de résoudre cette adresse. Réessayez.");
      }
    } catch {
      toast.error("Erreur lors de la résolution. Réessayez.");
    } finally {
      setResolvingPlaceId(null);
    }
  }

  async function handleSubmit() {
    const value = input.trim();
    if (!value) return;

    setProcessing(true);
    setSuggestions([]);

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
          } catch {
            /* ignore */
          }
        }

        if (extracted && isValidCoord(extracted.lat, extracted.lng)) {
          await applyCoords(extracted.lat, extracted.lng);
          toast.success("Position extraite du lien !");
          return;
        }
        toast.error("Impossible d'extraire les coordonnées de ce lien.");
        return;
      }

      if (suggestions.length > 0) {
        void handleSelectSuggestion(suggestions[0].placeId, suggestions[0].display);
        return;
      }

      const results = await searchAddress(value);
      if (results.length === 0) {
        toast.error("Aucun résultat trouvé. Essayez avec plus de détails.");
        return;
      }
      if (results.length === 1) {
        await applyCoords(results[0].lat, results[0].lng);
        toast.success("Position trouvée !");
        return;
      }
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

      {/* Position confirmée */}
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
                  Précision GPS : ±{Math.round(autoAccuracy)}m
                </p>
              )}
              <a
                href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-green-700 underline hover:text-green-900 dark:text-green-300"
              >
                Vérifier sur la carte
              </a>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-green-700 hover:text-green-800 dark:text-green-300"
              onClick={() => {
                setGeoStatus("idle");
                setAutoFailed(false);
              }}
            >
              Modifier
            </Button>
          </div>
        </div>
      )}

      {/* Sélection de position */}
      {geoStatus !== "success" && (
        <div className="space-y-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
          {/* 1. Bouton localisation automatique */}
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
            {geoLoading
              ? "Détection en cours..."
              : "Me localiser automatiquement"}
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou rechercher une adresse</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* 2. Barre de recherche — adresse, lien Google Maps, coordonnées */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Adresse, lien carte, ou coordonnées GPS..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), void handleSubmit())
                }
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
              {processing || liveSearchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "OK"
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Accepte : adresse, lien carte, ou coordonnées GPS (ex: 5.336, -3.963)
          </p>

          {!looksLikeUrl(input.trim()) &&
            !looksLikeCoords(input.trim()) &&
            input.trim().length >= 2 && (
              <p className="text-[11px] text-muted-foreground">
                {liveSearchLoading
                  ? "Recherche en cours..."
                  : suggestions.length > 0
                    ? `${suggestions.length} suggestion(s)`
                    : "Aucun résultat pour le moment."}
              </p>
            )}

          {/* Suggestions d'autocomplete */}
          {suggestions.length > 0 && (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border bg-background p-1">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                Sélectionnez le bon emplacement :
              </p>
              {suggestions.map((s) => (
                <button
                  key={s.placeId}
                  type="button"
                  disabled={resolvingPlaceId !== null}
                  className="flex w-full items-start gap-2 rounded-lg p-2.5 text-left transition-colors hover:bg-primary/5 disabled:opacity-50"
                  onClick={() => void handleSelectSuggestion(s.placeId, s.display)}
                >
                  {resolvingPlaceId === s.placeId ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" />
                  ) : (
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  )}
                  <span className="text-xs">{s.display}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
