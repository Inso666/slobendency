# QA · Bug A — F-25 Datenzoom: Zoom-Clipping

Geprüft auf `fix/f25-zoom-clipping` (Tests (rot) `a6e706b` „Bug A · Tests (rot):
Zoom-Clipping", Umsetzung `7f69739` „Bug A · Umsetzung: Zoom-Clipping behoben (isValueVisible,
FeatureNodes/Edges)"), gegen den Bug-Report
(https://github.com/Inso666/slobendency/issues/3), `features/F-25-datenzoom.md`, `PRD.md`
(FR-25, FR-65, FR-47, PRD 7.3) und `design/03-seekarte.html`, in dieser Reihenfolge
(CLAUDE.md, Abschnitt „QA-Abgleich"). Kein eigenes `features/F-XX.md`, da Bugfix.

## Vorab: zwei vom Orchestrator freigegebene Testkorrekturen angewandt

Commit `7a2e96d` „Bug A · QA: zwei vom Orchestrator freigegebene Testkorrekturen an
demaskierten Testannahmen" — freigegeben in `features/STATUS.md` (main), Abschnitt
„Entscheidungen des Orchestrators", Eintrag „Zwei durch Bug A demaskierte Testannahmen
(12.09.)":

1. `e2e/F-25-datenzoom.spec.ts`, Test „behält Selektion und Hervorhebung bei maximaler
   Vergrößerung": live gegen einen frischen, isolierten Build nachgemessen (dieselben Schritte
   wie im Test: `DREI_FEATURES` seeden, Klick auf „a", 60 Radschritte hinein auf dessen
   Bildschirmpunkt). Ergebnis: bei `domainMax = 22` klemmt `zoomAt()` bereits nach 4
   Radschritten auf `visibleRange = domainMax / 4 = 5.5`; `centerEffort`/`centerImpact`
   konvergieren dabei auf `5` (nicht auf `3`, wie die ursprüngliche Testannahme unterstellte —
   die wiederholte Neuauswertung von `pointerEffort`/`pointerImpact` bei jedem Radschritt am
   selben Bildschirmpunkt lässt den Fensterschwerpunkt vom Zeiger wegdriften). Das reale
   Endfenster liegt bei effort ≈ [2.235, 7.741] und impact ≈ [2.252, 7.761] (per
   `page.evaluate`-Messung über `map-frame`/Teilstrich-Positionen gegen die bekannten
   `PLOT`-Konstanten aufgelöst). Der bisherige Seed-Wert von „c" (effort=2) lag knapp
   unterhalb der unteren Fensterkante — „c" wurde durch den Bug-A-Fix beim Zoomen tatsächlich
   ausgeblendet statt (wie angenommen) sichtbar zu bleiben, wodurch der Test unbeabsichtigt von
   Bug A abhängig wurde. Seed-Wert von „c" auf effort=4 angehoben (impact unverändert bei 4,
   `domainMax` bleibt bei 22, da 4 < 21) — live gegengeprüft: „c" trägt danach kein
   `hidden`-Attribut. Prüfabsicht unverändert.
2. `e2e/F-26-schaetzmodus.spec.ts`, Test „Kernablauf … übersteht Neuladen": vor der
   Sichtbarkeitsprüfung des mit `impact=42` angelegten Features einen Klick auf „Ganze Karte
   zeigen" eingefügt (Menü „Ansicht"), konsistent mit der in `src/routes/+page.svelte`
   dokumentierten, bewussten Entscheidung, den Ausschnitt bei `domainMax`-Wachstum nicht
   automatisch zurückzusetzen — vor Bug A blieb ein außerhalb des Fensters neu angelegtes
   Feature einfach über den Rand hinausgeschoben sichtbar, seit Bug A wird es korrekt
   ausgeblendet. Prüfabsicht unverändert.

Beide Korrekturen mechanisch/live geprüft, dann die volle Suite erneut ausgeführt (siehe
unten).

## Testzahlen nach den Korrekturen

- Unit (Vitest): 575/575 grün.
- E2E (Playwright): 284/284 grün — inklusive beider korrigierter Tests, aller
  F-20/F-21-Export-Tests (FR-65) und aller F-24-Tests.
- `npm run build`: erfolgreich.
- `npm run check`: 7 Fehler / 29 Warnungen — unverändert gegenüber der vom Feature-Agenten
  berichteten Baseline (dieselben, aus F-24 bereits bekannten `hidden`-Typfehler auf
  SVG-Elementen sowie die vorbestehenden a11y-/Reaktivitäts-Warnungen; keine neuen Fehler durch
  Bug A).

## Abgleich gegen den Bug-Report

