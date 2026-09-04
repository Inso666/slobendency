# F-21 · PNG-Export

**Schicht:** Austausch · **Hängt ab von:** F-20 · **Umfang:** M

## Ziel

Dieselbe vollständige Karte als Rasterbild, in wählbarer Auflösung, für Folien, Tickets und
Confluence.

## DDD-Einordnung

Infrastruktur. Setzt vollständig auf dem Ergebnis von F-20 auf; es gibt keine zweite
Zeichenlogik und keinen zweiten Neutralisierungspfad.

## Umfang

`src/lib/export/png.ts`

```ts
export type PngScale = 1 | 2 | 4;
export interface PngOptions extends ExportOptions { scale: PngScale; transparent?: boolean; }
export function downloadPng(source: SVGSVGElement, options: PngOptions): Promise<void>;
```

Ablauf nach PRD 7.3:

1. Exportfähiges SVG über `buildExportSvg` erzeugen.
2. Als Daten-URL in ein `Image` laden und dessen `decode()` abwarten.
3. Canvas mit `breite × faktor` und `höhe × faktor` anlegen, `ctx.scale(faktor, faktor)`.
4. Ist der Hintergrund nicht durchsichtig gewünscht, zuerst die Fläche füllen — standardmäßig
   weiß (FR-69), bei gewählter Nachttafel in deren `--paper`.
5. Zeichnen, `toBlob('image/png')`, Download mit Dateiname
   `featuremap-JJJJ-MM-TT@2x.png` (Faktor im Namen).

Das Menü *Exportieren → Als Bild* bietet den Faktor als drei Knöpfe (1×, 2×, 4×), einen
Schalter *Hintergrund: weiß / transparent* und den Tafelumschalter aus F-20. Während der
Erzeugung ist der Knopf deaktiviert und zeigt *Wird erzeugt …*.

## Fachregeln

| ID | Regel |
|---|---|
| FR-64 | PNG mit wählbarem Faktor 1×, 2×, 4× |
| FR-65 | Immer die vollständige Karte |
| FR-66 | Vollständiger Inhalt wie beim SVG |
| FR-67 | Neutraler Zustand |
| FR-69 | Weißer Hintergrund als Standard, transparent als Option |
| NFR-06 | PNG bei 4× in unter 3 Sekunden |

## Akzeptanzkriterien

- [ ] Ein PNG bei 4× hat exakt die vierfache Pixelbreite gegenüber 1× (AK-11).
- [ ] Bei gezoomter Karte enthält das Bild alle Features (AK-12).
- [ ] Standardmäßig ist der Hintergrund weiß; mit gesetzter Option ist er durchsichtig.
- [ ] Kein Text wird abgeschnitten; der Rand um das umschließende Rechteck ist sichtbar.
- [ ] Der 4×-Export einer Karte mit 100 Features dauert unter 3 Sekunden.
- [ ] Scheitert die Erzeugung, erscheint ein Hinweis, und die Anwendung bleibt bedienbar.

## Tests

- Unit: Größenrechnung je Faktor, Hintergrundfüllung, Dateiname.
- E2E: Export bei 1× und 4× auslösen, Abmessungen der erzeugten Dateien vergleichen (AK-11).

## Nicht Teil dieses Features

SVG-Aufbereitung (F-20), Export der DSL (F-19).
