# F-10 · Kanten und Signaturenkatalog

**Schicht:** Darstellung · **Hängt ab von:** F-09 · **Umfang:** L

## Ziel

Die drei Beziehungsarten werden sichtbar — jede an ihrer Linienform erkennbar, nicht an ihrer
Farbe — und die Zeichenerklärung erklärt den Katalog auf der Karte selbst.

## DDD-Einordnung

Darstellung. Die Kantengeometrie ist eine reine Rechenfunktion über den Platzierungen aus F-09
und daher ohne DOM testbar.

## Umfang

`src/lib/layout/edges.ts`

```ts
export const TRIM_SOURCE = 12;
export const TRIM_TARGET = 18;          // vor der Pfeilspitze
export const TRIM_TARGET_RING = 19;     // Ziel trägt den Vorbedingungsring
export const TRIM_TARGET_EXCLUDE = 22;  // Platz für die x-Endmarke

export interface EdgeGeometry {
  relation: Relation;
  x1: number; y1: number; x2: number; y2: number;
  labelX: number; labelY: number; labelAnchor: 'start' | 'middle' | 'end';
  crossMark?: { x: number; y: number; angle: number };
}
export function layoutEdges(relations: Relation[], placements: Placement[]): EdgeGeometry[];
```

Kanten sind gerade Strecken zwischen den Mittelpunkten, an beiden Enden um die
Trimmwerte gekürzt. Die Beschriftung sitzt in der Mitte der Strecke, 8 Einheiten senkrecht
nach oben versetzt; verläuft die Kante steiler als 45°, wird die Beschriftung stattdessen
seitlich versetzt und je nach Laufrichtung links- oder rechtsbündig gesetzt.

Komponenten:

- `src/lib/components/Map/Edges.svelte`
- `src/lib/components/Map/Legend.svelte` — die Zeichenerklärung als Kartusche

## Signaturenkatalog

| Beziehung | Linie | Endmarke | Zusatz am Ziel |
|---|---|---|---|
| benötigt (`requires`) | durchgezogen, `.e-req` in `--ink`, 1,4 px | Pfeilspitze `#tipInk` | umschließender Ring, `.ring` in `--ink`, gestrichelt `2 3`, Radius 15 |
| hängt zusammen (`relates`) | gestrichelt `4 4`, `.e-rel` in `--sea` | Pfeilspitze `#tipSea` | keiner |
| schließt aus (`excludes`) | durchgezogen, `.e-exc` in `--magenta` | `x`-Marke aus zwei gekreuzten Strichen am Ziel-Ende | Punkt wird durchgestrichen, `.strike` in `--magenta`, 1,6 px |

Die Unterscheidung erfolgt bewusst über Linienform und Endmarke, nicht allein über Farbe
(PRD 5.6, Hinweis zur Zugänglichkeit). Bei einer Prüfung in Graustufen müssen alle drei Arten
unterscheidbar bleiben.

Trägt ein Feature mehrere Rollen gleichzeitig — es ist Vorbedingung einer Kante und Ziel einer
Ausschlusskante — werden Ring und Durchstreichung beide gezeichnet.

Die Zeichenerklärung liegt als Kartusche unten rechts über der Karte, 236 px breit, mit den
vier Einträgen *benötigt*, *hängt zusammen*, *schließt aus*, *Vorbedingung* und deren
Musterlinien. Unter 1080 px Fensterbreite wird sie ausgeblendet.

## Fachregeln

| ID | Regel |
|---|---|
| PRD 5.6 | Signaturen wie in der Tabelle |
| FR-45 | Kantenbeschriftungen sind im Grundzustand unsichtbar; sie erscheinen nur bei Selektion oder Hover (die Zustände liefert F-11, hier wird nur die Sichtbarkeit vorbereitet) |
| FR-24 | Kanten aktualisieren sich sofort bei Änderungen |
| NFR-21 | Kantenbeschriftungen sind reiner Text |

## Akzeptanzkriterien

- [ ] Alle drei Arten werden mit der jeweils richtigen Linienform und Endmarke gezeichnet.
- [ ] Das Ziel einer `requires`-Kante trägt einen Ring, das Ziel einer `excludes`-Kante eine
      Durchstreichung.
- [ ] Kanten enden sichtbar vor dem Zielpunkt; keine Pfeilspitze verschwindet unter einem Punkt.
- [ ] Zwei Kanten zwischen demselben Paar mit verschiedener Art sind beide sichtbar.
- [ ] Kantenbeschriftungen sind ohne Selektion nicht sichtbar.
- [ ] Eine Kante auf ein versetztes Feature endet am versetzten Punkt, nicht am Ankerpunkt.
- [ ] In Graustufen bleiben die drei Arten unterscheidbar.
- [ ] In der Nachttafel wechseln Linien, Marken und Kartusche mit.

## Tests

- Unit für `edges.ts`: Trimmung an beiden Enden, Trimmwert je Zielart, Beschriftungsposition
  bei flacher und steiler Kante, Kante der Länge nahe null (zwei versetzte Features derselben
  Gruppe) bricht nicht.
- E2E: eine Karte mit je einer Kante pro Art zeigt drei unterschiedliche Signaturen.

## Nicht Teil dieses Features

Hervorhebung und Dimming (F-11), Anlegen von Beziehungen (F-16), Kantenrouting um Hindernisse
— gerade Strecken sind für den MVP gewollt.
