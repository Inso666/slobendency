# Feature-Liste — Feature Impact/Effort Map

Arbeitsschnitt für die Umsetzung von `PRD.md` im visuellen Entwurf `design/03-seekarte.html`.
Jede Datei in diesem Verzeichnis beschreibt **ein Feature, das in einer Agenten-Session
umsetzbar ist**: Ziel, fachliche Regeln, betroffene Dateien, Signaturen, Akzeptanzkriterien
und Tests. Allgemeine Arbeitsregeln (Commits, Formatierung, Testlauf, Werkzeugnutzung) stehen
bewusst **nicht** in den Feature-Dateien; dafür sorgt der Harness.

## Aufbau nach Domain Driven Design

Die Anwendung ist ein **einziger Bounded Context**: *Feature Map*. Ein zweiter Kontext wäre
erfunden — es gibt kein Backend, keine Fremdsysteme, keine zweite Sprachgemeinschaft. Innerhalb
des Kontexts werden die taktischen Bausteine sauber getrennt:

| Rolle (DDD) | Physischer Ort (aus PRD 7.2) | Inhalt |
|---|---|---|
| Aggregat, Entitäten, Value Objects, Invarianten | `src/lib/model/` | `FeatureMap`, `Feature`, `Relation`, `FeatureId`, `Score`, `Quadrant` |
| Domänen-Services | `src/lib/graph/` | Transitive Vorbedingungen, Zyklenerkennung |
| Anti-Corruption Layer | `src/lib/dsl/` | Übersetzung Fremdtext ↔ Domäne, Fehlermeldungen |
| Anwendungsschicht (Kommandos, Zustand) | `src/lib/store/` | Anwendungsfälle, Selektionszustand, Änderungsverteilung |
| Repository-Adapter | `src/lib/store/persistence.ts` | LocalStorage, entkoppelt vom Modell |
| Darstellung | `src/lib/layout/`, `src/lib/components/`, `src/lib/export/` | Skalen, Jitter, Kantenpfade, Svelte-Komponenten, Bildexport |

Die PRD gibt die Ordnerstruktur vor; sie bleibt maßgeblich. Die DDD-Rollen werden auf diese
Struktur abgebildet, nicht daneben gelegt.

**Verbindliche Konventionen für alle Features:**

1. **Die Domäne kennt kein UI und kein Framework.** In `model/`, `graph/` und `dsl/` gibt es
   keine Svelte-Importe, kein `window`, kein `document`, keine Farben (NFR-40).
2. **Das Aggregat ist unveränderlich.** Jede Operation auf `FeatureMap` gibt eine neue Karte
   oder eine Fehlerliste zurück, statt in place zu mutieren. Das macht Invarianten prüfbar und
   passt zur Reaktivität von Svelte.
3. **Invarianten leben im Aggregat, nicht im Formular.** Die UI ruft Aggregatsoperationen auf
   und zeigt deren Fehler an. Kein Regelwerk wird in Komponenten dupliziert.
4. **Beziehungen gehören zur Karte, nicht zum Feature.** `Relation` ist ein Value Object im
   Aggregat `FeatureMap` — nur so sind INT-02 bis INT-06 überhaupt durchsetzbar.
5. **Bezeichner im Code englisch, alle Texte für Nutzer deutsch.** Die Zuordnung steht unten in
   der Sprachtabelle und ist bei jedem Feature einzuhalten.
6. **Keine Domain Events im MVP.** Reaktivität läuft über den Svelte-Store; die Persistenz ist
   dessen Abonnent. Ein Event-Bus wäre Aufwand ohne Nutzen.

## Ubiquitous Language

Die Sprache stammt aus der PRD und aus dem kartografischen Entwurf. Beide Quellen sind
verbindlich: Was in der Oberfläche *Revier* heißt, heißt im Code `Quadrant` — und nirgends
sonst anders.

