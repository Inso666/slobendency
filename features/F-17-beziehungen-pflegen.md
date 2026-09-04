# F-17 · Beziehungen bearbeiten und löschen

**Schicht:** Bedienung · **Hängt ab von:** F-15, F-14 · **Umfang:** S

## Ziel

Eine bestehende Beziehung lässt sich in Art und Beschriftung ändern oder entfernen — von dort
aus, wo sie sichtbar ist: aus der Detail-Kartusche und von der Kante auf der Karte.

## DDD-Einordnung

Bedienung. `Relation` ist ein Value Object ohne eigene Identität; eine Änderung ist fachlich ein
Ersetzen. Die Anwendungsschicht bildet das in `editRelation` ab, das die alte Beziehung
entfernt und die neue prüft und einsetzt — schlägt die Prüfung fehl, bleibt die alte bestehen.

## Umfang

- Erweiterung von `DetailCartouche.svelte`: je Beziehungszeile die Aktionen *Ändern* und
  *Entfernen*, sichtbar bei Hover und bei Tastaturfokus.
- Wiederverwendung von `RelationDialog.svelte` aus F-16 im Modus *Ändern*, vorbefüllt mit Art
  und Beschriftung.
- Kontextmenü auf einer Kante mit denselben zwei Einträgen.

## Verhalten

| Aktion | Verhalten |
|---|---|
| *Ändern* | Dialog mit vorbelegter Art und Beschriftung; Quelle und Ziel sind fest und werden nur angezeigt |
| Art auf ein bereits vorhandenes Tripel geändert | Ablehnung nach INT-04, Dialog bleibt offen, alte Beziehung unverändert |
| *Entfernen* | Entfernt ohne Rückfrage — eine einzelne Kante ist schnell wieder angelegt, und die Karte zeigt die Wirkung sofort |
| Änderung auf `requires`, die einen Zyklus schließt | Wird übernommen, Warnung erscheint (INT-05) |

Kanten sind mit der Maus schwer zu treffen; sie erhalten deshalb eine unsichtbare Trefferfläche
von 12 Einheiten Breite entlang der Linie. Auf Touchgeräten öffnet Long-Press auf der Kante
dasselbe Menü.

## Fachregeln

| ID | Regel |
|---|---|
| FR-16 | Beziehungen lassen sich löschen und in Art und Beschriftung bearbeiten |
| INT-03 | Quelle und Ziel bleiben unverändert; eine Selbstreferenz kann so nicht entstehen |
| INT-04 | Kein doppeltes Tripel |
| INT-05 | Zyklen werden zugelassen und gewarnt |
| NFR-23 | Kantenbeschriftung maximal 120 Zeichen |

## Akzeptanzkriterien

- [ ] Eine `relates`-Beziehung lässt sich auf `requires` ändern; die Kante wechselt sofort
      Linienform und Endmarke, und das Ziel erhält den Vorbedingungsring.
- [ ] Eine Änderung, die ein vorhandenes Tripel erzeugen würde, wird abgelehnt; die
      ursprüngliche Beziehung bleibt unverändert.
- [ ] Das Entfernen einer Beziehung nimmt sie aus Karte, Detail-Kartusche und Export.
- [ ] Eine geänderte Beschriftung erscheint bei Selektion an der Kante.
- [ ] Klick auf eine Kante innerhalb der Trefferfläche öffnet ihr Menü.

## Tests

- Unit: `editRelation` mit gültiger und ungültiger Änderung, Unveränderlichkeit bei Fehlschlag.
- E2E: Art ändern über die Kartusche, Beziehung über das Kantenmenü entfernen.

## Nicht Teil dieses Features

Anlegen neuer Beziehungen (F-16), Warnhinweis für Zyklen (F-23).