Live nachgestellt (Playwright gegen einen frischen, isolierten Preview-Build sowie manuell im
Browser über den Vite-Dev-Server): ein Feature außerhalb des sichtbaren Fensters wird beim
Hineinzoomen jetzt vollständig ausgeblendet (`hidden`-Attribut, `display: none`, keine
Trefferfläche) statt über den Rand der Plotfläche hinausgeschoben zu werden — Signaturpunkt,
Beschriftung, Lotung und Trefferkreis gleichermaßen. Sobald das Feature durch Herauszoomen
oder „Ganze Karte zeigen" wieder ins Fenster fällt, erscheint es unverändert wieder (live
geprüft: `resetViewport()` macht das `hidden`-Attribut sofort rückgängig). Kanten und die an
betroffenen Zielen hängenden Vorbedingungsringe/Durchstreichungen verhalten sich identisch,
sobald mindestens ein Endpunkt außerhalb des Fensters liegt. Der Grenzfall „Feature genau auf
der Fensterkante bleibt sichtbar" ist durch `isValueVisible()` (Intervallgrenzen inklusive) und
die zugehörigen Unit-Tests abgedeckt. Erwartetes Verhalten aus dem Bug-Report erfüllt.

## Abgleich gegen features/F-25-datenzoom.md und PRD.md

- **FR-65** („Beide Bildexporte umfassen immer die vollständige Map … unabhängig vom
  aktuellen Zoom/Pan-Zustand"): live nachgeprüft. Nach Zoom auf einen Ausschnitt, der ein
  Feature ausblendet (`hidden`-Attribut gesetzt), liefert `buildExportSvg()` dennoch ein SVG
  mit allen Features inklusive des ausgeblendeten, ohne dessen `hidden`-Attribut — bestätigt
  über direkten Aufruf im laufenden Programm (`data-testid="feature-node-b"` vorhanden, kein
  `[hidden]`-Vorfahre, Kante ebenfalls enthalten) und über die bereits bestehenden, weiterhin
  grünen AK-12-Tests in `e2e/F-20-export-svg.spec.ts` und `e2e/F-21-export-png.spec.ts`.
  Ursache: `buildExportSvg()` entfernt jedes `[hidden]`-Attribut vom geklonten SVG, bevor die
  Bounding Box gemessen wird (Schritt vor Schritt 3, siehe Code-Kommentar dort, der diesen
  Mechanismus bereits ausdrücklich mit Bezug auf FR-65 und den wiederverwendeten
  `hidden`-Mechanismus aus F-24 begründet) — Bug A führt hier keine zweite, abweichende Prüfung
  ein, sondern läuft durch denselben, bereits bestehenden Pfad. (Nebenbefund ohne
  Handlungsbedarf: Mit der internen, in der aktuellen Oberfläche an keiner Stelle gesetzten
  Option `keepSelection: true` bliebe auch ein zoom-ausgeblendetes Feature ausgeblendet — ein
  Widerspruch zu FR-65 in der Theorie, aber über keinen Bedienweg der Anwendung erreichbar, seit
  F-24 vorbestehend und nicht durch Bug A verursacht; hier nicht als Befund behandelt, dem
  Orchestrator informativ mitgeteilt.)
- **Leitplanke 3 / „nicht zweimal umgesetzt"**: `isValueVisible()`/`isPositionVisible()`
  stehen ausschließlich in `src/lib/layout/scales.ts`. `FeatureNodes.svelte` und
  `Edges.svelte` leiten je eine `visibility`-Map einmal aus den bereits vorhandenen
  `placements` ab (`isPositionVisible(anchorX, anchorY)`) und lesen sie an jeder Stelle
  (Trefferflächen, Signaturen, Kanten, Kantenbeschriftungen, Ringe, Durchstreichungen) erneut
  aus derselben Map — keine zweite Herleitung, kein `clip-path`, keine redundante
  Grenzwertprüfung. `MapCanvas.svelte` enthält keine eigene Sichtbarkeits-/Clipping-Logik.
- `src/lib/layout/scales.ts` bleibt frei von Framework-/DOM-/Farbbezügen (Leitplanke 1) —
  `isValueVisible`/`isPositionVisible` sind reine Zahlenfunktionen.
- FR-25 (Datenzoom-Verhalten selbst) unverändert von F-25 übernommen, durch Bug A nicht
  berührt — weiterhin durch die vollständige, grüne F-25-Testsuite abgedeckt.

## Abgleich gegen design/03-seekarte.html

Live geprüft (Vite-Dev-Server, Tag- und Nachttafel, seeded Karte mit einem durch Zoom
ausgeblendeten Feature samt Kante): kein Platzhalter, keine Lücke, kein optisches Artefakt an
der Stelle des ausgeblendeten Features oder der ausgeblendeten Kante — Raster, Reviere, Achsen
und die verbleibenden Signaturen sehen unverändert aus wie im Entwurf. Beide Farbtafeln
funktionieren unverändert. Zusammenspiel mit F-24 live geprüft: Selektion eines Features im
Modus „Abdunkeln" lässt ein zoom-ausgeblendetes Feature ausgeblendet (nicht nur abgedunkelt);
Umschalten auf „Ausblenden" und zurück auf „Abdunkeln" hebt das zoom-bedingte Ausblenden zu
keinem Zeitpunkt auf — beide Ausblendlogiken verknüpfen sich korrekt über eine reine
Oder-Verknüpfung (`(isDimmed && highlightVisibility === 'hide') || isOutOfWindow(...)`), ohne
sich gegenseitig aufzuheben.

## Keine Abweichungen
