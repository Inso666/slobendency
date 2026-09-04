# Umsetzungsstand

Übergabepunkt zwischen Entwicklungssessions. Der Orchestrator schreibt diese Datei nach jedem
Zustandswechsel fort. Zustände: `offen`, `in Tests`, `in Arbeit`, `in QA`, `fertig`,
`blockiert`. `in Arbeit` beginnt erst, wenn die roten Tests committet sind.

| # | Feature | Zustand | Branch | Anmerkung |
|---|---|---|---|---|
| F-01 | Projektgerüst und Kartentafel | fertig | — | gemergt 05.09. 00:05 |
| F-02 | Domänenmodell und Invarianten | fertig | — | gemergt 05.09. 00:35 |
| F-03 | Kartenstore und Kommandos | in Arbeit | feature/F-03-kartenstore | 32 Tests rot |
| F-04 | Persistenz im LocalStorage | offen | — | — |
| F-05 | DSL-Parser | offen | — | Vor Beginn klären: Kennung-Zeichensatz PRD 3.1 gegen DSL-Grammatik PRD 4.2 (siehe features/qa/F-02.md) |
| F-06 | DSL-Serializer | offen | — | — |
| F-07 | Vorbedingungen und Zyklen | offen | — | — |
| F-08 | Kartengerüst | offen | — | — |
| F-09 | Feature-Signaturen und Jitter | offen | — | — |
| F-10 | Kanten und Signaturenkatalog | offen | — | — |
| F-11 | Selektion, Hervorhebung, Dimming | offen | — | — |
| F-12 | Zoom und Pan | offen | — | — |
| F-13 | Feature-Formular | offen | — | — |
| F-14 | Verzeichnis | offen | — | — |
| F-15 | Detail-Kartusche | offen | — | — |
| F-16 | Kontextmenü und Verbindungsvorgang | offen | — | — |
| F-17 | Beziehungen bearbeiten und löschen | offen | — | — |
| F-18 | Import-Dialog | offen | — | — |
| F-19 | Export-Dialog | offen | — | — |
| F-20 | SVG-Export | offen | — | — |
| F-21 | PNG-Export | offen | — | — |
| F-22 | Responsives Verhalten und Touch | offen | — | — |
| F-23 | Fußleiste, Hinweise, Zurücksetzen | offen | — | — |

## Sessionprotokoll

Je Session eine Zeile: Datum, geweckt oder manuell gestartet, was erledigt wurde, womit die
nächste Session anfängt.

| Datum | Start | Erledigt | Nächster Schritt |
|---|---|---|---|
| 04.–05.09. | manuell | Ausgangslage committet, Weckzyklus gestartet, F-01 durch Tests, Umsetzung, QA und Merge gebracht (2 QA-Befunde behoben: fehlende CSP, Kopfband-Anordnung unter 768 px). | F-02 durch Tests, Umsetzung und QA bringen. |
