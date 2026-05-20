import { useState } from "react";
import type { CatalogEntry } from "@/components/process-designer/types";

const STORAGE_KEY = "process-catalog";

function load(): CatalogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persist(entries: CatalogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useCatalog() {
  const [entries, setEntries] = useState<CatalogEntry[]>(load);

  const save = (name: string, xml: string) => {
    setEntries((prev) => {
      // Upsert by name
      const filtered = prev.filter((e) => e.name !== name);
      const next: CatalogEntry[] = [
        { id: crypto.randomUUID(), name, xml, createdAt: Date.now() },
        ...filtered,
      ];
      persist(next);
      return next;
    });
  };

  const remove = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persist(next);
      return next;
    });
  };

  return { entries, save, remove };
}
