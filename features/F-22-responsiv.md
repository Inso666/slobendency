# F-22 · Responsives Verhalten und Touch

**Schicht:** Bedienung · **Hängt ab von:** F-13 bis F-16 · **Umfang:** M

## Ziel

Alle Kernfunktionen sind auf einem Smartphone erreichbar und mit dem Finger bedienbar — ohne
eine zweite Oberfläche zu bauen.

## DDD-Einordnung

Reine Darstellung und Interaktion. Kein Kommando, keine Regel ändert sich; nur Anordnung,
Trefferflächen und Auslöser.

## Umfang

Anpassungen an bestehenden Komponenten, keine neuen fachlichen Bausteine. Breakpoints nach
UI-18: unter 768 px mobil, 768 bis 1024 px Tablet, darüber Desktop.

| Element | Mobil (< 768 px) |
|---|---|
| Verzeichnis | Vollbild-Overlay statt seitliches Panel, mit eigener Schließen-Leiste (UI-11) |
| Detail-Kartusche | Bottom Sheet über die volle Breite, von unten eingeschoben, mit Zuggriff (UI-15) |
| Formular, Import, Export | Vollbild (UI-13) |
| Kopfband | Nur Symbole, seltener Gebrauchtes im Überlaufmenü (UI-17) |
| Zeichenerklärung | Ausgeblendet, erreichbar über *Ansicht → Zeichenerklärung* |
| Fußleiste | Nur Speicherzustand und Bestandszahlen; der Kurs entfällt |

| Interaktion | Desktop | Mobil |
|---|---|---|
| Feature selektieren | Linksklick | Tap |
| Kontextmenü | Rechtsklick | Long-Press, etwa 500 ms, mit haptischem oder visuellem Hinweis |
| Zoom | Mausrad | Pinch |
| Pan | Ziehen auf freier Fläche | Ein-Finger-Drag |
| Selektion aufheben | ESC oder Klick ins Leere | Tap ins Leere |
| Vorgang abbrechen | ESC | Knopf *Abbrechen* im Hinweisband |

Trefferflächen: Jede Feature-Signatur bekommt einen unsichtbaren Kreis von mindestens 44 px
Bildschirmgröße; da die Karte skaliert, wird dieser Radius aus dem aktuellen Maßstab gerechnet.
Menüeinträge und Knöpfe sind mindestens 44 × 44 px groß (UI-16).

Long-Press darf nicht mit Pan verwechselt werden: Bewegt sich der Finger währenddessen um mehr
als 10 px, gilt es als Drag und das Menü öffnet nicht. Auf der Karte wird die Textauswahl
unterbunden, damit Long-Press keinen Markierungsdialog auslöst.

## Fachregeln

| ID | Regel |
|---|---|
| UI-10 bis UI-18 | Vollständig, siehe Tabellen |
| NFR-07 | Mindestens 30 fps beim Zoomen und Verschieben auf Mobilgeräten |
| AK-16 | Auf 375 px Breite sind alle Kernfunktionen erreichbar und bedienbar |

## Akzeptanzkriterien

- [ ] Auf 375 px Breite lassen sich Feature anlegen, bearbeiten, löschen, Beziehung anlegen,
      importieren und exportieren vollständig durchführen (AK-16).
- [ ] Long-Press auf einem Feature öffnet das Kontextmenü; Long-Press mit Fingerbewegung
      verschiebt stattdessen die Karte.
- [ ] Das Verzeichnis öffnet als Vollbild und schließt über einen sichtbaren Knopf.
- [ ] Die Detail-Kartusche erscheint als Bottom Sheet und verdeckt die Karte nicht vollständig.
- [ ] Alle Trefferflächen erreichen mindestens 44 × 44 px.
- [ ] Die Seite scrollt bei keiner Breite horizontal.
- [ ] Zwischen 768 und 1024 px bleibt das Verzeichnis seitlich, die Zeichenerklärung entfällt.

## Tests

E2E mit den Viewports 375 × 812, 834 × 1112 und 1440 × 900: je ein vollständiger Durchlauf
Anlegen → Beziehung → Export. Zusätzlich ein Test, der Long-Press und Drag unterscheidet.

## Nicht Teil dieses Features

Vollständige Tastaturbedienbarkeit und ARIA-Auszeichnung (laut PRD 11 zurückgestellt — die in
den Einzelfeatures genannten Fokus- und Beschriftungsanforderungen gelten trotzdem).
