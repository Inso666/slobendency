# Bug B · QA — Umschalter-Platzierung „Abdunkeln/Ausblenden"

Geprüft gegen: die wörtliche Nutzeranweisung (features/STATUS.md, Abschnitt „Bekannte Fehler /
Bugfixes"), features/F-24-hervorhebung-sichtbarkeit.md, features/F-11-selektion.md,
design/03-seekarte.html, design/README.md sowie e2e/F-22-responsiv.spec.ts und
e2e/F-24-hervorhebung-sichtbarkeit.spec.ts. Geprüft am laufenden Programm (Produktions-Build,
`vite preview`) bei den Breakpoints 375, 834, 1024, 1025, 1280, 1390, 1391 und 1440 px, jeweils
Tag- und Nachttafel.

## Befund 1 — Kopfband überläuft im Bereich 1025–1377 px

**Beobachtung.** Der Feature-Agent hatte den neuen Wrap-Breakpoint für `.ribbon`
(`@media (max-width: 1024px)`) gewählt, weil das mit dem in F-22 festgelegten Tablet-Bereich
„768 bis 1024 px" übereinstimmt, und in einem Code-Kommentar behauptet, das Kopfband bleibe
oberhalb von 1024 px (ausdrücklich einschließlich der Standard-E2E-Breite 1280 px) einzeilig mit
fester Höhe. Das stimmt nicht: Mit Playwright/Chromium nachgemessen (nach `document.fonts.ready`
und auch während der Fallback-Schrift-Phase vor dem Laden von Fraunces) brauchte die Zeile
(title + acts + scope) bis knapp 1296 px Breite. Zwischen 1025 und 1295 px lief das Kopfband über
die feste 60-px-Zeile hinaus: Die Titel-Unterzeile („BLATT 1 · IMPACT / EFFORT") wickelte auf zwei
Zeilen, der Knopf „Exportieren" fiel auf eine eigene, herausragende Zeile — beides überlappte
sichtbar die Kartenfläche darunter. Betroffen war insbesondere 1280 px, die von vielen
Playwright-Tests genutzte Standardbreite.

**Verletzte Quelle.** design/03-seekarte.html (Anordnung: Kopfband bleibt auf Desktop-Breiten
einzeilig, keine Überlappung mit der Kartenfläche) sowie der eigene Anspruch des Feature-Agenten
in seinem Code-Kommentar, der durch die tatsächliche Rendering-Messung widerlegt wurde.

**Behebung.** `@media (max-width: 1024px)` auf `@media (max-width: 1390px)` angehoben (Commit
`Bug B · QA: Ribbon-Umbruch auf 1390px korrigiert`). Empirisch ermittelte, mit dem neuen `.lbl`
aus Befund 2 gemessene sichere Schwelle liegt bei 1378 px; 1390 px gibt 12 px Marge. Erneut per
Playwright/Chromium geprüft: bei 1000–1390 px bleibt das Kopfband sauber zweizeilig ohne
Überlauf (`scrollHeight - clientHeight = 0` durchgehend), ab 1391 px einzeilig mit fester Höhe,
ebenfalls ohne Überlauf, einschließlich 1440 px. F-22s eigener Tablet-Bereich (768–1024 px,
UI-18) betrifft andere Elemente (Verzeichnis, Zeichenerklärung, deren eigene
768-/1024-px-Media-Queries) und bleibt unverändert; nur der Wrap-Punkt des Kopfbands selbst
wandert. Das Verzeichnis-Panel wurde bei 1200 px und 1391 px zusätzlich geöffnet und live
geprüft — keine Überlappung mit dem (je nach Breite ein- oder zweizeiligen) Kopfband.

## Befund 2 — Umschalter ohne `.lbl` weicht von „gleicher Bauart" ab

**Beobachtung.** features/F-24-hervorhebung-sichtbarkeit.md verlangt für den Umschalter „gleiche
Bauart" wie den bestehenden Umschalter „Hervorhebung" aus F-11. Im Kopfband besteht die Bauart
jedes Kopfband-Reglers (`Hervorhebung`, `Tafel`) aus einem sichtbaren `<span class="lbl">` vor der
Knopfgruppe — das fasst Beschriftung und Umschalter zu einem `.scope-item` zusammen. Der aus dem
Menü „Ansicht" ins Kopfband verschobene Umschalter blieb ohne eigenes `.lbl` (dort war das
unnötig, weil der Menüpunkt bereits im Kontext bekannter Menüeinträge stand). Im Kopfband,
unmittelbar links von „Hervorhebung", fehlt diese Einordnung: Ohne eigenes Label liest sich die
Knopffolge „Abdunkeln Ausblenden Hervorhebung Nur direkte Transitiv" leicht so, als beschriebe das
Label „Hervorhebung" auch die beiden vorangehenden, tatsächlich unabhängigen Knöpfe mit.

**Verletzte Quelle.** features/F-24-hervorhebung-sichtbarkeit.md, Abschnitt „Darstellung"
(„gleiche Bauart" wie der Umschalter „Hervorhebung", dessen tatsächliche Bauart in diesem Kopfband
ein `.lbl` einschließt).

**Behebung.** `<span class="lbl">Sichtbarkeit</span>` ergänzt (Commit `Bug B · QA: .lbl
"Sichtbarkeit" für verschobenen Umschalter ergänzt") — kurz für den bestehenden
`aria-label="Sichtbarkeit nicht beteiligter Elemente"`, nach demselben Muster, wie „Tafel" kurz
für `aria-label="Farbtafel"` ist. Kein bestehender Test prüfte die Abwesenheit eines `.lbl`;
e2e/F-24-hervorhebung-sichtbarkeit.spec.ts greift über `role="group"` + `aria-label` zu und blieb
unverändert grün. Die Ergänzung verbreiterte die Kopfband-Zeile zusätzlich, was in Befund 1
bereits eingerechnet ist (1378 px statt 1296 px als gemessene Schwelle).

## Übrige Prüfpunkte — keine Abweichung

- **Dauerhafte Sichtbarkeit im Kopfband.** Der Umschalter „Sichtbarkeit nicht beteiligter
  Elemente" steht bei allen geprüften Breiten (375, 834, 1024, 1025, 1280, 1390, 1391, 1440 px)
  ohne jede Interaktion sichtbar im Kopfband, unmittelbar links neben „Hervorhebung" — bestätigt
  sowohl live (Screenshots, Tag- und Nachttafel) als auch durch
  e2e/F-24-hervorhebung-sichtbarkeit.spec.ts (`steht im Kopfband unmittelbar links neben dem
  Umschalter „Hervorhebung", nicht mehr hinter dem Menü „Ansicht" erreichbar` — DOM-Reihenfolge
  und Bounding-Box-Vergleich). Das Menü „Ansicht" enthält den Umschalter nicht mehr (geprüft per
  Quellcode-Suche: `highlightVisibility` kommt im Markup nur noch an der neuen Stelle vor).
- **Bauart (nach Behebung von Befund 2).** `role="group"`, Knöpfe mit `aria-pressed`, gebunden an
  `highlightVisibility` — identisch zum Vorbild „Hervorhebung", inklusive `.lbl`. FR-44/FR-47
  (wirkt sofort auf laufende Selektion, ohne sie aufzuheben) unverändert durch den Feature-Agenten
  umgesetzt und durch die bestehenden F-24-E2E-Tests abgedeckt (u. a. „blendet nicht beteiligte
  Elemente beim Umschalten auf Ausblenden vollständig aus, ohne die Selektion aufzuheben").
- **Design-Konformität.** Ausschließlich vorhandene CSS-Klassen (`.sw`, `.lbl`, `.scope-item`,
  Standard-`<button>`) wiederverwendet, keine handgeschriebenen Farben, keine neuen Token. Tag-
  und Nachttafel live geprüft (375/834/1024/1025/1280/1390/1391/1440 px) — Aussehen und Zustände
  (gedrückt/ungedrückt) identisch zu den bestehenden Kopfband-Reglern.
- **Trefferflächen (F-22/UI-16).** Die Knöpfe „Abdunkeln"/„Ausblenden" messen bei 375 px
  79×44 px bzw. 85×44 px (≥ 44×44 px), bei ≥ 834 px 79×30 px bzw. 85×30 px — exakt wie die
  Geschwisterknöpfe „Nur direkte"/„Transitiv" und „Tag"/„Nacht" bei denselben Breiten. Keine
  Abweichung vom bestehenden Muster.
- **e2e/F-22-responsiv.spec.ts.** Läuft weiterhin grün (Teil der 281 bestandenen E2E-Tests, siehe
  unten) und bleibt inhaltlich zutreffend — die 44×44-px-Prüfung gilt unverändert für alle
  Kopfband-Bedienelemente, das neue Element eingeschlossen (s. o.).

## Testlauf nach Behebung

- Unit (Vitest), zweimal in Folge: 33 Testdateien, 569 Tests, beide Male grün.
- E2E (Playwright), zweimal in Folge (jeweils eigener `npm run build` + `preview` laut
  `playwright.config.ts`): 281 Tests, beide Male grün, keine Flakiness beobachtet.
- `npm run build`: erfolgreich, keine Fehler.
- `npm run check`: 399 Dateien, 7 Fehler, 29 Warnungen — identisch zur vom Feature-Agenten
  berichteten Baseline, keine neuen Fehler/Warnungen durch die QA-Behebungen.

## Quellwidersprüche

Keine. Beide Befunde ließen sich eindeutig anhand der genannten Quellen (F-24 „gleiche Bauart";
die tatsächliche, nachgemessene Rendering-Breite) beheben, ohne dass sich Quellen widersprachen.

## Ergebnis

Keine Abweichungen.