| Fachbegriff (UI, deutsch) | Code (englisch) | Bedeutung |
|---|---|---|
| Karte | `FeatureMap` | Aggregat-Wurzel. Genau eine aktive Karte (FR-73). |
| Feature | `Feature` | Entität. Identität ist die Kennung. |
| Kennung | `FeatureId` | Value Object. `[A-Za-z0-9_-]+`, max. 64 Zeichen, Groß-/Kleinschreibung signifikant. |
| Anzeigename | `label` | Optional, max. 200 Zeichen. Fehlt er, wird die Kennung angezeigt. |
| Nutzen | `impact` | Nicht-negative Ganzzahl. |
| Aufwand | `effort` | Nicht-negative Ganzzahl. |
| Bewertung | `Score` | Value Object aus Nutzen und Aufwand. |
| Schätzreihe | `FIBONACCI` | 1, 2, 3, 5, 8, 13, 21 — die im Formular angebotenen Werte. |
| Beziehung | `Relation` | Value Object im Aggregat: Quelle, Ziel, Art, optionale Beschriftung. |
| Beziehungsart | `RelationType` | `requires` \| `relates` \| `excludes`. |
| benötigt / Vorbedingung | `requires` | Ziel muss vor Quelle umgesetzt werden. Transitiv. |
| hängt zusammen | `relates` | Inhaltliche Nähe. Nur direkte Nachbarschaft. |
| schließt aus | `excludes` | Nicht gemeinsam umsetzbar. Nur direkte Nachbarschaft. |
| Revier | `Quadrant` | `quickWins` \| `grosseVorhaben` \| `nebenbei` \| `vermeiden`. Abgeleitet, nie gespeichert. |
| Lotung | — | Anzeigeform der Bewertung als `13 · 8` unter dem Feature-Namen. |
| Kurs | `requiresPath` | Kette transitiver Vorbedingungen, in der Fußleiste angezeigt. |
| Verzeichnis | `FeatureList` | Ausklappbares Panel mit allen Features. |
| Kartusche | `cartouche` | Gerahmtes Overlay über der Karte (Detail, Zeichenerklärung, Dialoge). |
| Zeichenerklärung | `legend` | Legende der Signaturen. |
| Tafel | `theme` | Farbtafel `light` (Tag) / `dark` (Nacht). |
| Signatur | — | Zeichenform eines Elements auf der Karte (Linienart, Endmarke, Ring). |
| Hervorhebungssichtbarkeit | `HighlightVisibility` | `'dim' \| 'hide'` — wie nicht beteiligte Elemente bei Selektion dargestellt werden (F-24). |
| Sichtbarer Ausschnitt | `Viewport` | `{ centerEffort, centerImpact, visibleRange }` — der aktuell gezoomte Wertebereich (Datenzoom, F-25). Ersetzt die reine Bildtransformation aus F-12. |
| Schätzmodus | `EstimationMode` | `'fibonacci' \| 'free'` — bestimmt, wie Nutzen/Aufwand im Formular erfasst werden (F-26). App-Einstellung, nicht Teil der Karte. |
| Freier Wertebereich | `EstimationRange` | `{ min, max }`, gemeinsam für Nutzen und Aufwand im Schätzmodus `free` (F-26). |

## Zwei Präzisierungen gegenüber den Quellen

Beim Zusammenlegen von PRD und Entwurf sind zwei Lücken aufgefallen. Sie sind hier
entschieden, damit kein Agent sie erneut auslegen muss:

1. **Revier-Grenze.** FR-22 nennt vier Quadranten, aber keine Schwelle. Verbindlich ist die
   Mitte des dargestellten Wertebereichs (`domainMax / 2`), so wie sie im Entwurf gezeichnet
   ist. Damit ist das Revier vom Zoom unabhängig, aber von der Skalierung abhängig — genau wie
   die gezeichneten Trennlinien. Die Gruppierung im Verzeichnis des Mockups weicht an zwei
   Stellen davon ab (Single Sign-On 5/13, Volltextsuche 8/8); das ist ein Fehler des Mockups,
   nicht die Regel.
2. **Reihenfolge der Beziehungen im Export.** DSL-11 sortiert nur Features. Für die
   Round-Trip-Garantie (DSL-14, AK-04) müssen auch Beziehungen deterministisch sortiert sein:
   nach Quelle, dann nach Art in der Reihenfolge `requires`, `relates`, `excludes`, dann nach
   Ziel — jeweils aufsteigend nach Zeichencode.

