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
| F-14 | Verzeichnis | fertig | — | gemergt 06.09. 21:18 |
| F-15 | Detail-Kartusche | fertig | — | gemergt 06.09. 21:38 |
| F-16 | Kontextmenü und Verbindungsvorgang | fertig | — | gemergt 07.09. 02:26 |
| F-17 | Beziehungen bearbeiten und löschen | fertig | — | gemergt 07.09. 03:18 |
| F-18 | Import-Dialog | fertig | — | gemergt 08.09. 23:19 |
| F-19 | Export-Dialog | fertig | — | gemergt 08.09. 23:16 |
| F-20 | SVG-Export | fertig | — | gemergt 10.09. 18:23 |
| F-21 | PNG-Export | fertig | — | gemergt 10.09. 23:15 |
| F-22 | Responsives Verhalten und Touch | fertig | — | gemergt 11.09. 14:31 |
| F-23 | Fußleiste, Hinweise, Zurücksetzen | fertig | — | gemergt 10.09. 18:12 |
| F-24 | Hervorhebung: Abdunkeln oder Ausblenden | fertig | — | gemergt 11.09. 19:30 |
| F-25 | Datenzoom (ersetzt Zoom-Mechanik F-12) | fertig | — | gemergt 12.09. 00:09 |
| F-26 | Schätzmodus: Fibonacci oder freier Wertebereich | in QA | feature/F-26-schaetzmodus | 569/569 Unit grün; 3 Testfehler in E2E gefunden und freigegeben, QA-Agent behebt |

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

**Rückfragedialog in F-15 vereinheitlicht mit FR-05-Entscheidung (06.09.).** Der Test-Agent für
F-15 hat die Löschrückfrage der Kartusche unabhängig von der F-14-Entscheidung als
`role="dialog"` ohne festen Namen entworfen (in den Quellen für F-15 selbst nicht widersprüchlich,
da F-15 keine eigene Festlegung dazu trifft). Beide Rückfragen bedienen dieselbe Fachregel FR-05
und sollten aus derselben Komponente kommen, sonst stünden zwei Bestätigungsmuster nebeneinander
— genau das, was die FR-05-Entscheidung vom 06.09. vermeiden wollte. Festgelegt: F-15 übernimmt
`role="alertdialog"` mit dem Namen *Feature löschen*, wie in der F-14-Entscheidung. Umgesetzt in
`e2e/F-15-detail-kartusche.spec.ts` (Commit 5fba48c) und in `DetailCartouche.svelte`.

