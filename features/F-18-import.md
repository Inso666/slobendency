# F-18 · Import-Dialog

**Schicht:** Austausch · **Hängt ab von:** F-05, F-03 · **Umfang:** M

## Ziel

Ein DSL-Dokument aus Chat, E-Mail oder Datei wird zur Karte — mit Vorschau vor der Übernahme
und einer klaren Rückfrage, wenn dabei ein bestehender Bestand ersetzt würde.

## DDD-Einordnung

Bedienung über dem Anti-Corruption Layer. Der Dialog interpretiert den Text nicht selbst; er
ruft `parse` auf und zeigt entweder die Vorschau oder die Fehlerliste. Übernommen wird die
geprüfte Karte über `loadMap`.

## Umfang

`src/lib/components/ImportDialog/ImportDialog.svelte`

Aufbau:

- Großes Textfeld in Azeret Mono zum Einfügen, Platzhalter mit dem Kopfzeilen-Beispiel
  `featuremap v1`.
- Knopf *Datei wählen* für `.fmap`- und `.txt`-Dateien; der Inhalt landet im selben Textfeld,
  damit vor dem Übernehmen noch korrigiert werden kann.
- Bereich *Vorschau*: bei fehlerfreiem Text die Zahlen `n Features · m Beziehungen` sowie die
  ersten acht Features mit Lotung; bei Fehlern die vollständige Fehlerliste.
- Fußzeile mit *Übernehmen* (nur aktiv, wenn fehlerfrei) und *Abbrechen*.

Fehlerliste je Eintrag: Zeilennummer in Azeret Mono, darunter die Originalzeile in `--ink-soft`
und die Meldung. Die Zeilennummer ist anklickbar und springt im Textfeld an die Stelle.

## Verhalten

| Situation | Verhalten |
|---|---|
| Text fehlerfrei, Karte leer | *Übernehmen* ersetzt den Bestand direkt |
| Text fehlerfrei, Karte nicht leer | Rückfrage: *Bestehende Karte ersetzen?* mit *Ersetzen* und *Abbrechen*. Zusammenführen ist nicht Teil des MVP (FR-62) |
| Text fehlerhaft | *Übernehmen* bleibt deaktiviert, der Bestand bleibt unberührt (DSL-02) |
| Übernahme erfolgt | Dialog schließt, Selektion und Verbindungsvorgang werden aufgehoben, die Karte zeigt den neuen Bestand, die Persistenz schreibt ihn |

Nach der Übernahme wird der Ausschnitt zurückgesetzt, damit die neue Karte vollständig sichtbar
ist.

## Fachregeln

| ID | Regel |
|---|---|
| FR-61 | Textfeld und Datei-Upload, Vorschau der Parse-Ergebnisse vor der Übernahme |
| FR-62 | Bei vorhandenem Bestand Rückfrage: Ersetzen oder Abbrechen |
| DSL-01 | Fehler zeilengenau mit Originalzeile und Ursache |
| DSL-02 | Bei Fehlern kein Teilimport; Bestand unverändert |
| DSL-03 | Alle Fehler auf einmal |
| NFR-30 | Ein Parser-Fehler bringt die Anwendung nicht in einen inkonsistenten Zustand |
| NFR-21 | Der eingefügte Text wird nirgends als Markup interpretiert |

## Akzeptanzkriterien

- [ ] Ein gültiges Dokument wird übernommen; Karte, Verzeichnis und Fußleiste zeigen den neuen
      Bestand ohne Neuladen.
- [ ] Export in einem Tab, Import in einem frischen Tab erzeugt eine identische Karte (AK-03).
- [ ] Ein Dokument mit einer Beziehung auf ein unbekanntes Feature zeigt eine zeilengenaue
      Fehlermeldung, und der bestehende Bestand bleibt unverändert (AK-14).
- [ ] Bei nicht leerer Karte erscheint die Rückfrage; *Abbrechen* lässt alles unverändert.
- [ ] Eine hochgeladene `.fmap`-Datei erscheint im Textfeld und lässt sich vor der Übernahme
      bearbeiten.
- [ ] Ein Dokument mit drei Fehlern zeigt drei Einträge auf einmal.
- [ ] Nach der Übernahme ist keine Selektion aktiv.

## Tests

- Unit: Zustände des Dialogs (leer, fehlerhaft, gültig, Rückfrage offen).
- E2E: Import mit Fehler zeigt Liste und lässt den Bestand stehen; Import ohne Fehler ersetzt
  ihn nach Bestätigung.

## Nicht Teil dieses Features

Parser selbst (F-05), Export (F-19), Zusammenführen von Karten (laut PRD 11 zurückgestellt).