## Reihenfolge und Abhängigkeiten

| # | Feature | Schicht | Hängt ab von |
|---|---|---|---|
| [F-01](F-01-projektgeruest.md) | Projektgerüst und Kartentafel | Rahmen | — |
| [F-02](F-02-domaenenmodell.md) | Domänenmodell und Invarianten | Domäne | F-01 |
| [F-03](F-03-kartenstore.md) | Kartenstore und Kommandos | Anwendung | F-02 |
| [F-04](F-04-persistenz.md) | Persistenz im LocalStorage | Infrastruktur | F-03 |
| [F-05](F-05-dsl-parser.md) | DSL-Parser | ACL | F-02 |
| [F-06](F-06-dsl-serializer.md) | DSL-Serializer | ACL | F-02 |
| [F-07](F-07-graph-services.md) | Vorbedingungen und Zyklen | Domäne | F-02 |
| [F-08](F-08-kartengeruest.md) | Kartengerüst: Skalen, Raster, Reviere | Darstellung | F-01, F-02 |
| [F-09](F-09-feature-signaturen.md) | Feature-Signaturen und Jitter | Darstellung | F-08 |
| [F-10](F-10-kanten.md) | Kanten und Signaturenkatalog | Darstellung | F-09 |
| [F-11](F-11-selektion.md) | Selektion, Hervorhebung, Dimming | Darstellung | F-07, F-10 |
| [F-12](F-12-zoom-pan.md) | Zoom und Pan | Darstellung | F-08 |
| [F-13](F-13-feature-formular.md) | Feature-Formular | Bedienung | F-03 |
| [F-14](F-14-verzeichnis.md) | Verzeichnis | Bedienung | F-03, F-11 |
| [F-15](F-15-detail-kartusche.md) | Detail-Kartusche | Bedienung | F-11 |
| [F-16](F-16-verbindungsvorgang.md) | Kontextmenü und Verbindungsvorgang | Bedienung | F-11, F-03 |
| [F-17](F-17-beziehungen-pflegen.md) | Beziehungen bearbeiten und löschen | Bedienung | F-15, F-14 |
| [F-18](F-18-import.md) | Import-Dialog | Austausch | F-05, F-03 |
| [F-19](F-19-export-dsl.md) | Export-Dialog | Austausch | F-06 |
| [F-20](F-20-export-svg.md) | SVG-Export | Austausch | F-10 |
| [F-21](F-21-export-png.md) | PNG-Export | Austausch | F-20 |
| [F-22](F-22-responsiv.md) | Responsives Verhalten und Touch | Bedienung | F-13 bis F-16 |
| [F-23](F-23-statuszeile.md) | Fußleiste, Hinweise, Zurücksetzen | Bedienung | F-04, F-07 |
| [F-24](F-24-hervorhebung-sichtbarkeit.md) | Hervorhebung: Abdunkeln oder Ausblenden | Darstellung | F-11 |
| [F-25](F-25-datenzoom.md) | Datenzoom (ersetzt Zoom-Mechanik aus F-12) | Darstellung | F-08, F-12 |
| [F-26](F-26-schaetzmodus.md) | Schätzmodus: Fibonacci oder freier Wertebereich | Anwendung/Bedienung/Darstellung | F-08, F-13, F-25 |

Nach F-04 ist die Karte haltbar, nach F-11 ist der Kernnutzen erreicht, nach F-21 ist sie
teilbar, nach F-23 ist der MVP vollständig. F-24 bis F-26 (PRD 1.1) erweitern den MVP um
Ausblenden bei Selektion, Datenzoom und einen freien Schätzmodus.

**Gemeinsame Dateien F-25/F-26:** Beide Features ändern `src/lib/layout/scales.ts`
(`ticksOf`/`domainMaxOf`) und laufen deshalb **nacheinander**, nicht parallel — analog zur
Regel für F-05/F-06.

## Fertigstellungskriterium je Feature

Ein Feature gilt als umgesetzt, wenn seine Akzeptanzkriterien erfüllt sind, seine Tests
grün laufen, die Tests der vorangegangenen Features weiterhin grün laufen und keine Regel
aus einem anderen Feature dupliziert wurde.