**Lotungsbeschriftung „Impact"/„Effort" in der Kartusche (06.09.).** Der Test-Agent für F-15 hat
die Spaltenbeschriftungen der Lotung wörtlich als *Impact* und *Effort* getestet, obwohl die
Sprachtabelle in `features/README.md` der Oberfläche *Nutzen*/*Aufwand* zuordnet (so auch im
Formular aus F-13 und im Sortierfeld aus F-14). Maßgeblich bleibt hier die engere, speziellere
Quelle: PRD FR-40 nennt in der Aufzählung der Tooltip-Inhalte wörtlich „Impact, Effort" neben den
deutschen Aktionsnamen „Bearbeiten, Löschen" — die PRD wählt an dieser Stelle also bewusst die
englischen Feldnamen, nicht nur ihre Bedeutung. `design/03-seekarte.html` bildet exakt das ab:
die Lotung der Kartusche zeigt `<u>Impact</u>` und `<u>Effort</u>`. Die Sprachtabelle regelt die
Zuordnung von Oberflächenbegriff zu Codebezeichner (*Nutzen* → `impact`); sie schließt nicht aus,
dass eine einzelne, durch PRD und Entwurf übereinstimmend belegte Beschriftung die englischen
Feldnamen direkt zeigt. Die Anwendung führt damit an dieser einen Stelle beide Bezeichnungen:
deutsch im Formular und im Sortierfeld, englisch in der Kartusche — dort, wo PRD und Entwurf
übereinstimmend das Gegenteil der allgemeinen Regel verlangen.

**F-11-Testkonflikt durch die Kartuschenposition (06.09., korrigiert).** `e2e/F-11-selektion.spec.ts`
klickt in `clickBlankArea` auf eine freie Fläche der Plotfläche. Zunächst war die untere rechte
Ecke festgelegt — das übersah, dass dort laut Entwurf die Zeichenerklärung aus F-10 liegt
(`.legend`, `right:26px; bottom:26px`, sichtbar ab 1080 px, der Standardbreite der
Testumgebung). Die obere rechte Ecke scheidet weiterhin aus (Detail-Kartusche aus F-15). Beide
rechten Ecken sind damit belegt, sobald ein Feature selektiert ist — und genau in diesem Moment
klickt der Test. Festgelegt: `clickBlankArea` zielt stattdessen auf die obere linke Ecke. Dort
liegt weder die Kartusche noch die Zeichenerklärung, und die Testdaten aller betroffenen
Spezifikationen (niedriger Impact und Effort) plotten ohnehin unten links (FR-20/FR-21) — die
obere linke Ecke bleibt für jede bisherige Testkarte frei. Das gilt gleichermaßen für den
gleichnamigen Helfer in `e2e/F-15-detail-kartusche.spec.ts`. Der QA-Agent für F-15 setzt beide
Vorkommen auf die obere linke Ecke um (mechanische Koordinatenänderung, keine neue
Prüfabsicht) und prüft danach die volle Suite erneut. Sollte nach der Zusammenführung mit dem
Verzeichnis-Panel aus F-14 (linker Rand, standardmäßig eingeklappt) auch diese Ecke kollidieren,
ist das ein neuer, hier festzuhaltender Befund — im eingeklappten Zustand sollte das Panel dort
aber nichts abfangen.

**Debounce-Race im Löschtest von F-15 (06.09.).** `e2e/F-15-detail-kartusche.spec.ts`, Test
„löscht das Feature samt seiner Kanten…", liest über `readStoredMap` unmittelbar nach den
DOM-Zusicherungen den LocalStorage-Zustand, ohne auf die in `src/lib/store/persistence.ts`
festgelegte Schreibverzögerung von 400 ms (`DEBOUNCE_MS`, F-04) zu warten. DOM und Store
aktualisieren sich sofort korrekt; nur die Persistenz hinkt hinterher, wodurch der Test
nichtdeterministisch rot wird. Dasselbe Muster (`readStoredMap` direkt nach einer Aktion) steht
bereits in F-11 und F-13 und war dort unauffällig, weil vorangehende Zusicherungen dort zufällig
lange genug dauerten. Festgelegt: In diesem einen Test wird die Zusicherung über den
LocalStorage-Zustand auf `expect.poll` umgestellt (wartet bis zu einer Zeitspanne größer als
400 ms auf das Verschwinden von `rollen` bzw. auf `relations` mit Länge 0), statt einmalig zu
lesen. Prüfabsicht und Erwartungswerte bleiben unverändert. Der QA-Agent für F-15 setzt das um.

**Zyklus-Warnung AK-08 gehört zu F-23, nicht zu F-16 (06.09.).** `features/F-16-verbindungsvorgang.md`
widerspricht sich selbst: sein eigener Akzeptanzkriterien-Abschnitt verlangt „A → B → A lässt
sich anlegen und erzeugt eine sichtbare Zyklus-Warnung (AK-08)", sein eigener Abschnitt „Nicht
Teil dieses Features" schließt aber ausdrücklich die „Anzeige der Zyklus-Warnung (F-23)" aus.
`features/F-23-statuszeile.md` beansprucht AK-08 vollständig für sich, mit den konkreten Details
(Zyklen-Zeile in der Fußleiste, Kanten in Warnfarbe, anklickbar zur Selektion). Maßgeblich ist
der Ausschluss: PRD INT-05 trennt bereits zwei Hälften — die Beziehung „wird angelegt" (das ist
F-16s Anteil) und der „Warnhinweis erscheint (F-23)" (PRD-Wortlaut, Zeile zu INT-05). F-16 prüft
und baut deshalb nur, dass eine zyklusschließende Beziehung anstandslos angelegt wird; die
sichtbare Warnung, ihre Farbe und ihre Anklickbarkeit bleiben vollständig F-23 vorbehalten. Die
vorgelegten F-16-Tests sind bereits entsprechend eng geschnitten (Anlegen ja, Warnung nein) —
keine Teständerung nötig, nur diese Klarstellung für Feature- und QA-Agent.

**Fehlender Hover vor Labelprüfung in F-16 (07.09.).** `e2e/F-16-verbindungsvorgang.spec.ts`, Test
„übernimmt eine optionale Beschriftung in die neue Beziehung", prüft `edge-label-a-c-relates`
unmittelbar nach dem Anlegen auf Sichtbarkeit und Text — ohne vorherigen Hover oder Selektion.
FR-45 legt aber fest, dass Kantenlabels nur bei Selektion oder Hover eingeblendet werden; das ist
bereits durch F-10 und F-11 umgesetzt und dort selbst getestet (`e2e/F-10-kanten.spec.ts` Zeile
218: `toBeHidden()` im Grundzustand; `e2e/F-11-selektion.spec.ts` Zeile 289: `toBeVisible()` erst
nach Selektion). Kein Quellenwiderspruch, sondern eine Lücke im F-16-Test selbst — er hat FR-45
schlicht nicht berücksichtigt. Festgelegt: Der Test bekommt vor der Sichtbarkeitsprüfung einen
Hover auf die neue Kante (oder eine Selektion des beteiligten Features), wie im etablierten
Muster aus F-10/F-11. Prüfabsicht (Beschriftung wird unverändert übernommen) und Erwartungswert
bleiben unverändert. Der QA-Agent für F-16 setzt das um.

**Drei Testfehler in `e2e/F-22-responsiv.spec.ts` (11.09.).** Der Feature-Agent für F-22 hat drei
Zusicherungen als fehlerhaft gemeldet, ohne sie zu ändern. Geprüft und bestätigt, kein
Quellwiderspruch, sondern jeweils ein Versehen im Test selbst:

1. Test „führt bei …px Anlegen → Beziehung → Export vollständig durch…": `createFeature()` setzt
   nur den Anzeigenamen, `FeatureModal.svelte` befüllt Nutzen/Aufwand dabei mit dem Fibonacci-
   Startwert (beide Felder 1). Feature A und Feature B erhalten damit identische Lotungswerte,
   landen laut F-09-Jitter in derselben Gruppe und ihre deterministischen Ankerpunkte liegen für
   genau diese Kennungen unter einem Bildschirmpixel auseinander — die Rechtsklicks im
   Kontextmenü-Ablauf treffen dieselbe Signatur. Jeder andere E2E-Test mit mehreren Features
   (z. B. `e2e/F-16-verbindungsvorgang.spec.ts` Zeile 118 f.) vergibt bewusst unterschiedliche
   Werte, dieser nicht. Freigegeben: Feature A und B im Kernablauf-Test mit unterschiedlichem
   Nutzen/Aufwand anlegen (Prüfabsicht unverändert).
2. Derselbe Test, `expect(exportText).toContain('requires')`: PRD 4.2 (Zeilen 141, 153–155)
   bildet die Beziehungsart „benötigt" im DSL-Text ausschließlich als Pfeil `-->` ab, das Wort
   „requires" kommt im Export nie vor. Freigegeben: Zusicherung auf den Pfeil `-->` umstellen.
3. Test „Bearbeiten, Löschen und Importieren bei 375 px": der eingegebene Importtext
   `'feature neu impact=8 effort=13\n'` ist kein gültiges Dokument nach PRD 4.2 — es fehlt die
   Kopfzeile `featuremap v1`, und `feature_def` verlangt `identifier [label] :: attributes`, nicht
   zwei durch Leerzeichen getrennte Wörter. Der Parser weist das Dokument zu Recht ab. Freigegeben:
   Importtext durch ein gültiges Dokument ersetzen, das dieselbe Prüfabsicht (Feature „neu" mit
   Nutzen 8/Aufwand 13 entsteht durch Import) erfüllt, z. B. `'featuremap v1\nneu :: impact=8,
   effort=13\n'`.

Der QA-Agent für F-22 setzt alle drei Korrekturen mechanisch um (keine neue Prüfabsicht) und
prüft danach die volle Suite erneut.

**Transparenter Hintergrund im PNG-Export, F-21 vs. F-20 (10.09.).** `features/F-21-export-png.md`,
Abschnitt „Ablauf" Schritt 4, nennt für die Option „transparent" nur, dass die Vorab-Füllung des
Canvas entfällt. `buildExportSvg()` aus F-20 (Abschnitt „Ablauf" Schritt 7) zeichnet aber immer ein
deckendes Hintergrundrechteck in Tafelfarbe in das SVG selbst — wortgleich genommen bliebe das PNG
bei „transparent" trotzdem undurchsichtig, weil das gerasterte SVG das Rechteck mitbringt. F-21s
eigenes Akzeptanzkriterium ist dagegen eindeutig: „mit gesetzter Option ist er durchsichtig".
Maßgeblich ist das Akzeptanzkriterium, nicht der Ablauftext — Akzeptanzkriterien sind die
geprüfte, verbindliche Vertragsseite einer Featurebeschreibung, der Ablaufabschnitt daneben nur
eine unvollständige Skizze, die die SVG-Wiederverwendung aus F-20 schlicht nicht mitgedacht hat.
Festgelegt: Der PNG-Export muss bei „transparent" tatsächlich durchsichtig rastern (Alpha 0 am
Bildrand, wie vom Test-Agenten für F-21 geprüft). Wie das erreicht wird — etwa ein Options-Flag an
`buildExportSvg()`, das das Hintergrundrechteck wegläßt — ist Sache des Feature-Agenten; das ist
kein Lösungsweg, den der Orchestrator vorgibt, sondern eine Klarstellung, welche der beiden Quellen
bei einem echten Widerspruch gilt.

**PRD 1.1 — drei Erweiterungen aus Nutzergespräch (11.09.).** Der Nutzer hat direkt drei
Änderungen benannt: Ausblenden statt Abdunkeln bei Selektion, Datenzoom statt Bildskalierung
beim Zoomen, freier Schätzmodus als Alternative zu Fibonacci. Per Rückfrage geklärt: Dimming
bleibt als Standard erhalten, Ausblenden ist ein zusätzlicher Umschalter (nicht ersetzend);
Zoom wird als echter Datenzoom umgesetzt (Achsen berechnen sich neu, Punkt-/Schriftgrößen
bleiben bildschirmkonstant, damit entfällt die bisherige Mindestschriftgröße aus F-12); der
Schätzmodus ist eine App-Einstellung wie die Tafel (nicht Teil der Karte/des DSL-Exports) und
schaltet bei Import eines Fibonacci-fremden Werts automatisch auf Frei um; ein Wertebereich
gilt gemeinsam für Nutzen und Aufwand, Standard 0–100. Ohne Rückfrage entschieden (technische
Details ohne fachliche Tragweite): Teilstriche werden im gezoomten Zustand und im freien
Schätzmodus generisch als runde, gleichmäßig verteilte Werte erzeugt statt der Fibonacci-Reihe
(die wäre in einem beliebigen Fenster zu lückenhaft); ein Wert außerhalb des eingestellten
freien Bereichs wird wie ein Fibonacci-fremder Wert behandelt (erhalten, gekennzeichnet), statt
den Bereich automatisch zu erweitern; Einstellungen und der neue Sichtbarkeits-Umschalter
hängen am bestehenden Menü **Ansicht ▾** statt einer neuen Symbolleisten-Schaltfläche. Ergebnis:
PRD auf Version 1.1, drei neue Feature-Dateien F-24 bis F-26 (siehe Abhängigkeitstabelle in
`features/README.md`). F-25 und F-26 teilen sich `src/lib/layout/scales.ts` und laufen deshalb
nacheinander.

**Testfehler in `e2e/F-24-hervorhebung-sichtbarkeit.spec.ts` (11.09.).** Der Feature-Agent für
F-24 hat eine Zusicherung als fehlerhaft gemeldet, ohne sie zu ändern. Geprüft und bestätigt,
kein Quellwiderspruch, sondern ein Versehen im Test selbst: Test „macht ausgeblendete Elemente
weder klickbar noch per Tab erreichbar" klickt an die vormalige Bildschirmposition der
Trefferfläche des jetzt ausgeblendeten Features X und erwartet danach zusätzlich zu „kein Halo
für X", dass die Selektion von A unverändert bleibt (`feature-halo-a` weiterhin sichtbar). PRD
5.6 verlangt für ein ausgeblendetes Element aber ausdrücklich „keine Trefferfläche" — der Klick
trifft an dieser Stelle also zwangsläufig freie Fläche (Gitter/Hintergrund), und FR-46 legt
bindend fest: „Die Selektion wird durch Klick auf freie Fläche … aufgehoben." Die zusätzliche
Zusicherung verlangt damit einen Verstoß gegen FR-46. Freigegeben: Die Zusicherung wird auf das
durch FR-46 tatsächlich verlangte Verhalten umgestellt — der Klick löscht die Selektion von A
(`feature-halo-a` danach nicht mehr sichtbar, ebenso weiterhin kein Halo für X). Die eigentliche
Prüfabsicht des Tests (X ist nicht anklickbar) bleibt unverändert. Der QA-Agent für F-24 setzt
das um.

**F-25 ersetzt die Skalen-Signatur und die gesamte F-12-Zoom-Mechanik — Testfolgen freigegeben
(11.09.).** `features/F-25-datenzoom.md` legt ausdrücklich fest, dass `xOf`/`yOf`/`ticksOf` aus
F-08 künftig ein Fenster (`windowMin`, `windowMax`) statt eines festen `domainMax` annehmen, und
dass F-25 „die Struktur aus F-12 vollständig ersetzt". Das ist keine vom Test-Agenten gefundene
Testschwäche, sondern eine in der Featurebeschreibung selbst angelegte, bewusste Ablösung —
analog zur bereits am 05.09. entschiedenen Verengung der Kennungsprüfung aus F-02 im Rahmen von
F-05. Der Test-Agent für F-25 hat gemeldet, dass dadurch zwangsläufig rot werden: alle Aufrufer
der alten Zweiparameter-Signatur (`src/lib/layout/scales.test.ts`, Block `regionRects`, aus F-08;
`src/lib/layout/jitter.test.ts`, aus F-09, weil `placeFeatures()` intern `xOf`/`yOf` aufruft) sowie
die komplette alte F-12-Zoom/Pan-Testfläche (`src/lib/store/viewport.test.ts`,
`e2e/F-12-zoom-pan.spec.ts`), deren API mit `viewport.ts` vollständig entfällt. Freigegeben für
den Feature-Agenten:

1. `src/lib/layout/scales.test.ts` (Block `regionRects`) und `src/lib/layout/jitter.test.ts`:
   Aufrufe auf die neue Fenster-Signatur umstellen (rein mechanisch, z. B.
   `xOf(wert, 0, domainMax)` für den bisherigen Vollansicht-Fall) — geprüfte Werte und
   Invarianten bleiben unverändert.
2. `src/lib/store/viewport.test.ts` und `e2e/F-12-zoom-pan.spec.ts`: werden gelöscht, nicht
   nachgebildet. Die neu vorgelegten `src/lib/store/viewport.datenzoom.test.ts` (14 Fälle) und
   `e2e/F-25-datenzoom.spec.ts` (18 Fälle, je F-25-AK mindestens ein Test) sind die alleinige,
   bereits vollständige Testabdeckung der jetzt einzigen Zoom/Pan-Mechanik. Ein Akzeptanzkriterium
   aus F-12 existiert nach der Ablösung nicht mehr eigenständig fort (die alte Bildskalierung ist
   per Featurebeschreibung nicht mehr Teil des Systems).

Alle übrigen Aufrufstellen von `viewport.ts` (`MapCanvas.svelte`, `FeatureNodes.svelte`,
`ContextMenu.svelte`, `FeatureList.svelte`, `ImportDialog.svelte`, `+page.svelte`, `hitArea.ts`)
sind auf die neue API umzustellen — das ist reguläre Umsetzungsarbeit des Feature-Agenten, keine
Testfrage.

**Zwei Testfehler durch F-25 aufgedeckt (11.09.).** Der Feature-Agent für F-25 hat zwei
Zusicherungen als fehlerhaft gemeldet, ohne sie zu ändern. Beide geprüft und bestätigt, kein
Quellwiderspruch:

1. `e2e/F-14-verzeichnis.spec.ts`, Test „selektiert und zentriert das Feature nach Klick auf
   einen Eintrag" (FR-54): vergleicht den Bildschirmmittelpunkt der Feature-Signatur mit dem
   Mittelpunkt der Bounding Box des gesamten `role="img"`-Elements „Streudiagramm" — das ist die
   volle `VIEWBOX` (1000×700, Mitte 500/350 laut F-08), nicht die `PLOT`-Fläche
   (80–960 × 40–620, Mitte 520/330). Beide Ränder von `PLOT` zu `VIEWBOX` sind zudem asymmetrisch
   (links 80/rechts 40, oben 40/unten 80) — die volle Bounding Box war nie ein sinnvoller
   Bezugspunkt für „die Mitte". PRD FR-54 verlangt „zentriert im Viewport", die Featurebeschreibung
   „in die Mitte des Ausschnitts" — der Ausschnitt ist laut F-25 exakt das per `xOf`/`yOf` auf
   `PLOT` abgebildete sichtbare Fenster. Unter dem alten, durch F-25 abgelösten Bildtransformations-
   Zoom aus F-12 fiel der Unterschied offenbar nicht auf; mit F-25s direkter Fenster-auf-PLOT-
   Abbildung schlägt die Zusicherung jetzt zuverlässig fehl. Freigegeben: Der Test vergleicht
   künftig gegen die Bounding Box der Plotfläche (`.frame`, umschließt laut F-08 die Plotfläche)
   statt der vollen Kartenfläche. Prüfabsicht (Feature landet nach Zentrierung nahe der Mitte des
   sichtbaren Ausschnitts) und Toleranz bleiben unverändert.
2. `e2e/F-25-datenzoom.spec.ts`, Test „hält Punktradius und Schriftgröße … bildschirmkonstant":
   die erste Messung erfolgt unmittelbar nach `page.goto('/')`, bevor die über Google Fonts
   geladene Schrift „Karla" eingetauscht ist (`display=swap`), wodurch kurzzeitig eine
   Ausweichschrift mit abweichenden Glyphenmaßen gemessen wird; die zweite Messung nach den
   Zoom-Interaktionen greift bereits die echte Schrift. Kein Zoom-Fehler, sondern ein fehlendes
   Warten auf den Schriftartenload in der Testinfrastruktur. Freigegeben: vor der ersten Messung
   `await page.waitForFunction(() => document.fonts.status === 'loaded')` (oder gleichwertig)
   einfügen. Prüfabsicht (Punktgröße bleibt bildschirmkonstant) bleibt unverändert.

Der QA-Agent für F-25 setzt beide Korrekturen mechanisch um (keine neue Prüfabsicht) und prüft
danach die volle Suite erneut.

**Barrierefreier Kontrakt des Einstellungsdialogs, F-26 (11.09.).** Weder `features/F-26-schaetzmodus.md`
noch `design/03-seekarte.html` legen die Rolle/Beschriftung des Einstellungsdialogs pixelgenau
fest (wie schon bei F-13s Bearbeiten-Knopf und F-18/F-16s Vorschau-/Beziehungsdialogen laut
`design/README.md` vermerkt). Der Test-Agent für F-26 hat einen Kontrakt entworfen und dagegen
getestet. Festgelegt, analog zum F-13-Präzedenzfall: Menüpfad **Ansicht ▾ → Einstellungen**
(PRD 6.1), Dialog mit Namen *Einstellungen*, darin eine Gruppe *Schätzmodus* mit den Knöpfen
*Fibonacci*/*Frei* (gleiche Bauart wie die Umschalter aus F-11/F-24), bei „Frei" Textfelder mit
den Beschriftungen *Minimum*/*Maximum* sowie Zahlenfelder *Nutzen*/*Aufwand* im Formular
(`getByRole('spinbutton', { name: 'Nutzen' | 'Aufwand' })`), als Kartusche über die Token aus
`app.css` wie das Feature-Formular aus F-13. Feature- und QA-Agent bauen/prüfen gegen diesen
Kontrakt.

