# AI Process Designer

NoCode-Frontend zur visuellen Modellierung KI-gestützter Entscheidungs- und Analyseprozesse.

## Voraussetzungen

- [Node.js](https://nodejs.org/) ≥ 18
- npm ≥ 9

## Entwicklung

```bash
# Abhängigkeiten installieren (einmalig)
npm install

# Dev-Server starten
npm run dev
```

Die App ist danach unter **http://localhost:5173** erreichbar.

## Produktion

```bash
# Build erstellen
npm run build

# Build lokal vorschauen
npm run preview
```

Der fertige Build liegt im Ordner `dist/` und kann auf jedem statischen Webserver (z. B. Nginx, GitHub Pages, Netlify) deployt werden.

## Weitere Befehle

```bash
npm run lint      # ESLint ausführen
npm run format    # Prettier formatieren
```

## Techstack

| Bereich | Technologie |
|---|---|
| Framework | React 19 |
| Routing | TanStack Router |
| Flow-Editor | React Flow (@xyflow/react) |
| UI-Komponenten | shadcn/ui + Radix UI |
| Styling | Tailwind CSS 4 |
| Build | Vite 7 |

## Funktionen

- **Visueller Flow-Editor** – Nodes per Drag & Drop platzieren und verbinden
- **Prozess-Templates** – QOC-Analyse, Stakeholder-Analyse, Vester-Matrix
- **Node-Typen** – Input, Agent, Prompt, Loop, Merge, Matrix, Analyzer, Report
- **Eigenschaften-Panel** – Nodes direkt im Editor konfigurieren
- **XML-Vorschau** – Prozessdefinition als XML exportieren
- **KI-Chat-Panel** – Prozesse per natürlicher Sprache beschreiben
