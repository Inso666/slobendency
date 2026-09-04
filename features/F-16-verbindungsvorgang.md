# F-16 · Kontextmenü und Verbindungsvorgang

**Schicht:** Bedienung · **Hängt ab von:** F-11, F-03 · **Umfang:** L

## Ziel

Beziehungen entstehen dort, wo man sie sieht: Rechtsklick auf ein Feature, *Als Start
verwenden*, Rechtsklick auf ein zweites, *Als Ziel verwenden*, Art wählen, fertig. Der laufende
Vorgang ist jederzeit erkennbar und jederzeit abbrechbar.

## DDD-Einordnung

Bedienung über der Anwendungsschicht. Der Zwischenzustand (gesetzter Start ohne Ziel) ist
Sitzungszustand in `selection.ts` und niemals Teil des Aggregats — eine halbe Beziehung darf im
Modell nicht existieren.

## Umfang

- `src/lib/components/ContextMenu/ContextMenu.svelte` — Menü an der Zeigerposition
- `src/lib/components/RelationDialog/RelationDialog.svelte` — Auswahl von Art und Beschriftung
- Erweiterung der Kartendarstellung um die Markierung des Startpunkts

## Ablauf

1. Rechtsklick auf ein Feature (auf Mobilgeräten Long-Press, etwa 500 ms) öffnet das
   Kontextmenü mit *Als Start verwenden*, *Als Ziel verwenden*, *Bearbeiten*, *Löschen*.
2. *Als Start verwenden* setzt `connectSource`. Der Startpunkt wird dauerhaft markiert, solange
   der Vorgang läuft (FR-14): gestrichelte Kontur in `--magenta`, zusätzlich ein Hinweisband
   über der Karte mit dem Text *Ziel wählen — ESC bricht ab* und einem Knopf *Abbrechen*.
3. *Als Ziel verwenden* auf einem zweiten Feature öffnet den Dialog: Art (drei Knöpfe mit
   Signatur und Namen), optionale Beschriftung, *Anlegen* und *Abbrechen*.
4. *Anlegen* ruft `createRelation`. Verstöße gegen INT-03 und INT-04 erscheinen im Dialog; der
   Vorgang bleibt offen, bis er gelingt oder abgebrochen wird.
5. Nach dem Anlegen wird `connectSource` geleert, die neue Kante ist sofort sichtbar.

## Abbruch

Ein unvollständiger Vorgang lässt sich jederzeit beenden (FR-13):

- ESC — bricht zuerst den Verbindungsvorgang ab, erst ein zweites ESC hebt die Selektion auf
- Klick auf freie Fläche
- Knopf *Abbrechen* im Hinweisband oder im Dialog

## Fachregeln

| ID | Regel |
|---|---|
| FR-10 | Beziehungen über ein Kontextmenü auf der Karte anlegen |
| FR-11 | Menü bietet *Als Start verwenden* und *Als Ziel verwenden* |
| FR-12 | Sind Start und Ziel gesetzt, öffnet sich der Dialog für Art und Beschriftung |
| FR-13 | Unvollständiger Vorgang jederzeit abbrechbar |
| FR-14 | Gesetzter Start bleibt sichtbar markiert, solange der Vorgang läuft |
| FR-15 | Beziehungen lassen sich ebenso über das Verzeichnis anlegen (F-14 setzt den Start) |
| INT-03 | Keine Selbstreferenz — *Als Ziel verwenden* ist auf dem Startfeature deaktiviert |
| INT-04 | Ein bereits vorhandenes Tripel wird abgelehnt, mit der Meldung „Beziehung existiert bereits" |
| INT-05 | Eine Beziehung, die einen Zyklus schließt, wird angelegt; der Warnhinweis erscheint (F-23) |
| UI-12 | Auf Mobilgeräten wird das Kontextmenü per Long-Press ausgelöst |
| UI-16 | Menüeinträge sind mindestens 44 × 44 px groß |

Das Kontextmenü ersetzt das Browser-Kontextmenü über der Karte; auf freier Fläche bietet es
*Ganze Karte zeigen* und *Feature anlegen*. Es schließt bei ESC, bei Klick daneben und beim
Scrollen; die Einträge sind mit Pfeiltasten erreichbar.

## Akzeptanzkriterien

- [ ] Rechtsklick auf ein Feature öffnet das Kontextmenü an der Zeigerposition, ohne dass das
      Browsermenü erscheint.
- [ ] Nach *Als Start verwenden* ist der Startpunkt sichtbar markiert und bleibt es, bis der
      Vorgang endet.
- [ ] *Als Ziel verwenden* ist auf dem Startfeature nicht auswählbar.
- [ ] Ein bereits vorhandenes Tripel wird mit der erwarteten Meldung abgelehnt; der Dialog
      bleibt offen.
- [ ] A → B → A lässt sich anlegen und erzeugt eine sichtbare Zyklus-Warnung (AK-08).
- [ ] ESC bricht den laufenden Vorgang ab, ohne die Selektion zu verlieren; ein zweites ESC
      hebt die Selektion auf.
- [ ] Long-Press auf einem Touchgerät öffnet dasselbe Menü.
- [ ] Die neue Kante erscheint sofort ohne Neuladen.

## Tests

- Unit: Zustandsmaschine des Vorgangs (leer → Start gesetzt → Dialog → angelegt beziehungsweise
  abgebrochen).
- E2E: vollständiger Ablauf über zwei Rechtsklicks, Abbruch per ESC, Ablehnung eines Duplikats.

## Nicht Teil dieses Features

Bearbeiten und Löschen bestehender Beziehungen (F-17), Anzeige der Zyklus-Warnung (F-23).
