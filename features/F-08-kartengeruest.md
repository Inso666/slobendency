# F-08 · Kartengerüst: Skalen, Raster, Reviere

**Schicht:** Darstellung · **Hängt ab von:** F-01, F-02 · **Umfang:** L

## Ziel

Die leere Seekarte: Skalen, Fibonacci-Raster, vier getönte Reviere mit Namen, Rahmen, Achsen
und Teilstriche — als eigenes SVG in Svelte-Komponenten, damit der spätere Bildexport nur noch
dieselbe Struktur serialisieren muss.

## DDD-Einordnung

Darstellungsschicht. Die Skalen sind reine Rechenfunktionen ohne Svelte-Abhängigkeit und daher
für sich testbar. Die Rendering-Schicht bleibt hinter der Komponentengrenze gekapselt, damit
der Migrationsvorbehalt aus PRD 7.1 offen bleibt (NFR-43).

## Umfang

`src/lib/layout/scales.ts`

```ts
export const VIEWBOX = { width: 1000, height: 700 } as const;
export const PLOT = { left: 80, right: 960, top: 40, bottom: 620 } as const;

export function domainMaxOf(map: FeatureMap): number;   // max(21, größter Wert) + 1
export function xOf(effort: number, domainMax: number): number;
export function yOf(impact: number, domainMax: number): number;
export function ticksOf(domainMax: number): number[];
export function regionRects(domainMax: number): Array<{ quadrant: Quadrant; x: number; y: number; width: number; height: number }>;
```

Formeln — sie sind verbindlich, weil der Entwurf auf ihnen aufsetzt:

```
xOf(e) = PLOT.left   + (e / domainMax) * (PLOT.right - PLOT.left)
yOf(i) = PLOT.bottom - (i / domainMax) * (PLOT.bottom - PLOT.top)
```

Bei leerer Karte ist `domainMax` gleich 22; damit liegt der Teilstrich 21 auf x = 920 und
y = 67, die Reviergrenzen auf x = 520 und y = 330 (FR-26).

`ticksOf` liefert die Werte der Schätzreihe, die kleiner oder gleich `domainMax` sind. Enthält
die Karte Werte oberhalb von 21, kommt zusätzlich `domainMax - 1` als Teilstrich hinzu, damit
die Achse ihre Obergrenze zeigt.

Komponenten unter `src/lib/components/Map/`:

- `MapCanvas.svelte` — SVG-Wurzel mit `viewBox`, `role="img"` und einer Beschreibung; enthält
  die Marker- und Musterdefinitionen und gibt Kindkomponenten die Skala weiter.
- `Regions.svelte` — vier getönte Rechtecke plus Schraffur auf *Vermeiden*, darüber die
  Reviernamen.
- `Grid.svelte` — Gitterlinien auf den Teilstrichwerten beider Achsen.
- `Axes.svelte` — Rahmen, Teilstrichbeschriftungen, Achsentitel.

## Darstellung

Übernommen aus `design/03-seekarte.html`, mit den dortigen Klassennamen und Token:

| Element | Umsetzung |
|---|---|
| Reviere | `.r-qw` `--shallow`, `.r-gv` `--deep`, `.r-nb` `--flat`, `.r-vm` `--hazard`; über *Vermeiden* zusätzlich das Schraffurmuster `#hatch` in `--magenta` mit `--hatch-opacity` |
| Reviername | `.region-lbl`, Fraunces kursiv, `letter-spacing: .38em`, in `--region`, mittig im Revier, oben 34 px unter der Rahmenkante, unten 20 px darüber |
| Raster | `.grid-line` in `--grid`, 1 px, nur auf Teilstrichwerten — das ungleichmäßige Raster ist gewollt |
| Rahmen | `.frame` in `--rule`, 1 px, umschließt die Plotfläche |
| Teilstrichbeschriftung | `.tick-lbl`, Azeret Mono 10,5 px, x-Achse auf y = 638 mittig, y-Achse auf x = 68 rechtsbündig |
| Achsentitel | `.axis-lbl`, Fraunces kursiv gesperrt: *EFFORT* mittig auf (520, 664), *IMPACT* um −90° gedreht mittig auf (32, 330) |

Die Karte füllt die Fläche zwischen Kopfband und Fußleiste, behält ihr Seitenverhältnis
(`preserveAspectRatio="xMidYMid meet"`) und läuft in beiden Tafeln.

## Fachregeln

| ID | Regel |
|---|---|
| FR-20 | X-Achse ist Aufwand, Y-Achse ist Nutzen |
| FR-21 | Hoher Nutzen liegt oben |
| FR-22 | Vier Reviere, dezent beschriftet |
| FR-26 | Achsen skalieren auf den vorhandenen Wertebereich, mindestens bis 21 |
| — | Reviergrenze bei `domainMax / 2`, identisch zu `quadrantOf` aus F-02 |

## Akzeptanzkriterien

- [ ] Leere Karte: Teilstriche 1, 2, 3, 5, 8, 13, 21 auf beiden Achsen, Reviergrenzen mittig.
- [ ] Ein Feature mit `effort = 34` verschiebt `domainMax` auf 35; die Achse zeigt zusätzlich
      den Teilstrich 34, alle Positionen skalieren mit.
- [ ] `xOf(0, 22)` ist 80, `xOf(22, 22)` ist 960, `yOf(0, 22)` ist 620, `yOf(22, 22)` ist 40.
- [ ] Die Reviere decken die Plotfläche lückenlos und überlappungsfrei ab.
- [ ] In der Nachttafel wechseln alle Flächen und Linien mit; kein Element bleibt hell.
- [ ] Kein Hexwert in einer Komponente unter `Map/`.

## Tests

- Unit für `scales.ts`: Randwerte, Skalierung bei großen Werten, Teilstrichliste, Revierrechtecke.
- E2E: leere Karte rendert Rahmen, sieben Teilstriche je Achse und vier Reviernamen.

## Nicht Teil dieses Features

Features und Kanten auf der Karte (F-09, F-10), Zoom und Pan (F-12), Zeichenerklärung
(F-10 liefert sie zusammen mit dem Signaturenkatalog).
