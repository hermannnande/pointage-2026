"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { COUNTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CountrySelectProps {
  value: string;
  onChange: (code: string) => void;
  name?: string;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  name,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return COUNTRIES;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return COUNTRIES.filter((c) => {
      const name = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const code = c.code.toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [search]);

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setOpen(false);
      setSearch("");
    },
    [onChange],
  );

  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
      setSearch("");
    }
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)} onBlur={handleBlur}>
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className="truncate text-left">
          {selected ? selected.name : "Choisir un pays..."}
        </span>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[280px] overflow-hidden rounded-xl border bg-popover shadow-lg sm:min-w-[340px]">
          {/* Search bar */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un pays..."
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          {/* List */}
          <div className="max-h-[280px] overflow-y-auto overscroll-contain sm:max-h-[340px]">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Aucun pays trouvé pour &quot;{search}&quot;
              </p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelect(c.code)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                    c.code === value && "bg-primary/5 font-medium",
                  )}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.code === value && (
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
