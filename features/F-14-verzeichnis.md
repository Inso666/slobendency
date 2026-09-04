# F-14 · Verzeichnis

**Schicht:** Bedienung · **Hängt ab von:** F-03, F-11 · **Umfang:** M

## Ziel

Ein Panel, das alle Features als durchsuchbares Verzeichnis zeigt — nach Revieren gruppiert wie
ein Kartenindex — und von dem aus man jedes Feature auf der Karte findet und bearbeitet.

## DDD-Einordnung

Bedienung. Filter, Sortierung und Gruppierung sind Anzeigezustand und bleiben in der
Komponente; das Revier je Feature kommt aus `quadrantOf` (F-02) und wird nicht neu berechnet.

## Umfang

`src/lib/components/FeatureList/FeatureList.svelte` samt Zeilenkomponente.

Aufbau nach `design/03-seekarte.html`:

- Kopf mit Titel *Verzeichnis* in Fraunces und der Zeile `14 Features · nach Impact` in
  gesperrten Versalien.
- Suchfeld mit unterer Haarlinie statt Rahmen, Platzhalter *Label oder ID suchen*.
- Gruppenüberschriften in Fraunces kursiv gesperrt: *Quick Wins*, *Große Vorhaben*,
  *Nebenbei*, *Vermeiden* — in dieser Reihenfolge, leere Gruppen entfallen.
- Einträge mit Namen, Punktführung (`border-bottom: 1px dotted`) und der Lotung `13 · 8` in
  Azeret Mono.
- Der Eintrag des selektierten Features ist mit `--shallow` hinterlegt und halbfett.

Das Panel ist ein Overlay über der Karte, 298 px breit, mit Trennlinie in `--rule`. Es ist
standardmäßig **eingeklappt** (FR-50) und wird über den Knopf *Verzeichnis* im Kopfband
geöffnet. Unter 768 px wird es zum Vollbild-Overlay (F-22).

## Verhalten

| Aktion | Verhalten |
|---|---|
| Tippen im Suchfeld | Filtert über Anzeigename und Kennung, Groß-/Kleinschreibung egal, Teiltreffer (FR-52) |
| Sortierung wählen | Nach Anzeigename, Nutzen oder Aufwand (FR-53). Bei Sortierung nach Nutzen oder Aufwand absteigend, bei Name aufsteigend. Die Gruppierung nach Revieren bleibt bestehen |
| Klick auf einen Eintrag | Selektiert das Feature auf der Karte und zentriert es im Ausschnitt (FR-54, nutzt `centerOn` aus F-12) |
| Aktionen je Eintrag | Bearbeiten, Löschen, Beziehung anlegen (FR-55) — sichtbar bei Hover und bei Tastaturfokus |
| Löschen | Rückfrage mit der Anzahl betroffener Kanten, wenn Beziehungen bestehen (FR-05) |
| Beziehung anlegen | Setzt das Feature als Start des Verbindungsvorgangs (F-16) und schließt das Panel |

Die Kopfzeile nennt immer die Gesamtzahl der Features; bei aktivem Filter zusätzlich die Zahl
der Treffer.

## Fachregeln

| ID | Regel |
|---|---|
| FR-50 | Ausklappbares Panel am linken Rand, standardmäßig eingeklappt |
| FR-51 | Zeigt alle Features mit Anzeigename, Nutzen und Aufwand |
| FR-52 | Textfilter über Anzeigename und Kennung |
| FR-53 | Sortierung nach Name, Nutzen, Aufwand |
| FR-54 | Klick selektiert und zentriert |
| FR-55 | Aktionen Bearbeiten, Löschen, Beziehung anlegen |
| FR-05 | Löschen mit Beziehungen erfordert eine Rückfrage mit Anzahl der Kanten |
| NFR-21 | Namen werden als Text gerendert |

## Akzeptanzkriterien

- [ ] Das Panel ist beim ersten Start eingeklappt und lässt sich über das Kopfband öffnen.
- [ ] Der Filter `sso` findet ein Feature mit der Kennung `sso` ebenso wie eines mit dem Namen
      *Single Sign-On*.
- [ ] Ein Feature mit `impact = 13, effort = 8` steht bei `domainMax = 22` unter *Quick Wins*.
- [ ] Klick auf einen Eintrag selektiert das Feature und rückt es in die Mitte des Ausschnitts.
- [ ] Löschen eines Features mit drei Kanten fragt zurück und nennt die Zahl 3; nach dem
      Bestätigen sind Feature und Kanten aus Karte und Verzeichnis verschwunden (AK-09).
- [ ] Die Liste aktualisiert sich sofort nach jeder Änderung.
- [ ] Alle Einträge und Aktionen sind mit der Tastatur erreichbar.

## Tests

- Unit: Filterlogik, Sortierreihenfolgen, Gruppierung an der Revierschwelle.
- E2E: Filtern, Klick zentriert, Löschen mit Rückfrage.

## Nicht Teil dieses Features

Detail-Kartusche (F-15), Verbindungsvorgang selbst (F-16), Bottom Sheet auf Mobilgeräten (F-22).
