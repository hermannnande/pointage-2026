"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/constants";
import {
  getCountryFromPhone,
  getLocalPhoneNumber,
  getPhonePrefixForCountry,
  isoToFlagEmoji,
} from "@/lib/phone-country";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const PHONE_COUNTRIES = COUNTRIES.map((c) => ({
  code: c.code,
  name: c.name.replace(/^\p{Extended_Pictographic}+\s*/u, ""),
  prefix: getPhonePrefixForCountry(c.code),
})).filter((c) => c.prefix);

/**
 * Champ téléphone professionnel avec sélecteur de pays + indicatif.
 * - Stocke en sortie une chaîne au format "+225 0778030075"
 * - Détecte automatiquement le pays depuis la valeur initiale
 * - Synchronise sur le `defaultCountry` tant que l'utilisateur n'a pas changé manuellement
 */
export function PhoneInput({
  value,
  onChange,
  defaultCountry = DEFAULT_COUNTRY,
  id,
  name,
  placeholder = "07 78 03 00 75",
  disabled,
  required,
  className,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState<string>(() => {
    const detected = getCountryFromPhone(value);
    return detected || defaultCountry || DEFAULT_COUNTRY;
  });
  const [local, setLocal] = useState<string>(() => getLocalPhoneNumber(value));
  const [userTouchedCountry, setUserTouchedCountry] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const localInputRef = useRef<HTMLInputElement>(null);

  const prefix = useMemo(() => getPhonePrefixForCountry(country), [country]);

  // Sync sur defaultCountry uniquement si utilisateur n'a pas choisi manuellement
  // ET que le numéro local est vide (sinon on respecte le numéro saisi)
  useEffect(() => {
    if (userTouchedCountry) return;
    if (local.trim().length > 0) return;
    if (!defaultCountry || defaultCountry === country) return;
    setCountry(defaultCountry);
  }, [defaultCountry, country, local, userTouchedCountry]);

  const emitChange = useCallback(
    (nextCountry: string, nextLocal: string) => {
      const cleanLocal = nextLocal.replace(/\D/g, "");
      const nextPrefix = getPhonePrefixForCountry(nextCountry);
      if (!cleanLocal) {
        onChange("");
        return;
      }
      onChange(nextPrefix ? `+${nextPrefix} ${cleanLocal}` : cleanLocal);
    },
    [onChange],
  );

  function handleCountrySelect(code: string) {
    setUserTouchedCountry(true);
    setCountry(code);
    setOpen(false);
    setSearch("");
    emitChange(code, local);
    setTimeout(() => localInputRef.current?.focus(), 50);
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Si l'utilisateur colle un numéro avec préfixe international,
    // on détecte le pays et on retire le préfixe automatiquement.
    const trimmed = raw.trim();
    if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
      const detected = getCountryFromPhone(trimmed);
      const localOnly = getLocalPhoneNumber(trimmed);
      if (detected && detected !== country) {
        setUserTouchedCountry(true);
        setCountry(detected);
        setLocal(localOnly);
        emitChange(detected, localOnly);
        return;
      }
      if (localOnly !== raw) {
        setLocal(localOnly);
        emitChange(country, localOnly);
        return;
      }
    }

    setLocal(raw);
    emitChange(country, raw);
  }

  function handleBlurContainer(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setSearch("");
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return PHONE_COUNTRIES;
    const q = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return PHONE_COUNTRIES.filter((c) => {
      const name = c.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const code = c.code.toLowerCase();
      const prefixDigits = c.prefix.toLowerCase();
      return name.includes(q) || code.includes(q) || prefixDigits.includes(q);
    });
  }, [search]);

  return (
    <div
      ref={containerRef}
      className={cn("relative flex w-full items-stretch", className)}
      onBlur={handleBlurContainer}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={local ? (prefix ? `+${prefix} ${local.replace(/\D/g, "")}` : local) : ""}
        />
      )}

      {/* Country/prefix trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }}
        className={cn(
          "flex h-10 shrink-0 items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-accent focus:z-10 focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        )}
        aria-label="Choisir l'indicatif"
      >
        <span className="text-base leading-none">{isoToFlagEmoji(country)}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {prefix ? `+${prefix}` : "—"}
        </span>
        <ChevronDown
          className={cn(
            "ml-0.5 h-3.5 w-3.5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Local number input */}
      <input
        ref={localInputRef}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        required={required}
        disabled={disabled}
        value={local}
        onChange={handleLocalChange}
        placeholder={placeholder}
        className="flex h-10 w-full min-w-0 rounded-r-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />

      {/* Country dropdown */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[280px] overflow-hidden rounded-xl border bg-popover shadow-lg sm:min-w-[320px]">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays ou indicatif..."
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun pays trouvé
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c.code)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    c.code === country && "bg-primary/5 font-medium",
                  )}
                >
                  <span className="text-base leading-none">{isoToFlagEmoji(c.code)}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">+{c.prefix}</span>
                  {c.code === country && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
