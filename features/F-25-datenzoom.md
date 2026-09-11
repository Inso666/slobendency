# F-25 · Datenzoom (ersetzt das Zoom-Verhalten aus F-12)

**Schicht:** Darstellung · **Hängt ab von:** F-08, F-12 · **Umfang:** L

## Ziel

Zoomen zeigt einen kleineren Wertebereich mit neu berechneten Achsen — wie eine Kartenansicht,
nicht wie das Vergrößern eines Fotos. Punktgrößen und Schrift bleiben dabei bildschirmkonstant.

## DDD-Einordnung

Weiterhin reiner Darstellungszustand wie in F-12; der Ausschnitt gehört nicht zum Aggregat und
wird nicht persistiert. Ersetzt wird nur die Art, wie der Ausschnitt wirkt: nicht mehr als
Bildtransformation einer SVG-Gruppe, sondern als veränderter Eingabebereich der Skalenfunktionen
aus F-08.

## Umfang

`src/lib/store/viewport.ts` (ersetzt die Struktur aus F-12 vollständig):

```ts
export interface Viewport {
  centerEffort: number;
  centerImpact: number;
  visibleRange: number;   // Seitenlänge des sichtbaren quadratischen Ausschnitts in Werteeinheiten
}
export const viewport: Writable<Viewport>;
export function resetViewport(domainMax: number): void;          // centerEffort=centerImpact=domainMax/2, visibleRange=domainMax
export function centerOn(effort: number, impact: number): void;  // für F-14, hält visibleRange
export function zoomAt(deltaFactor: number, pointerEffort: number, pointerImpact: number, domainMax: number): void;
```

`src/lib/layout/scales.ts` erhält ein Fenster statt eines festen `domainMax`:

```ts
export function xOf(effort: number, windowMin: number, windowMax: number): number;
export function yOf(impact: number, windowMin: number, windowMax: number): number;
export function ticksOf(windowMin: number, windowMax: number): number[];   // "schöne" Werte im Fenster
```

`ticksOf` aus F-08 (Fibonacci-Reihe) bleibt als eigener Pfad erhalten und wird nur aufgerufen,
wenn `visibleRange = domainMax` **und** der Schätzmodus Fibonacci ist (F-26 entscheidet den
zweiten Teil dieser Bedingung); in jedem anderen Fall — insbesondere hineingezoomt — liefert
`ticksOf` runde, gleichmäßig verteilte Werte im übergebenen Fenster (z. B. über `d3-scale`,
das PRD 7.1 bereits für Skalenzwecke vorsieht; eine Fibonacci-Reihe wäre in einem beliebigen
Fenster zu lückenhaft, um noch als Raster zu taugen).

`Axes.svelte`, `Grid.svelte`, `Regions.svelte` (aus F-08) lesen künftig das sichtbare Fenster aus
`viewport` und rendern bei jeder Änderung neu; die `transform`-Gruppe aus F-12, die bisher das
gesamte SVG verzerrt hat, entfällt.

## Verhalten

| Aktion | Desktop | Mobil |
|---|---|---|
| Zoom | Mausrad, Zoom auf den Zeiger zentriert (Wertepunkt unter dem Zeiger bleibt an Ort und Stelle) | Pinch, Zoom auf die Mitte der Geste |
| Pan | Ziehen auf freier Fläche | Ein-Finger-Drag |
| Zurücksetzen | Knopf *Ansicht → Ganze Karte zeigen* | derselbe Knopf |

Formel für den Zoomschritt (verbindlich, siehe PRD 7.3):

```
visibleRange ∈ [domainMax / 4, domainMax]   // 4x maximal hineingezoomt, 1x = volle Ansicht, kein Herauszoomen darüber hinaus

FUNKTION zoomAt(deltaFaktor, zeigerEffort, zeigerImpact, domainMax):
  neuerBereich ← clamp(visibleRange * deltaFaktor, domainMax / 4, domainMax)
  skalenFaktor ← neuerBereich / visibleRange
  centerEffort ← zeigerEffort + (centerEffort - zeigerEffort) * skalenFaktor
  centerImpact ← zeigerImpact + (centerImpact - zeigerImpact) * skalenFaktor
  visibleRange ← neuerBereich
  // centerEffort/centerImpact anschließend je Achse so klemmen, dass
  // [center ± visibleRange/2] innerhalb [0, domainMax] bleibt
```

