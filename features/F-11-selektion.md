# F-11 · Selektion, Hervorhebung, Dimming

**Schicht:** Darstellung · **Hängt ab von:** F-07, F-10 · **Umfang:** M

## Ziel

Der Kernnutzen der Anwendung: Ein Klick auf ein Feature zeigt, was dafür vorher fertig sein
muss, was damit zusammenhängt und was es ausschließt — alles andere tritt zurück, ohne zu
verschwinden.

## DDD-Einordnung

Darstellung über den Domänen-Services aus F-07. Die Regel, *was* hervorgehoben wird, stammt
aus der Domäne; *wie* es hervorgehoben wird, entscheidet dieses Feature.

## Umfang

`src/lib/store/highlight.ts`

```ts
export interface HighlightSet { features: Set<FeatureId>; relations: Set<string>; }
export const highlight: Readable<HighlightSet | null>;   // null = keine Selektion
export function relationKey(relation: Relation): string; // "from|type|to"
```

Der Store leitet sich aus `selectedId`, `highlightMode` (beide aus F-03) und der Karte ab:

- Modus *transitiv*: `requiresClosure` für alle Vorbedingungen, dazu die **direkten**
  `relates`- und `excludes`-Nachbarn des selektierten Features.
- Modus *nur direkte*: alle direkten Nachbarn des selektierten Features, unabhängig von der
  Art, ohne transitive Fortsetzung.
- Das selektierte Feature ist immer Teil der Menge.

Erweitert werden `FeatureNodes.svelte` und `Edges.svelte` um die Zustände; neu ist
`MapCanvas.svelte` als Empfänger der Klicks auf freie Fläche.

## Darstellung

| Zustand | Umsetzung |
|---|---|
| Selektiertes Feature | `.node.sel`: Punkt in `--magenta`, umgebender Halo-Kreis `.halo` Radius 15 in `--magenta`, Name in 600 |
| Hervorgehoben | volle Deckkraft, Signatur wie im Grundzustand |
| Abgedunkelt | Klasse `.dim`, Deckkraft 0,24 in der Tag-, 0,3 in der Nachttafel — nie ausgeblendet (FR-43) |
| Kantenbeschriftung | nur an hervorgehobenen Kanten sichtbar (FR-45) |
| Hover ohne Selektion | Beschriftung der überfahrenen Kante wird eingeblendet |

Die Fußleiste zeigt bei aktiver Selektion den Kurs — die transitive `requires`-Kette in der
Form `Rollen & Rechte → Single Sign-On → Benutzer-Login` (Anzeige selbst in F-23).

## Interaktion

| Aktion | Verhalten |
|---|---|
| Klick auf Feature | Selektiert es (FR-40) |
| Klick auf freie Fläche | Hebt die Selektion auf (FR-46) |
| ESC | Hebt die Selektion auf; läuft ein Verbindungsvorgang, wird zuerst dieser abgebrochen (FR-13) |
| Umschalter *Hervorhebung* | Wechselt zwischen *nur direkte* und *transitiv* (FR-44); die Karte reagiert sofort, ohne die Selektion zu verlieren |

## Fachregeln

| ID | Regel |
|---|---|
| FR-41 | `requires`-Vorbedingungen werden transitiv aufgelöst und hervorgehoben |
| FR-42 | `relates` und `excludes` nur für die direkte Nachbarschaft |
| FR-43 | Nicht beteiligte Elemente werden abgedunkelt, nicht ausgeblendet |
| FR-44 | Umschalter zwischen direkter und transitiver Hervorhebung |
| FR-45 | Kantenbeschriftungen nur bei Selektion oder Hover |
| FR-46 | Selektion aufhebbar per Klick ins Leere oder ESC |
| NFR-03 | Selektion inklusive Auflösung und Hervorhebung unter 50 ms |

## Akzeptanzkriterien

- [ ] Kette A → B → C: Selektion von A hebt B und C hervor (AK-06).
- [ ] A `requires` B, B `relates` C: Selektion von A hebt C nicht hervor (AK-07).
- [ ] Umschalten auf *nur direkte* nimmt C aus der Hervorhebung, ohne die Selektion zu lösen.
- [ ] Ein Feature, das nur eingehende `requires`-Kanten zum selektierten Feature hat, bleibt
      abgedunkelt.
- [ ] Abgedunkelte Elemente sind sichtbar, aber deutlich zurückgenommen; nichts verschwindet.
- [ ] Beschriftungen erscheinen ausschließlich an hervorgehobenen oder überfahrenen Kanten.
- [ ] ESC und Klick auf freie Fläche heben die Selektion auf.
- [ ] Bei 100 Features und 300 Kanten liegt die Zeit zwischen Klick und fertiger
      Hervorhebung unter 50 ms.

## Tests

- Unit für `highlight.ts`: beide Modi, Ketten, Diamantform, Zyklus, kein selektiertes Feature.
- E2E: Klick auf ein Feature dunkelt die übrigen ab, ESC hebt auf, Umschalter ändert den Umfang.

## Nicht Teil dieses Features

Detail-Kartusche mit Aktionen (F-15), Kontextmenü (F-16), Zentrieren aus dem Verzeichnis (F-14).
