# F-12 · Zoom und Pan

**Schicht:** Darstellung · **Hängt ab von:** F-08 · **Umfang:** M

## Ziel

Die Karte lässt sich vergrößern und verschieben, ohne dass Beschriftungen unlesbar klein oder
Trefferflächen unbrauchbar werden — und ohne dass der Bildexport davon berührt wird.

## DDD-Einordnung

Reiner Darstellungszustand. Der Ausschnitt gehört nicht zum Aggregat und wird nicht
persistiert; nach einem Neuladen zeigt die Karte wieder den vollständigen Ausschnitt.

## Umfang

`src/lib/store/viewport.ts`

```ts
export interface Viewport { x: number; y: number; scale: number; }   // scale 1 = Vollansicht
export const viewport: Writable<Viewport>;
export function resetViewport(): void;
export function centerOn(x: number, y: number): void;   // für F-14
```

Umgesetzt wird der Ausschnitt über eine `transform`-Gruppe innerhalb des SVG, nicht über eine
veränderte `viewBox` — so bleibt die ursprüngliche `viewBox` für den Export erhalten und die
Skalenrechnung aus F-08 unverändert gültig.

## Verhalten

| Aktion | Desktop | Mobil |
|---|---|---|
| Zoom | Mausrad, Zoom auf den Zeiger zentriert | Pinch, Zoom auf die Mitte der Geste |
| Pan | Ziehen auf freier Fläche | Ein-Finger-Drag |
| Zurücksetzen | Knopf *Ansicht → Ganze Karte zeigen* | derselbe Knopf |

Grenzen: Maßstab zwischen 0,5 und 4. Der Ausschnitt wird so begrenzt, dass immer ein Teil der
Plotfläche sichtbar bleibt. Ein Ziehen, das auf einem Feature beginnt, verschiebt die Karte
nicht — dort gilt der Klick der Selektion.

Beschriftungen und Punktradien skalieren mit; ihre Lesbarkeit ist bei Maßstab 0,5 durch eine
Mindestschriftgröße von 9 px zu sichern, indem Text- und Punktgrößen gegen den Maßstab
gerechnet werden.

## Fachregeln

| ID | Regel |
|---|---|
| FR-25 | Zoom und Pan über Mausrad, Pinch und Ziehen |
| FR-65 | Der Bildexport umfasst immer die vollständige Karte, unabhängig vom Ausschnitt |
| NFR-07 | 60 fps auf Desktop, mindestens 30 fps mobil |
| UI-14 | Zoom und Pan per Pinch- und Drag-Geste |

## Akzeptanzkriterien

- [ ] Mausrad über der Karte vergrößert um den Zeiger herum; der Punkt unter dem Zeiger bleibt
      an Ort und Stelle.
- [ ] Ziehen auf freier Fläche verschiebt die Karte; Ziehen auf einem Feature nicht.
- [ ] Der Maßstab lässt sich nicht unter 0,5 und nicht über 4 treiben.
- [ ] *Ganze Karte zeigen* stellt Maßstab 1 und Ursprung wieder her.
- [ ] Bei Maßstab 4 bleibt die Selektion erhalten und die Hervorhebung korrekt.
- [ ] Nach einem Neuladen ist wieder die Vollansicht aktiv.
- [ ] Zoomen und Verschieben laufen bei 100 Features flüssig.

## Tests

- Unit für `viewport.ts`: Zoom um einen Punkt, Grenzen, Zurücksetzen, Zentrieren.
- E2E: Wheel-Ereignis verändert die Transformation, Drag verschiebt, Reset stellt her.

## Nicht Teil dieses Features

Bildexport (F-20, F-21), Zentrieren beim Klick im Verzeichnis (F-14 nutzt `centerOn`).
