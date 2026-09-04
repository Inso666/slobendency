# F-09 · Feature-Signaturen und Jitter

**Schicht:** Darstellung · **Hängt ab von:** F-08 · **Umfang:** M

## Ziel

Jedes Feature erscheint als Signatur auf der Karte: gefüllter Punkt, Name daneben, darunter die
Lotung. Features auf demselben Wertepaar werden sichtbar auseinandergezogen, ohne dass ihre
Werte sich ändern.

## DDD-Einordnung

Darstellung. Der Versatz ist ausdrücklich **keine** Eigenschaft des Features: Er wird bei jedem
Rendern neu berechnet, nie gespeichert und nie exportiert.

## Umfang

`src/lib/layout/jitter.ts`

```ts
export const BASE_RADIUS = 9;    // Einheiten der viewBox
export const MAX_RADIUS = 16;    // kleiner als der halbe Rasterabstand (40 / 2)

export interface Placement { id: FeatureId; x: number; y: number; anchorX: number; anchorY: number; jittered: boolean; }
export function placeFeatures(map: FeatureMap, domainMax: number): Placement[];
```

Vorgehen:

1. Features nach Wertepaar gruppieren.
2. Gruppen mit einem Mitglied bleiben auf dem Ankerpunkt.
3. Innerhalb einer größeren Gruppe wird nach Kennung stabil sortiert; daraus ergibt sich der
   Gruppenindex.
4. Versatz nach PRD 7.3:
   ```
   seed   = fnv1a32(id)
   winkel = 2π · index / groesse + (seed mod 360) im Bogenmaß
   radius = min(BASE_RADIUS · √groesse, MAX_RADIUS)
   ```
   `fnv1a32` ist ein 32-Bit-FNV-1a-Hash über die Kennung — festgelegt, damit das Ergebnis
   zwischen Sitzungen und Rechnern gleich bleibt.

`src/lib/components/Map/FeatureNodes.svelte` zeichnet die Signaturen.

## Darstellung

| Element | Umsetzung |
|---|---|
| Punkt | `.node circle`, Radius 8, Füllung `--ink`, Kontur `--paper` 2 px (Freistellung gegen Kanten) |
| Name | `.node text`, Karla 13 px, 16 Einheiten rechts vom Mittelpunkt, 5 darüber, mit Freistellungskontur (`paint-order: stroke` in `--paper`) |
| Lotung | `.node .snd`, Azeret Mono 10,5 px in `--ink-soft`, 16 Einheiten rechts, 11 unter dem Mittelpunkt, Form `13 · 8` (Nutzen, Trennpunkt, Aufwand) |
| Ankerkreuz | Bei versetzten Signaturen ein Kreuz von 10 Einheiten Länge auf dem Ankerpunkt, `.anchor` in `--ink-soft` |
| Fehlender Anzeigename | Es wird die Kennung angezeigt |

Liegt ein Feature so weit rechts, dass sein Name über den Rahmen liefe (Mittelpunkt jenseits
von 82 % der Plotbreite), wird der Name links neben den Punkt gesetzt und rechtsbündig
ausgerichtet.

## Fachregeln

| ID | Regel |
|---|---|
| FR-23 | Jedes Feature ist ein Kreis mit Beschriftung |
| FR-30 | Gleiche Wertepaare werden visuell gegeneinander versetzt |
| FR-31 | Der Versatz ist rein visuell; gespeicherte Werte, Lotung und Export zeigen die Originalwerte |
| FR-32 | Der Versatz ist deterministisch, abgeleitet aus der Kennung |
| FR-33 | Radial um den Ankerpunkt, Radius kleiner als der halbe Rasterabstand |
| FR-24 | Änderungen am Bestand wirken sofort |
| NFR-21 | Anzeigenamen werden ausschließlich als Text gerendert — Svelte-Textbindung, niemals `{@html}` |

## Akzeptanzkriterien

- [ ] Drei Features mit `impact = 5, effort = 5` sind einzeln erkennbar und einzeln
      anklickbar; ihre Lotungen zeigen alle `5 · 5` (AK-05).
- [ ] Zweimaliges Rendern derselben Karte ergibt identische Koordinaten; auch nach einem
      Neuladen der Seite.
- [ ] Das Hinzufügen eines vierten Features auf demselben Wertepaar verändert die Anordnung
      der Gruppe, aber nicht die Position anderer Gruppen.
- [ ] Ein Feature mit Anzeigename `<script>alert(1)</script>` erscheint als sichtbarer Text,
      ohne dass Skript ausgeführt wird (AK-13).
- [ ] Ein Feature ohne Anzeigenamen zeigt seine Kennung.
- [ ] Neurendern nach einer Änderung dauert unter 100 ms bei 100 Features (NFR-02).

## Tests

- Unit für `jitter.ts`: Einzelgruppe ohne Versatz, Gruppengrößen 2 bis 5, Determinismus über
  wiederholte Aufrufe, Radiusgrenze, Unabhängigkeit von der Reihenfolge im Array.
- E2E: drei deckungsgleiche Features sind drei anklickbare Ziele (AK-05).

## Nicht Teil dieses Features

Kanten (F-10), Selektionszustände (F-11), Trefferflächen für Touch (F-22).
