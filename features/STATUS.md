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
| F-06 | DSL-Serializer | fertig | — | gemergt 05.09. 08:20 |
| F-07 | Vorbedingungen und Zyklen | fertig | — | gemergt 05.09. 09:10 |
| F-08 | Kartengerüst | fertig | — | gemergt 05.09. 11:00 |
| F-09 | Feature-Signaturen und Jitter | fertig | — | gemergt 05.09. 13:10 |
| F-10 | Kanten und Signaturenkatalog | fertig | — | gemergt 05.09. 15:35 |
| F-11 | Selektion, Hervorhebung, Dimming | fertig | — | gemergt 05.09. 18:20 |
| F-12 | Zoom und Pan | fertig | — | gemergt 05.09. 20:05 |
| F-13 | Feature-Formular | fertig | — | gemergt 06.09. 00:20 |
| F-14 | Verzeichnis | in Arbeit | feature/F-14-verzeichnis | 14 Unit- und 21 E2E-Tests rot committet |
| F-15 | Detail-Kartusche | offen | — | Auflage: den Knopf Bearbeiten aus F-13 in die Kartusche übernehmen, nicht danebenstellen |
| F-16 | Kontextmenü und Verbindungsvorgang | offen | — | Nachzuholen: Test für Escape bricht Verbindungsvorgang ab (FR-13); in F-11 mangels Oberfläche nicht fahrbar |
| F-17 | Beziehungen bearbeiten und löschen | offen | — | — |
| F-18 | Import-Dialog | offen | — | — |
| F-19 | Export-Dialog | offen | — | — |
| F-20 | SVG-Export | offen | — | Nachzuholen: prüfen, dass die unsichtbaren Trefferflächen der Kanten aus F-11 nicht im Export landen |
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

**Waagrechte Lage der Reviernamen (05.09.).** `features/F-08-kartengeruest.md` verlangt den
Reviernamen „mittig im Revier". `design/03-seekarte.html` setzt die linke Spalte dagegen auf
`x="330"`, während die geometrische Mitte bei 300 liegt; die rechte Spalte trifft ihre Mitte
mit `x="740"` exakt. Maßgeblich ist die Featurebeschreibung: mittig. Der Wert 330 gilt nur für
den Wertebereich 22 und säße bei größeren Karten falsch, ihm liegt also kein
verallgemeinerbares Prinzip zugrunde, sondern eine Handkorrektur im statischen Entwurf. Der
Entwurf bleibt verbindlich für Farben, Typografie, Signaturen und Anordnung — nicht für eine
Einzelkoordinate, die seiner eigenen Beschriftungsregel widerspricht.

**Winkel im Jitter (05.09.).** PRD 7.3 schreibt
`winkel <- (2 pi mal Gruppenindex / Gruppengroesse) + (seed mod 360) Grad`, setzt für den
zweiten Summanden also ein Gradzeichen und verlangt damit die Umrechnung mit `pi/180`.
`features/F-09-feature-signaturen.md` liest denselben Summanden als Bogenmaß. Maßgeblich ist
die PRD; `CLAUDE.md` legt ausdrücklich fest, dass sie bei Widerspruch zu allem anderen
gewinnt. Beide Lesarten wären deterministisch, aber nur eine ist die maßgebliche. Die
vorgelegten Tests prüfen keine winkelabhängige Koordinate, sondern Ankerpunkt, Radius,
Determinismus und Gruppenisolation; die Entscheidung ist damit umkehrbar, ohne Tests zu
berühren.

**Auslöser für den Bearbeitungsmodus (05.09.).** `features/F-13-feature-formular.md` führt FR-04
unter seinen Fachregeln und verlangt in seinem Testabschnitt einen Durchlauf „Bearbeiten mit
Umbenennen". Einen Auslöser dafür nennen die Quellen aber nur in F-15 (Detail-Kartusche) und
F-16 (Kontextmenü), von denen F-13 nicht abhängt. Festgelegt: F-13 bringt einen über Rolle und
Text erreichbaren Knopf *Bearbeiten*, sichtbar solange ein Feature gewählt ist. Das Formular
samt Bearbeitungsmodus gehört unstrittig zu F-13, und ohne Auslöser wäre das
Akzeptanzkriterium nicht prüfbar. F-15 übernimmt diesen Knopf später in die Kartusche, statt
einen zweiten danebenzustellen — sonst stünde dieselbe Bedienhandlung zweimal.

**Bedienelement der Sortierung, FR-53 (05.09.).** `features/F-14-verzeichnis.md` verlangt die
Aktion „Sortierung wählen", nennt aber kein Bedienelement; `design/03-seekarte.html` zeigt im
Kopf des Verzeichnisses nur die Zeile `14 Features · nach Impact` und keinen Schalter.
Festgelegt: ein Auswahlfeld mit der Beschriftung *Sortierung* und den Optionen *Anzeigename*,
*Nutzen*, *Aufwand*. Ohne Bedienelement wäre die Fachregel nicht bedienbar und das
Akzeptanzkriterium nicht prüfbar; ein Auswahlfeld ist die kleinste Form, die drei Zustände
über Rolle und Text erreichbar macht (AK Tastaturbedienung). Die Kopfzeile aus dem Entwurf
bleibt unberührt und nennt weiterhin die aktive Sortierung.

**Form der Rückfrage beim Löschen, FR-05 (06.09., ersetzt die Festlegung vom 05.09.).** Weder
PRD noch Entwurf legen fest, wie die Rückfrage erscheint. Zunächst war `window.confirm()`
festgelegt; das ist zurückgenommen. Festgelegt ist nun ein Dialog in der Seite:
`role="alertdialog"` mit dem Namen *Feature löschen*, dessen Text die Anzahl betroffener Kanten
nennt, mit den Knöpfen *Löschen* und *Abbrechen*, als Kartusche über die Token aus `src/app.css`
gerendert. `design/README.md` hält fest, dass die noch zu entwerfenden Dialoge aus den bereits
feststehenden Bausteinen Rahmen, Kartusche und Panel gebaut werden; ein natives `confirm` trägt
keinen dieser Token und wechselt nicht mit der Nachttafel, die der Entwurf als verbindlich
führt. F-13 hat mit dem Formular als `<dialog>` in der Seite den Präzedenzfall gesetzt, sodass
diese Wahl ein Muster fortschreibt, statt ein zweites daneben zu stellen. Die zugehörige
Teständerung an `e2e/F-14-verzeichnis.spec.ts` ist freigegeben (Commit 00fa887).

## Sessionprotokoll

Je Session eine Zeile: Datum, geweckt oder manuell gestartet, was erledigt wurde, womit die
nächste Session anfängt.

| Datum | Start | Erledigt | Nächster Schritt |
|---|---|---|---|
| 04.–05.09. | manuell | Ausgangslage committet, Weckzyklus gestartet, F-01 durch Tests, Umsetzung, QA und Merge gebracht (2 QA-Befunde behoben: fehlende CSP, Kopfband-Anordnung unter 768 px). | F-02 durch Tests, Umsetzung und QA bringen. |
| 05.09. | manuell | F-02, F-03 und F-04 fertiggestellt und gemergt. Eine Teständerung in F-04 freigegeben, ein Quellenwiderspruch zum Kennung-Zeichensatz entschieden. | F-05 durch Tests, Umsetzung und QA bringen; dabei die Kennungsprüfung aus F-02 verengen. |
