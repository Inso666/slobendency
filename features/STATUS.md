# Umsetzungsstand

Übergabepunkt zwischen Entwicklungssessions. Der Orchestrator schreibt diese Datei nach jedem
Zustandswechsel fort. Zustände: `offen`, `in Tests`, `in Arbeit`, `in QA`, `fertig`,
`blockiert`. `in Arbeit` beginnt erst, wenn die roten Tests committet sind.

| # | Feature | Zustand | Branch | Anmerkung |
|---|---|---|---|---|
| F-01 | Projektgerüst und Kartentafel | fertig | — | gemergt 05.09. 00:05 |
| F-02 | Domänenmodell und Invarianten | fertig | — | gemergt 05.09. 00:35 |
| F-03 | Kartenstore und Kommandos | fertig | — | gemergt 05.09. 01:15 |
| F-04 | Persistenz im LocalStorage | fertig | — | gemergt 05.09. 05:30 |
| F-05 | DSL-Parser | fertig | — | gemergt 05.09. 07:05 |
| F-06 | DSL-Serializer | in Arbeit | feature/F-06-dsl-serializer | 58 Tests rot (3b7cd7c) |
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

## Entscheidungen des Orchestrators

Widersprüche zwischen den Quellen, die dem Nutzer vorgelegt und mangels Rückmeldung aus den
Quellen selbst entschieden wurden. Jede Entscheidung ist revidierbar.

**Kennung-Zeichensatz (05.09.).** PRD 3.1 beschreibt `id` als `[A-Za-z0-9_-]+`, die
DSL-Grammatik in PRD 4.2 verlangt für `identifier` dagegen Beginn mit Buchstabe oder
Unterstrich. Maßgeblich ist 4.2. Sie ist die engere Regel und erfindet nichts; 3.1 zu folgen
zwänge dazu, eine in der EBNF nicht vorgesehene Quotierung für Kennungen zu erfinden. Zudem
wäre eine Kennung mit führendem Bindestrich in `relation_def` nicht eindeutig von den Pfeilen
`-->`, `-.->` und `--x` zu unterscheiden. Nur mit 4.2 bleibt die Round-Trip-Garantie DSL-14
für jede gültige Karte erfüllbar. Folge: Die Kennungsprüfung in `src/lib/model/validation.ts`
aus F-02 wird verengt, die zugehörigen Tests werden angepasst. Beides ist im Rahmen von F-05
freigegeben.

**Ausrichtung der Attribute im Export, DSL-12 (05.09.).** Der Regeltext in
`features/F-06-dsl-serializer.md` nennt als Trenner `, ` und lässt den Nutzenwert rechts auf
die Breite des längsten Nutzenwerts auffüllen. Das Beispiel im selben Dokument zeigt dagegen
`impact=5,  effort=5`, also Komma und zwei Leerzeichen, obwohl dort alle Nutzenwerte einstellig
sind und nach keiner Auffüllregel etwas aufzufüllen wäre. Maßgeblich ist der Regeltext; das
Beispiel ist Anschauung und nicht byteverbindlich. Kein ableitbares Schema erzeugt die zwei
Leerzeichen, weder vor noch hinter dem Komma, womit der einzige normative Satz übrig bleibt.
Die Aufwandsspalte fluchtet damit weiterhin, und DSL-08 erlaubt das Leerzeichen vor dem Komma
ausdrücklich.

## Sessionprotokoll

Je Session eine Zeile: Datum, geweckt oder manuell gestartet, was erledigt wurde, womit die
nächste Session anfängt.

| Datum | Start | Erledigt | Nächster Schritt |
|---|---|---|---|
| 04.–05.09. | manuell | Ausgangslage committet, Weckzyklus gestartet, F-01 durch Tests, Umsetzung, QA und Merge gebracht (2 QA-Befunde behoben: fehlende CSP, Kopfband-Anordnung unter 768 px). | F-02 durch Tests, Umsetzung und QA bringen. |
| 05.09. | manuell | F-02, F-03 und F-04 fertiggestellt und gemergt. Eine Teständerung in F-04 freigegeben, ein Quellenwiderspruch zum Kennung-Zeichensatz entschieden. | F-05 durch Tests, Umsetzung und QA bringen; dabei die Kennungsprüfung aus F-02 verengen. |
