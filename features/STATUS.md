# Umsetzungsstand

Übergabepunkt zwischen Entwicklungssessions. Der Orchestrator schreibt diese Datei nach jedem
Zustandswechsel fort. Zustände: `offen`, `in Tests`, `in Arbeit`, `in QA`, `fertig`,
`blockiert`. `in Arbeit` beginnt erst, wenn die roten Tests committet sind.

| # | Feature | Zustand | Branch | Anmerkung |
|---|---|---|---|---|
| F-01 | Projektgerüst und Kartentafel | in Arbeit | feature/F-01-projektgeruest | 13 Tests rot (32602bc) |
| F-02 | Domänenmodell und Invarianten | offen | — | — |
| F-03 | Kartenstore und Kommandos | offen | — | — |
| F-04 | Persistenz im LocalStorage | offen | — | — |
| F-05 | DSL-Parser | offen | — | — |
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
| — | — | — | Test-Agent für F-01 beauftragen |
