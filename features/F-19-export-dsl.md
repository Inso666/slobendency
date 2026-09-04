# F-19 · Export-Dialog

**Schicht:** Austausch · **Hängt ab von:** F-06 · **Umfang:** S

## Ziel

Die Karte als Text herausgeben — sichtbar, kopierbar, als Datei speicherbar. Das ist zugleich
das Sicherungsmittel gegen den Verlust des LocalStorage.

## DDD-Einordnung

Bedienung über dem Anti-Corruption Layer. Der Dialog ruft `serialize` auf und kümmert sich um
Zwischenablage und Download — beides Infrastruktur, die nicht in die Domäne gehört.

## Umfang

`src/lib/components/ExportDialog/ExportDialog.svelte`

- Schreibgeschütztes Textfeld in Azeret Mono mit dem erzeugten Dokument, Zeilenumbrüche
  erhalten, mit Bildlauf.
- Knopf *In Zwischenablage kopieren* über die Clipboard-API; Erfolg wird für zwei Sekunden am
  Knopf gemeldet (*Kopiert*). Schlägt der Zugriff fehl, wird der Text markiert und ein Hinweis
  auf das manuelle Kopieren gezeigt.
- Knopf *Als .fmap-Datei herunterladen*. Dateiname `featuremap-JJJJ-MM-TT.fmap` mit dem
  aktuellen Datum, Inhaltstyp `text/plain;charset=utf-8`.
- Fußnote in `--ink-soft`: *Kommentare aus einem importierten Dokument werden nicht mit
  exportiert.*

Der Dialog erscheint als Kartusche über der Karte und wird aus dem Kopfband über
*Exportieren → Als Text* geöffnet.

## Fachregeln

| ID | Regel |
|---|---|
| FR-60 | Anzeige des erzeugten Textes mit Kopier- und Downloadmöglichkeit |
| DSL-14 | Der angezeigte Text ist derselbe, den ein erneuter Export erzeugt |
| PRD 5.9 | Der Export ist das bewusst einzusetzende Sicherungsmittel |

## Akzeptanzkriterien

- [ ] Der angezeigte Text entspricht Zeichen für Zeichen dem Ergebnis von `serialize`.
- [ ] Zweimaliges Öffnen ohne zwischenzeitliche Änderung zeigt identischen Text (AK-04).
- [ ] Der Kopierknopf legt den Text in die Zwischenablage und meldet den Erfolg.
- [ ] Der Download erzeugt eine Datei mit der Endung `.fmap`, deren Inhalt dem angezeigten
      Text entspricht.
- [ ] Scheitert der Zugriff auf die Zwischenablage, erscheint ein Hinweis statt eines Fehlers.
- [ ] Bei leerer Karte zeigt der Dialog `featuremap v1` und bleibt bedienbar.

## Tests

- Unit: Dateiname aus einem festen Datum, Aufbau des Blob-Inhalts.
- E2E: Dialog öffnen, Text prüfen, Download auslösen und die heruntergeladene Datei mit dem
  angezeigten Text vergleichen.

## Nicht Teil dieses Features

Serialisierung selbst (F-06), Bildexport (F-20, F-21).
