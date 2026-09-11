# F-24 · Hervorhebung: Abdunkeln oder Ausblenden

**Schicht:** Darstellung · **Hängt ab von:** F-11 · **Umfang:** S

## Ziel

Wer beim Priorisieren nur sehen will, was mit dem gewählten Feature zusammenhängt, kann die
nicht beteiligten Elemente vollständig ausblenden statt sie nur abgedunkelt zu sehen —
umschaltbar, ohne den bestehenden Umschalter aus F-11 (nur direkte/transitiv) zu ersetzen.

## DDD-Einordnung

Reine Darstellungsentscheidung auf der bereits in F-11 berechneten `HighlightSet`. Die Domäne
(welche Elemente beteiligt sind) ändert sich nicht; hinzu kommt nur eine zweite Art, nicht
beteiligte Elemente darzustellen.

## Umfang

Erweiterung des Selektionszustands aus F-03/F-11 (`src/lib/store/selection.ts`):

```ts
export type HighlightVisibility = 'dim' | 'hide';
export const highlightVisibility: Writable<HighlightVisibility>;   // Default 'dim'
```

`FeatureNodes.svelte` und `Edges.svelte` (aus F-11) prüfen zusätzlich zu `highlightMode` den
Zustand `highlightVisibility`: bei `'hide'` erhalten nicht beteiligte Elemente `hidden` statt
der Klasse `.dim`, bei `'dim'` bleibt das Verhalten aus F-11 unverändert.

## Darstellung

| Zustand | Umsetzung |
|---|---|
| `highlightVisibility = 'dim'` (Standard) | Unverändert wie in F-11: Klasse `.dim`, Deckkraft 0,24 Tag- / 0,3 Nachttafel |
| `highlightVisibility = 'hide'` | Nicht beteiligte Features und Kanten werden nicht gerendert: kein Platzhalter, keine Trefferfläche, nicht im Tab-Fokus |
| Umschalter | Zweiter, unabhängiger Umschalter *Abdunkeln/Ausblenden* neben dem Umschalter *nur direkte/transitiv* aus F-11, gleiche Bauart |

Erreichbar über das Menü **Ansicht ▾** (PRD 6.1).

## Interaktion

Wechsel des Umschalters wirkt sofort auf die laufende Selektion, ohne sie aufzuheben — wie beim
bestehenden Umschalter aus F-11 (FR-44).

## Fachregeln

| ID | Regel |
|---|---|
| FR-43 (geändert) | Nicht beteiligte Elemente werden abgedunkelt oder vollständig ausgeblendet, je nach FR-47 |
| FR-47 (neu) | Umschalter zwischen Abdunkeln und Ausblenden, zusätzlich zum Umschalter aus FR-44 |
| NFR-03 | Selektion inklusive Auflösung und Hervorhebung unter 50 ms, unverändert |

## Akzeptanzkriterien

- [ ] Standardzustand ist Abdunkeln; alle bestehenden F-11-Akzeptanzkriterien (AK-06, AK-07)
      bleiben unverändert erfüllt.
- [ ] Umschalten auf Ausblenden entfernt nicht beteiligte Features und Kanten vollständig aus
      der Darstellung; die Selektion bleibt erhalten (AK-17).
- [ ] Im Modus *nur direkte* + Ausblenden verschwindet ein nur transitiv verbundenes Feature
      vollständig, nicht nur abgedunkelt.
- [ ] Zurückschalten auf Abdunkeln stellt die zuvor ausgeblendeten Elemente abgedunkelt wieder
      her.
- [ ] Ausgeblendete Elemente sind nicht klickbar und nicht per Tab erreichbar.
- [ ] Bei 100 Features/300 Kanten bleibt der Wechsel unter 50 ms (NFR-03).

## Tests

- Unit für `selection.ts`: `highlightVisibility` kombiniert mit beiden `highlightMode`-Werten
  aus F-11 (vier Kombinationen).
- E2E: Umschalten auf Ausblenden versteckt ein nicht beteiligtes Feature; zusätzliches
  Umschalten auf *nur direkte* versteckt auch ein zuvor nur transitiv hervorgehobenes Feature;
  Zurückschalten auf Abdunkeln stellt beide abgedunkelt wieder her; Tab-Reihenfolge überspringt
  ausgeblendete Elemente.

## Nicht Teil dieses Features

Änderung der Hervorhebungslogik selbst (welche Elemente beteiligt sind) — das bleibt F-07/F-11.
Datenzoom (F-25). Schätzmodus (F-26).
