# F-13 · Feature-Formular

**Schicht:** Bedienung · **Hängt ab von:** F-03 · **Umfang:** L

## Ziel

Features anlegen und bearbeiten — mit der Schätzreihe als Auswahl, einem Vorschlag für die
Kennung und der Möglichkeit, gleich Beziehungen zu bekannten Features zu setzen.

## DDD-Einordnung

Bedienung über der Anwendungsschicht. Das Formular prüft nichts selbst, was das Aggregat prüft:
Es ruft `createFeature` beziehungsweise `editFeature` auf und zeigt die zurückgegebenen
Verstöße an den passenden Feldern an. Einzige Ausnahme sind Sofortrückmeldungen zur
Zeichenmenge der Kennung, die dieselbe Regel nur früher sichtbar machen.

## Umfang

`src/lib/components/FeatureModal/FeatureModal.svelte` und darin verwendete Teile
(`ScoreSelect.svelte`, `RelationRow.svelte`).

Felder:

| Feld | Verhalten |
|---|---|
| Anzeigename | Freitext, max. 200 Zeichen, optional |
| Kennung | Freitext, max. 64 Zeichen. Beim Anlegen aus dem Anzeigenamen vorgeschlagen (Slugify), aber frei überschreibbar. Sobald der Nutzer sie selbst geändert hat, folgt sie dem Namen nicht mehr (FR-07) |
| Nutzen | Auswahl aus 1, 2, 3, 5, 8, 13, 21 (FR-02) |
| Aufwand | dieselbe Auswahl |
| Beziehungen | Liste von Zeilen: Ziel-Feature aus den bekannten Features, Art, optionale Beschriftung; Zeilen hinzufügbar und entfernbar (FR-06) |

Slugify: Kleinbuchstaben, Umlaute nach `ae`, `oe`, `ue`, `ss`, alles Übrige außerhalb von
`[a-z0-9-]` zu `-`, mehrfache Bindestriche zusammengefasst, an den Enden getrimmt, auf 64
Zeichen gekürzt. Ergibt das leeren Text, bleibt das Feld leer und ist Pflichteingabe.

## Werte außerhalb der Schätzreihe

Trägt ein importiertes Feature einen Wert, der nicht in der Reihe liegt, wird dieser Wert beim
Öffnen des Formulars **als zusätzliche Option** angeboten, ist vorausgewählt und sichtbar als
abweichend gekennzeichnet — etwa `7 (abweichend)` in `--magenta`. Der Wert wird nie
stillschweigend gerundet (FR-03). Wählt der Nutzer eine Zahl aus der Reihe, ist die
Zusatzoption verschwunden; bricht er ab, bleibt der Originalwert erhalten (AK-15).

## Darstellung

Modal als Kartusche über der Karte, mit dem Rahmen aus `design/03-seekarte.html`
(`.cartouche`, 1 px `--rule`, äußerer Ring aus `--paper` und `--hair`). Titel in Fraunces,
Feldbeschriftungen in gesperrten Versalien in `--ink-soft`, Zahlenwerte in Azeret Mono. Die
Schätzreihe erscheint als Reihe gleich breiter Knöpfe, der gewählte Wert in `--ink` mit
Schrift in `--paper`. Unter 768 px füllt das Modal den Bildschirm (UI-13).

Verhalten: ESC schließt ohne Speichern, Klick auf den Hintergrund ebenso, der Fokus wird beim
Öffnen auf das erste Feld gesetzt und bleibt im Modal gefangen. Beim Schließen kehrt er auf
das auslösende Element zurück.

## Fachregeln

| ID | Regel |
|---|---|
| FR-01 | Anlegen über ein modales Formular mit Kennung, Anzeigename, Nutzen, Aufwand |
| FR-02 | Nutzen und Aufwand werden nur als Werte der Schätzreihe angeboten |
| FR-03 | Abweichende Werte bleiben erhalten und werden gekennzeichnet |
| FR-04 | Bearbeiten nutzt dasselbe, vorbefülltes Formular |
| FR-06 | Beziehungen zu bekannten Features direkt im Formular |
| FR-07 | Kennung wird aus dem Anzeigenamen vorgeschlagen |
| INT-01 | Eine vergebene Kennung wird abgelehnt, mit Meldung am Feld |
| INT-06 | Wird beim Bearbeiten die Kennung geändert, ziehen alle Beziehungen mit |
| NFR-23 | Eingabelängen begrenzt |

Beziehungen aus dem Formular werden erst nach dem erfolgreichen Speichern des Features
angelegt; scheitert eine einzelne Beziehung an einer Invariante, bleibt das Feature gespeichert
und die betroffene Zeile zeigt den Fehler.

## Akzeptanzkriterien

- [ ] Ein neu angelegtes Feature erscheint ohne Neuladen sofort an der richtigen Stelle auf der
      Karte (AK-01).
- [ ] Eine bereits vergebene Kennung wird abgelehnt; die Meldung steht am Feld Kennung, das
      Modal bleibt offen, keine Daten gehen verloren.
- [ ] Anzeigename *Rollen & Rechte* schlägt die Kennung `rollen-rechte` vor; nach manueller
      Änderung der Kennung folgt sie weiteren Namensänderungen nicht mehr.
- [ ] Ein Feature mit `impact = 7` zeigt im Formular `7` als vorausgewählte, gekennzeichnete
      Zusatzoption; nach Abbruch bleibt der Wert `7` (AK-15).
- [ ] Ein Feature, das im Formular mit zwei Beziehungen angelegt wird, hat danach zwei Kanten
      auf der Karte.
- [ ] Beim Umbenennen der Kennung bleiben alle Beziehungen intakt (AK-10).
- [ ] ESC schließt ohne zu speichern; der Fokus bleibt im Modal gefangen, solange es offen ist.

## Tests

- Unit: Slugify-Tabelle, Zusatzoption bei abweichendem Wert, Übernahme der Formularzeilen in
  Kommandos.
- E2E: Anlegen mit Beziehung, doppelte Kennung, Bearbeiten mit Umbenennen, Abbruch mit
  abweichendem Wert.

## Nicht Teil dieses Features

Löschen samt Rückfrage (F-15), Beziehungen über die Karte anlegen (F-16), Verzeichnis (F-14).
