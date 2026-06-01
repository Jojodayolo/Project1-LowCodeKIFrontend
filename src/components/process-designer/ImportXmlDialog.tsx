import { useRef, useState } from "react";
import { parseProcessXml, type ParseResult } from "./parseProcessXml";
import { isValidXml } from "./validateXml";

interface Props {
  onImport: (result: ParseResult) => void;
  onClose: () => void;
}

export function ImportXmlDialog({ onImport, onClose }: Props) {
  const [xml, setXml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setXml(reader.result as string);
      setError(null);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (isValidXml(xml)) {
      const result = parseProcessXml(xml);
      onImport(result);
    } else {
      setError("Ungültiges XML-Format. Bitte überprüfen Sie Ihre Eingabe.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-[560px] flex-col rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold">XML Import</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Prozess-XML einfügen oder Datei hochladen
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="Schließen"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-accent transition"
            >
              Datei wählen…
            </button>
            <span className="text-[11px] text-muted-foreground">oder XML unten einfügen</span>
            <input
              ref={fileRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <textarea
            rows={16}
            className="w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary/60 resize-none"
            placeholder='<?xml version="1.0" encoding="UTF-8"?>&#10;<process name="…">&#10;  …&#10;</process>'
            value={xml}
            onChange={(e) => { setXml(e.target.value); setError(null); }}
          />

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition"
          >
            Abbrechen
          </button>
          <button
            onClick={handleImport}
            disabled={!xml.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
          >
            Importieren
          </button>
        </div>
      </div>
    </div>
  );
}
