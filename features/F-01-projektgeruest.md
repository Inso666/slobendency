# F-01 · Projektgerüst und Kartentafel

**Schicht:** Rahmen · **Hängt ab von:** — · **Umfang:** M

## Ziel

Ein lauffähiges SvelteKit-Projekt, das als reine Client-Anwendung baut, und ein Stilfundament,
das die Farbtafeln, Schriften und Grundbausteine des Entwurfs `design/03-seekarte.html` als
wiederverwendbare Token bereitstellt. Danach kann jedes weitere Feature Oberfläche bauen, ohne
Farben oder Schriftgrößen neu zu erfinden.

## DDD-Einordnung

Kein fachlicher Inhalt. Dieses Feature stellt nur die Hülle her, in der die Domäne später
frameworkfrei liegen kann. Wichtig ist allein die Ordnerstruktur nach PRD 7.2, damit spätere
Features ihre Bausteine am vorgesehenen Ort ablegen.

## Umfang

Anlegen:

- SvelteKit-Projekt mit TypeScript im Strict-Modus, Vite als Build, Vitest für Unit-Tests,
  Playwright für E2E.
- `svelte.config.js` mit `@sveltejs/adapter-static`.
- `src/routes/+layout.ts` mit `export const ssr = false;` und `export const prerender = true;`
  (PRD 7.1).
- Leere, aber vorhandene Ordner nach PRD 7.2: `src/lib/model`, `dsl`, `graph`, `layout`,
  `export`, `store`, `components`.
- `src/app.css` mit dem vollständigen Token-Satz und den Grundelementen (siehe unten).
- `src/routes/+page.svelte` mit dem dreiteiligen Grundgerüst: Kopfband, Kartenfläche,
  Fußleiste. Inhalte sind Platzhalter, das Raster ist final.
- `src/lib/store/theme.ts`: Tafelumschaltung.

## Farbtafeln und Token

Die beiden Token-Blöcke aus `design/03-seekarte.html` (`:root` und `:root[data-theme="dark"]`)
werden unverändert nach `src/app.css` übernommen — dieselben Namen, dieselben Werte. Sie sind
ab hier die einzige Farbquelle der Anwendung; ein Hexwert außerhalb von `app.css` gilt als
Fehler.

Ebenfalls zu übernehmen:

- Schrifteinbindung Fraunces, Karla, Azeret Mono über die Google-Fonts-Verknüpfung aus dem
  Entwurf, jeweils mit realistischem Fallback-Stack (`serif`, `system-ui`, `ui-monospace`).
- Die Rollen: Fraunces für Titel, Reviernamen und Kennzahlen; Karla für die Oberfläche;
  Azeret Mono für Kennungen, Zahlenpaare und Lotungen.
- Die Grundklassen `.ribbon`, `.foot`, `.cartouche`, `.btn`, `.btn.pri`, `.sw` samt
  Doppellinie oben und unten sowie der Fokusring `:focus-visible` in `--magenta`.

## Fachregeln

| Regel | Quelle |
|---|---|
| Die App läuft vollständig im Browser, ohne Serveraufruf zur Laufzeit. | NFR-20 |
| Content-Security-Policy ohne `unsafe-inline` für Skripte. | NFR-24 |
| Keine experimentellen Browser-APIs. | NFR-12 |
| Standardtafel ist Tag, unabhängig von der Systemeinstellung. | Entwurf 3 |

## Tafelumschaltung

`theme.ts` hält einen Svelte-Store `theme: Writable<'light' | 'dark'>` mit Startwert `light`.
Eine Änderung setzt `document.documentElement.dataset.theme`. Die Wahl wird unter dem Schlüssel
`featuremap.theme` im LocalStorage gemerkt und beim Start gelesen; ist der Wert unbekannt oder
LocalStorage nicht verfügbar, bleibt es bei Tag. Bedient wird der Store vom Schalter *Tafel:
Tag / Nacht* im Kopfband mit `aria-pressed` je Knopf.

## Akzeptanzkriterien

- [ ] `npm run build` erzeugt statische Dateien, die sich ohne Server über `file://` oder von
      beliebigem Static Hosting öffnen lassen.
- [ ] Die Startseite zeigt Kopfband, leere Kartenfläche und Fußleiste in der Aufteilung des
      Entwurfs; die Seite scrollt bei keiner Fenstergröße horizontal.
- [ ] Der Schalter *Tafel* wechselt zwischen Tag und Nacht; alle sichtbaren Flächen wechseln
      mit, weil sie ausschließlich Token verwenden.
- [ ] Nach einem Neuladen ist die zuletzt gewählte Tafel wieder aktiv.
- [ ] Tastaturfokus ist auf jedem Bedienelement sichtbar.
- [ ] `npm run test` und `npm run test:e2e` laufen mit je mindestens einem Beispieltest durch.

## Tests

- Unit: `theme.ts` setzt das Attribut, liest einen gespeicherten Wert, fällt bei unbekanntem
  oder fehlendem Wert auf `light` zurück.
- E2E: Startseite lädt, Tafelwechsel ändert das Attribut am Wurzelelement.

## Nicht Teil dieses Features

Kartendarstellung, Datenmodell, Persistenz der Karte. Nur die Tafelwahl wird hier gespeichert.
