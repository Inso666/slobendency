# F-15 · Detail-Kartusche

**Schicht:** Bedienung · **Hängt ab von:** F-11 · **Umfang:** M

## Ziel

Zum selektierten Feature zeigt eine gerahmte Kartusche alles Wesentliche: Name, Kennung,
Bewertung, Revier, alle ein- und ausgehenden Beziehungen und die Aktionen, die man von hier aus
auslösen kann.

## DDD-Einordnung

Bedienung. Die Kartusche liest den Selektionszustand und die Beziehungen aus dem Aggregat
(`relationsOf`) und ruft für Aktionen die Kommandos aus F-03 auf.

## Umfang

`src/lib/components/Tooltip/DetailCartouche.svelte`

Aufbau nach `design/03-seekarte.html`:

| Bereich | Inhalt |
|---|---|
| Kopf | Anzeigename in Fraunces 20 px, darunter die Kennung in Azeret Mono in `--ink-soft` |
| Lotung | Drei Spalten mit Haarlinien getrennt: *Impact*, *Effort*, *Revier*. Werte in Fraunces 23 px, Beschriftungen in gesperrten Versalien |
| Geht aus von hier | Ausgehende Beziehungen, je Zeile die Signatur als kleines SVG, das Ziel und die Beschriftung nach einem Mittelpunkt |
| Führt hierher | Eingehende Beziehungen, Signatur mit Pfeilspitze nach links |
| Aktionen | *Bearbeiten*, *Als Start verwenden*, *Löschen* (letzteres in `--magenta`) |

Die Kartusche liegt oben rechts über der Karte, 300 px breit, mit dem doppelten Rahmen aus
`.cartouche`. Hat ein Feature keine Beziehungen, entfällt der jeweilige Abschnitt; hat es gar
keine, steht dort *Keine Beziehungen* in `--ink-soft`.

## Verhalten

| Aktion | Verhalten |
|---|---|
| Selektion wechselt | Inhalt wechselt mit, ohne dass die Kartusche verschwindet |
| Selektion aufgehoben | Kartusche wird ausgeblendet |
| Klick auf ein Beziehungsziel in der Liste | Selektiert dieses Feature |
| *Bearbeiten* | Öffnet das Formular aus F-13, vorbefüllt |
| *Als Start verwenden* | Startet den Verbindungsvorgang (F-16) |
| *Löschen* | Bestehen Beziehungen, erscheint eine Rückfrage mit deren Anzahl (FR-05); danach `deleteFeature` |
| Unter 768 px | Kartusche wird zum Bottom Sheet über die volle Breite (UI-15, Umsetzung in F-22) |

## Fachregeln

| ID | Regel |
|---|---|
| FR-40 | Selektion öffnet eine Detailanzeige mit Anzeigename, Kennung, Nutzen, Aufwand, allen ein- und ausgehenden Beziehungen und Aktionen |
| FR-05 | Löschen mit Beziehungen erfordert Rückfrage mit Anzahl der betroffenen Kanten |
| FR-31 | Die angezeigten Werte sind die gespeicherten Originalwerte, nie die versetzten |
| NFR-21 | Namen und Beschriftungen werden als Text gerendert |

Das Revier wird über `quadrantOf` mit dem aktuellen `domainMax` bestimmt und in der Sprache der
Oberfläche benannt: *Quick Wins*, *Große Vorhaben*, *Nebenbei*, *Vermeiden*.

## Akzeptanzkriterien

- [ ] Selektion eines Features mit drei ausgehenden und einer eingehenden Beziehung zeigt beide
      Abschnitte mit den richtigen Signaturen.
- [ ] Ein Feature mit `impact = 7` zeigt in der Lotung `7`, nicht `8`.
- [ ] Ein versetzt gezeichnetes Feature zeigt seine Originalwerte.
- [ ] *Löschen* bei bestehenden Beziehungen fragt zurück und nennt die Anzahl; Abbruch ändert
      nichts.
- [ ] Klick auf ein Beziehungsziel wechselt die Selektion, und die Hervorhebung auf der Karte
      wandert mit.
- [ ] Ein Feature ohne Beziehungen zeigt einen erklärenden Hinweis statt leerer Abschnitte.

## Tests

- Unit: Aufteilung in ein- und ausgehende Beziehungen, Revierbenennung, leerer Zustand.
- E2E: Selektieren, Zielwechsel per Klick in der Liste, Löschen mit Rückfrage.

## Nicht Teil dieses Features

Bearbeiten von Beziehungen (F-17), Kontextmenü auf der Karte (F-16), Formular selbst (F-13).