**Drei Testfehler in `e2e/F-26-schaetzmodus.spec.ts` (11.09.).** Der Feature-Agent für F-26 hat
drei Zusicherungen als fehlerhaft gemeldet, ohne sie zu ändern. Alle drei geprüft und bestätigt,
kein Quellwiderspruch, sondern jeweils ein Versehen im Test selbst:

1. Zeile 183 („Kernablauf") und Zeile 218 („…übernimmt einen Wert innerhalb 0–100") lesen
   `localStorage` unmittelbar nach Klick auf „Speichern", ohne die aus F-04 bekannte
   400-ms-Schreibverzögerung (`DEBOUNCE_MS`, `src/lib/store/persistence.ts`) abzuwarten —
   dasselbe, bereits mehrfach aufgetretene Muster (siehe Entscheidung „Debounce-Race im
   Löschtest von F-15", 06.09.). `e2e/F-18-import.spec.ts` löst dieselbe Situation bereits über
   `expect.poll(...)`. Freigegeben: beide Stellen auf `expect.poll` mit einer Zeitspanne größer
   als 400 ms umstellen, Prüfabsicht und Erwartungswerte unverändert.
2. Zeile 265 importiert die Kennung `Abweichend` (großgeschrieben), öffnet das Bearbeiten-Formular
   aber über `openEditModal(page, 'abweichend')` (kleingeschrieben). Der DSL-Tokenizer
   (`src/lib/dsl/tokenizer.ts`, `WORD_CHAR = /[A-Za-z0-9_-]/`) unterscheidet Groß-/Kleinschreibung
   und normalisiert nicht — die Kennung bleibt `Abweichend`, `feature-node-abweichend` existiert
   nie. Freigegeben: beide Stellen auf dieselbe Schreibweise bringen (z. B. Kennung im
   Importtext klein schreiben, wie im übrigen Testbestand üblich).
3. Zeile 286 verwendet die Kennung `Unverändert`, die mit „ä" ein nach PRD 4.2/`WORD_CHAR`
   (ASCII `[A-Za-z0-9_-]`) unzulässiges Zeichen enthält — bindend bereits mit der
   Kennung-Zeichensatz-Entscheidung vom 05.09. festgelegt. Der Parser weist das Dokument ab,
   „Übernehmen" bleibt dauerhaft deaktiviert. Freigegeben: Kennung durch eine zulässige ASCII-Form
   ersetzen (z. B. `Unveraendert`), Prüfabsicht (Feature ohne abweichenden Wert löst keinen
   Moduswechsel aus) unverändert.

Der QA-Agent für F-26 setzt alle drei Korrekturen mechanisch um (keine neue Prüfabsicht) und
prüft danach die volle Suite erneut.

**Nachtrag (11.09.):** Korrektur 3 oben schlug `Unveraendert` (großes U) als Ersatz vor, der
bestehende Selektor in Zeile ~296 lautet aber `openEditModal(page, 'unveraendert')`
(kleingeschrieben) — vor der Korrektur unsichtbar, weil das Dokument wegen „ä" ohnehin nie
geparst wurde. Gleiche Art von Versehen wie Korrektur 2. Freigegeben: Kennung im Importtext auf
`unveraendert` (klein) setzen, passend zum bestehenden Selektor. Prüfabsicht unverändert.

## Sessionprotokoll

Je Session eine Zeile: Datum, geweckt oder manuell gestartet, was erledigt wurde, womit die
nächste Session anfängt.

| Datum | Start | Erledigt | Nächster Schritt |
|---|---|---|---|
| 04.–05.09. | manuell | Ausgangslage committet, Weckzyklus gestartet, F-01 durch Tests, Umsetzung, QA und Merge gebracht (2 QA-Befunde behoben: fehlende CSP, Kopfband-Anordnung unter 768 px). | F-02 durch Tests, Umsetzung und QA bringen. |
| 05.09. | manuell | F-02, F-03 und F-04 fertiggestellt und gemergt. Eine Teständerung in F-04 freigegeben, ein Quellenwiderspruch zum Kennung-Zeichensatz entschieden. | F-05 durch Tests, Umsetzung und QA bringen; dabei die Kennungsprüfung aus F-02 verengen. |
| 06.09. (Fortsetzung, geweckt 20:47) | geweckt | F-14 und F-15 vollständig durch Umsetzung, QA und Merge nach main gebracht (F-15-QA behob zusätzlich eine Typografie-Abweichung in der Kartusche). Rebase-Konflikt zwischen beiden Features in src/routes/+page.svelte aufgelöst (Verzeichnis-Panel und Detail-Kartusche bestehen nebeneinander). Gesamtsuite auf main: 427/427 Unit-, 141/141 E2E-Tests grün. | F-16 (Kontextmenü und Verbindungsvorgang) durch Tests, Umsetzung und QA bringen; dabei den nachzuholenden Test für Escape (FR-13) aus der F-16-Anmerkung berücksichtigen. |
| 07.09. (Fortsetzung, geweckt 01:47) | geweckt | F-16 fertiggestellt (ein Ratenlimit-Abbruch mittendrin, von frischem Feature-Agent fortgesetzt) und nach QA (ein Testbefund behoben: fehlender Hover vor Labelprüfung, FR-45) nach main gemergt. Ein interner Widerspruch im F-16-Dokument selbst entschieden (Zyklus-Warnung AK-08 gehört zu F-23). F-17 vollständig durch Tests, Umsetzung, QA (INT-04-Prüfung auf eine Stelle konsolidiert) und Merge gebracht. Gesamtsuite auf main: 438/438 Unit-, 180/180 E2E-Tests grün (ein vorbestehender F-12-Performance-Test bleibt unter voller Parallelisierung gelegentlich flaky, unabhängig von jedem Feature — mit --workers=1 zuverlässig grün). | F-18 (Import-Dialog) durch Tests, Umsetzung und QA bringen. |
| 11.09. | manuell | Angetroffen: F-22 stand „in Arbeit" mit rot committeten Tests (c23b468) und einem unfertigen, nicht committeten Umsetzungsversuch in einem verwaisten Worktree. Frischer Feature-Agent hat diesen Stand geprüft und das Feature fertiggestellt (523/523 Unit grün). Der Feature-Agent meldete drei fehlerhafte Zusicherungen in `e2e/F-22-responsiv.spec.ts` (Jitter-Kollision durch gleiche Lotungswerte, Wortsuche „requires" statt Pfeil `-->`, ungültiges DSL-Importdokument) — geprüft, bestätigt (kein Quellwiderspruch), freigegeben und vom QA-Agenten mechanisch korrigiert. QA-Agent fand und behob zusätzlich zwei echte Abweichungen (UI-17: Kopfband unter 768 px zeigte Wortlaut statt Icons; UI-16: 44×44-px-Mindestgröße galt nicht für alle Bedienelemente). Gesamtsuite nach Rebase auf main: 523/523 Unit-, 258/258 E2E-Tests grün. F-22 nach main gemergt. **Damit sind alle 23 Features (F-01–F-23) fertig — der MVP ist laut `features/README.md` vollständig.** | Kein offenes Feature mehr. Nächste Session: Gesamtsuite auf main gegenprüfen, ggf. Nutzer nach weiterem Umfang fragen, sonst Weckzyklus beenden. |
| 11.09. (Fortsetzung, manuell) | manuell | Nutzer wollte weiteren Umfang: iterativ befragt zu drei Änderungswünschen (Ausblenden statt Abdunkeln bei Selektion, Datenzoom statt Bildskalierung, freier Schätzmodus neben Fibonacci). PRD auf Version 1.1 gehoben (FR-08, FR-09, FR-43 geändert, FR-47, FR-76 neu, FR-25/FR-26 geändert, AK-17 bis AK-19, Datenzoom-Formel in 7.3, Änderungshistorie in 1.5). Drei neue Feature-Dateien angelegt: F-24 (Hervorhebung Abdunkeln/Ausblenden), F-25 (Datenzoom, ersetzt F-12-Mechanik), F-26 (Schätzmodus Fibonacci/Frei, hängt an F-25 wegen gemeinsamer scales.ts). `features/README.md` um Abhängigkeitszeilen und Sprachtabelle ergänzt. Noch **kein** Test-Agent gestartet — wartet auf Rückmeldung des Nutzers zu den Entwürfen. | Nutzerfreigabe der drei neuen Feature-Dateien einholen, dann F-24 als ersten Branch (unabhängig von F-25/F-26) durch Tests, Umsetzung und QA bringen; F-25 vor F-26, da beide `scales.ts` teilen. |
