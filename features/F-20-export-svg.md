# F-20 · SVG-Export

**Schicht:** Austausch · **Hängt ab von:** F-10 · **Umfang:** M

## Ziel

Die Karte als SVG-Datei, die auf fremden Rechnern genauso aussieht wie hier — vollständig,
unabhängig vom aktuellen Ausschnitt und unabhängig davon, was gerade selektiert ist.

## DDD-Einordnung

Darstellungsnahe Infrastruktur. Der Export arbeitet auf demselben SVG, das die Karte ohnehin
rendert; er baut keine zweite Zeichenlogik auf. Genau deshalb schreibt PRD 7.1 eigenes SVG vor.

## Umfang

`src/lib/export/svg.ts`

```ts
export interface ExportOptions { keepSelection?: boolean; theme?: 'light' | 'dark'; }
export function buildExportSvg(source: SVGSVGElement, options?: ExportOptions): string;
export function downloadSvg(source: SVGSVGElement, options?: ExportOptions): void;
```

Ablauf:

1. Das gerenderte SVG tief klonen.
2. Die Ausschnittstransformation aus F-12 aus dem Klon entfernen.
3. Umschließendes Rechteck über alle Elemente bestimmen, 24 Einheiten Rand addieren und daraus
   die `viewBox` des Klons setzen (FR-65).
4. Selektionszustände zurücknehmen: `.dim`, `.sel` und `.halo` entfernen, Kantenbeschriftungen
   auf sichtbar setzen, sofern sie zu einer Beziehung mit Beschriftung gehören (FR-67).
5. Alle wirksamen Stilregeln als `<style>`-Block in den Klon einsetzen, mit den Token der
   gewählten Tafel als feste Werte — im Canvas und in fremden Programmen greifen externe
   Stylesheets nicht.
6. Schriften über einen websicheren Stack angeben: `Fraunces, Georgia, serif`, `Karla,
   Helvetica, Arial, sans-serif`, `Azeret Mono, Consolas, monospace` (FR-68).
7. Hintergrundrechteck in `--paper` als erstes Kind einsetzen, damit die Datei nicht
   durchsichtig auf Weiß liegt.
8. Als Zeichenkette mit `XMLSerializer` ausgeben, Dateiname `featuremap-JJJJ-MM-TT.svg`.

Standardtafel für den Export ist **Tag**, auch wenn die Oberfläche gerade auf Nacht steht —
eine dunkle Grafik in einer Präsentation ist selten gewollt. Im Menü *Exportieren* steht dafür
ein Umschalter *Tafel: Tag / Nacht*.

## Fachregeln

| ID | Regel |
|---|---|
| FR-63 | Download der Karte als SVG |
| FR-65 | Immer die vollständige Karte, unabhängig von Zoom und Pan |
| FR-66 | Enthält Achsen, Achsenbeschriftungen, Reviernamen, alle Features und alle Beziehungen |
| FR-67 | Neutraler Zustand ohne Selektion und ohne Dimming, sofern nicht anders gewählt |
| FR-68 | Schriften über websicheren Stack, damit die Darstellung stabil bleibt |
| NFR-21 | Beschriftungen bleiben Text; es wird nichts als Markup eingesetzt |

## Akzeptanzkriterien

- [ ] Bei auf einen Ausschnitt gezoomter Karte enthält die Datei dennoch alle Features (AK-12).
- [ ] Bei aktiver Selektion enthält die Datei keine abgedunkelten Elemente und keinen Halo.
- [ ] Die Datei enthält Rahmen, Teilstriche, beide Achsentitel und alle vier Reviernamen.
- [ ] Die Datei öffnet sich in einem zweiten Browser ohne Nachladen externer Ressourcen und
      ohne Stilverlust.
- [ ] Der Export mit gewählter Nachttafel erzeugt eine dunkle Datei mit denselben Inhalten.
- [ ] Kein `<style>`-Verweis auf eine externe Datei bleibt übrig.

## Tests

- Unit: umschließendes Rechteck über eine bekannte Karte, Entfernen der Zustände, eingebettete
  Stile vorhanden, Ausschnitt ohne Wirkung auf das Ergebnis.
- E2E: Zoomen, exportieren, im Ergebnis die Zahl der Feature-Signaturen zählen.

## Nicht Teil dieses Features

PNG (F-21), Export der DSL (F-19).
