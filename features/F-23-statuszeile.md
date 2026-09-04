# F-23 · Fußleiste, Hinweise, Zurücksetzen

**Schicht:** Bedienung · **Hängt ab von:** F-04, F-07 · **Umfang:** S

## Ziel

Die Anwendung sagt jederzeit, woran man ist: wie groß der Bestand ist, ob er gesichert wurde,
ob die Reihenfolge sich irgendwo widerspricht — und sie lässt sich bewusst leeren.

## DDD-Einordnung

Bedienung. Die Fußleiste liest ausschließlich vorhandene Stores; sie berechnet nichts selbst.
Die Zyklenprüfung kommt aus F-07 und läuft nach jeder Änderung an den Beziehungen.

## Umfang

`src/lib/components/StatusBar/StatusBar.svelte` und `NoticeBar.svelte`.

Fußleiste, von links nach rechts, in Karla 11,5 px in `--ink-soft` mit gesperrter Laufweite:

| Feld | Inhalt |
|---|---|
| Speicherzustand | *Gespeichert 12:04* aus `lastSavedAt`; während der Bündelungsfrist *Wird gespeichert …*; bei `unavailable` *Nicht gespeichert — Sitzungsmodus*; bei `quotaExceeded` *Speicher voll* in `--magenta` |
| Bestand | `14 Features · 9 Beziehungen` |
| Zyklen | *Keine Zyklen*, sonst `1 Zyklus-Warnung` beziehungsweise `n Zyklus-Warnungen` in `--magenta`, anklickbar |
| Kurs | Rechtsbündig in Fraunces kursiv: die transitive `requires`-Kette des selektierten Features, `Rollen & Rechte → Single Sign-On → Benutzer-Login`; ohne Selektion leer |

Ein Klick auf die Zyklus-Warnung selektiert das erste Feature des Zyklus und hebt dessen Kanten
hervor. Die am Zyklus beteiligten `requires`-Kanten werden auf der Karte dauerhaft in
`--magenta` gezeichnet, auch ohne Selektion (PRD 5.6).

Hinweisband über der Karte für Zustände, die eine Handlung nahelegen: wiederhergestellte leere
Karte nach beschädigtem Speicher, fehlende Persistenz, voller Speicher mit der Aufforderung zu
exportieren. Es ist schließbar und kehrt erst bei erneutem Auftreten zurück.

*Ansicht → Karte zurücksetzen* leert den Bestand nach einer Rückfrage, die die Zahl der
Features nennt und auf den Export als Sicherung hinweist (FR-75).

## Fachregeln

| ID | Regel |
|---|---|
| INT-05 | Zyklen werden als Warnung markiert, nicht verhindert; beteiligte Kanten hervorgehoben |
| FR-75 | *Karte zurücksetzen* leert den Bestand nach Rückfrage |
| FR-70, FR-71 | Speicherzustand spiegelt die gebündelte Speicherung wider |
| NFR-31 | Bei vollem Speicher klarer Hinweis mit Aufforderung zum Export |
| NFR-32 | Bei fehlendem Speicher Hinweis auf den Sitzungsmodus |
| FR-74 | Nach beschädigtem Speicher startet die App leer und weist darauf hin |

Die Zyklenprüfung läuft nach jeder Änderung an Beziehungen, nicht bei jedem Rendern.

## Akzeptanzkriterien

- [ ] Die Fußleiste zeigt jederzeit die richtige Zahl an Features und Beziehungen.
- [ ] Nach einer Änderung wechselt der Speicherzustand auf *Wird gespeichert …* und danach auf
      *Gespeichert* mit aktueller Uhrzeit.
- [ ] Das Anlegen von A → B → A erzeugt eine sichtbare Zyklus-Warnung; die beiden Kanten sind
      auf der Karte in Warnfarbe gezeichnet (AK-08).
- [ ] Das Auflösen des Zyklus lässt die Warnung verschwinden.
- [ ] Bei Selektion zeigt die Fußleiste den Kurs; ohne Selektion bleibt das Feld leer.
- [ ] *Karte zurücksetzen* fragt zurück, nennt die Anzahl und leert nach Bestätigung Karte,
      Verzeichnis und Speicher.
- [ ] Ein beschädigter Speicherwert führt beim Start zu leerer Karte samt Hinweisband.

## Tests

- Unit: Formatierung der Felder, Auswahl des Zustandstextes je `StorageState`, Kursbildung.
- E2E: Zyklus anlegen und wieder auflösen, Karte zurücksetzen, Speicherzustand nach Änderung.

## Nicht Teil dieses Features

Zyklenerkennung selbst (F-07), Persistenzlogik (F-04), Undo/Redo (laut PRD 11 zurückgestellt).