Punktradien und Schriftgrößen bleiben bei jedem `visibleRange` bildschirmkonstant (kein
Herunterrechnen mehr wie in F-12) — nur ihre Position im Fenster ändert sich.

Ein Ziehen, das auf einem Feature beginnt, verschiebt weiterhin die Karte nicht — dort gilt der
Klick der Selektion.

## Fachregeln

| ID | Regel |
|---|---|
| FR-25 (geändert) | Zoom und Pan verändern den sichtbaren Wertebereich der Achsen (Datenzoom), nicht das gerenderte Bild als Ganzes; Achsen, Teilstriche und Rasterlinien zeigen fortlaufend den aktuell sichtbaren Ausschnitt, Punkt- und Schriftgrößen bleiben bildschirmkonstant |
| FR-26 | Achsen skalieren auf den vorhandenen Wertebereich, mindestens bis 21 (Fibonacci) bzw. bis zum eingestellten Maximum (frei, F-26 der Feature-Liste) — hier über `visibleRange = domainMax` erfüllt |
| FR-65 | Der Bildexport umfasst immer die vollständige Karte, unabhängig vom Ausschnitt (unverändert, F-20/F-21) |
| NFR-07 | 60 fps auf Desktop, mindestens 30 fps mobil |
| UI-14 | Zoom und Pan per Pinch- und Drag-Geste |

## Akzeptanzkriterien

- [ ] Mausrad über der Karte verkleinert `visibleRange`; der Wertepunkt unter dem Zeiger bleibt
      unter dem Zeiger (Datenkoordinate, nicht nur Bildposition) (AK-18).
- [ ] Bei `visibleRange = domainMax / 4` zeigen die Achsen neu berechnete, runde Teilstriche für
      das sichtbare Fenster, nicht mehr zwingend die Fibonacci-Werte.
- [ ] `visibleRange` lässt sich nicht unter `domainMax / 4` und nicht über `domainMax` treiben.
- [ ] *Ganze Karte zeigen* stellt `visibleRange = domainMax` und die zentrierte Ansicht wieder
      her.
- [ ] Punktradius und Schriftgröße eines Features sind bei `visibleRange = domainMax` und bei
      `visibleRange = domainMax / 4` identisch groß auf dem Bildschirm.
- [ ] Ziehen auf freier Fläche verschiebt den Ausschnitt; Ziehen auf einem Feature nicht.
- [ ] Bei `visibleRange = domainMax / 4` bleiben Selektion und Hervorhebung aus F-11/F-24
      korrekt.
- [ ] Nach einem Neuladen ist wieder die Vollansicht (`visibleRange = domainMax`) aktiv.
- [ ] Der Bildexport enthält weiterhin die vollständige Karte unabhängig vom aktuellen
      Zoom-Ausschnitt (FR-65).
- [ ] Zoomen und Verschieben laufen bei 100 Features flüssig (NFR-07).

## Tests

- Unit für `viewport.ts`: Zoom um einen Wertepunkt, Klemmen an `domainMax/4` und `domainMax`,
  Zurücksetzen, Zentrieren.
- Unit für `scales.ts`-Erweiterung: `xOf`/`yOf` mit Fenstergrenzen ungleich `[0, domainMax]`,
  `ticksOf` liefert runde Werte innerhalb eines beliebigen Fensters, Fibonacci-Pfad nur bei
  vollem Fenster.
- E2E: Wheel-Ereignis verkleinert den sichtbaren Bereich und ändert die
  Teilstrichbeschriftungen; Drag verschiebt den Ausschnitt; Reset stellt die volle Ansicht her;
  Punktradius (in Bildschirmpixeln gemessen) bleibt beim Hineinzoomen konstant.

## Nicht Teil dieses Features

Bildexport (F-20, F-21, unverändert). Zentrieren beim Klick im Verzeichnis (F-14; `centerOn`
bleibt in der Signatur erhalten). Schätzmodus und dessen Einfluss auf `ticksOf` im Fall
`visibleRange = domainMax` (F-26).
