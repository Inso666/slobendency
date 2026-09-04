# Designvorschläge — Feature Impact/Effort Map

Drei visuelle Richtungen für die in `PRD.md` beschriebene Anwendung. Jede Datei ist ein
statisches HTML-Mockup ohne JavaScript und lässt sich direkt im Browser öffnen:

| Datei | Richtung |
|---|---|
| `01-plotter.html` | Messinstrument — Zeichenfolie, Plotterstifte, Ablesekreuz |
| `02-werkbank.html` | Werkbank — dunkle Oberfläche, Map und DSL-Quelltext nebeneinander |
| `03-seekarte.html` | Seekarte — getönte Reviere, Kartuschen, kartografische Beschriftung |

Alle drei zeigen denselben Zustand, damit sie vergleichbar sind: 14 Features, 9 Beziehungen,
das Feature *Rollen & Rechte* ist selektiert, seine `requires`-Kette ist transitiv
hervorgehoben (`Rollen & Rechte → Single Sign-On → Benutzer-Login`, AK-06), direkte
`relates`- und `excludes`-Nachbarn sind hervorgehoben, alles Übrige ist abgedunkelt (FR-43).
Zwei Features teilen sich das Wertepaar 3/2 und demonstrieren den deterministischen Jitter
inklusive Ankerkreuz (FR-30 bis FR-33).

## Gemeinsame Festlegungen

Diese Entscheidungen sind aus der Fachlichkeit abgeleitet und in allen drei Entwürfen gleich:

- **Fibonacci-Raster.** Gitterlinien und Achsenteilung liegen auf 1, 2, 3, 5, 8, 13, 21 —
  also genau auf den Werten, die das Formular anbietet (FR-02). Die Skala bleibt linear, das
  Raster wird dadurch ungleichmäßig weiter. Es zeigt, wo Schätzungen überhaupt liegen können,
  statt nur Fläche zu dekorieren.
- **Beziehungstypen über Form, nicht über Farbe.** Durchgezogen mit Pfeilspitze = benötigt,
  gestrichelt = hängt zusammen, `x`-Endmarkierung plus durchgestrichener Kreis = schließt aus.
  Die Vorbedingung erhält zusätzlich einen umschließenden Ring. Farbe verstärkt nur (5.6,
  Hinweis zur Zugänglichkeit).
- **Kantenlabels nur an der Selektion** (FR-45), Beschriftungen mit Freistellungskontur,
  damit sie über Linien lesbar bleiben.
- **Statuszeile** mit Speicherzustand, Bestandsgröße und Zyklus-Hinweis (FR-70, INT-05).

## 01 — Plotter

**Haltung.** Die Map ist ein gezeichnetes Blatt, kein Dashboard-Widget. Die Oberfläche
borgt sich das Vokabular des Reißbretts und des Stiftplotters: Zeichenfolie als Untergrund,
Passermarken in den Blattecken, Teilstriche an den Achsen.

**Farbe.** Kühles Foliengrün (`#D6DED8` / `#EDF1EA`), Tiefschwarz-Grün als Tinte, dazu drei
echte Plotterstift-Farben: Magenta `#C10E6B` (benötigt), Cyan `#00768F` (hängt zusammen),
Orange `#CC5115` (schließt aus, Warnung).

**Typografie.** Archivo für Marken- und Rubrikensatz (eng, versal, technisch), Public Sans
für Fließtext, Spline Sans Mono für IDs, Werte und Koordinaten. Zahlen laufen konsequent
tabellarisch.

**Layout.** Instrumentenleiste oben, Featureliste als Schublade links über dem Blatt,
Ablesefenster rechts, Zeichenerklärung als gedruckte Legende am Blattfuß.

**Signatur.** Das **Ablesekreuz**: Die Selektion projiziert ihre Werte über gestrichelte
Hilfslinien auf beide Achsen, wo sie in einem schwarzen Kästchen abgelesen werden. Beim Laden
zeichnen sich die Kanten wie unter einem Plotterstift auf (respektiert `prefers-reduced-motion`).

**Passt, wenn** das Werkzeug im Workshop projiziert wird und das Ergebnis wie ein
verbindliches Dokument wirken soll. Der Bildexport (FR-63/64) fällt hier von selbst richtig aus,
weil der Bildschirm bereits wie ein Ausdruck aussieht.

**Risiko.** Die Zurückhaltung braucht Präzision; unsauberer Weißraum fällt sofort auf.

## 02 — Werkbank

**Haltung.** Die DSL ist kein Exportformat im Dialog, sondern die zweite Ansicht auf dieselben
Daten. Der Quelltext steht dauerhaft rechts neben der Map; Selektion und Textstelle zeigen
aufeinander. Das ist die einzige Richtung mit einer inhaltlichen These über den Aufbau, nicht
nur über die Optik.

**Farbe.** Dunkles Teal-Schiefer (`#0E1618` / `#141F21`) statt Schwarz, helle Schrift, und drei
gleichrangige Akzente statt eines Signalfarbtons: Bernstein `#F0B23C`, Blau `#5FB6D9`,
Koralle `#E4695E`. Dieselben drei Farben färben Map-Kanten und Pfeil-Syntax im Editor — eine
Farbsprache für beide Ansichten.

**Typografie.** Bricolage Grotesque für Titel und Kennzahlen, Instrument Sans für die
Oberfläche, JetBrains Mono für den Quelltext.

**Layout.** Schmale Kopfzeile, Map links, Werkbank rechts (Reiter *Quelltext* / *Features*,
darunter der Inspektor zum selektierten Feature). Unter 860 px wird die Werkbank zum
Bottom Sheet (UI-11).

**Signatur.** Die **beidseitige Kopplung**: Die zum selektierten Feature gehörenden Zeilen
sind im Editor markiert und mit Randmarke versehen; der Inspektor nennt die Zeilennummer.
Wer die Syntax einmal gelesen hat, kann sie tippen — Import und Export sind damit kein
Sonderweg mehr.

**Passt, wenn** die Zielgruppe technisch nah an der Entwicklung arbeitet und Maps häufig
per Chat geteilt und von Hand editiert werden.

**Risiko.** Die Map verliert rund ein Drittel Breite. Bei 100 Features (NFR-01) wird es links
enger als in den anderen beiden Entwürfen; die Werkbank sollte einklappbar sein.

## 03 — Seekarte

**Haltung.** Das Wort *Map* wörtlich genommen. Die vier Quadranten sind keine beschrifteten
Rechtecke, sondern Reviere mit eigener Tönung, durch die ein Kurs läuft.

**Farbe.** Kartenpapier `#FAFAF6`, Flachwasser-Ton für Quick Wins, Tiefwasser-Ton für Große
Vorhaben, neutraler Ton für Nebenbei, Sandton mit Schraffur für Vermeiden. Magenta `#B01777`
ist — wie in echten Seekarten — der Warnfarbton und markiert `excludes` und Zyklen.

**Typografie.** Fraunces für Titel und die weit gesperrten kursiven Revier-Namen (die
Konvention für Gewässernamen in Karten), Karla für die Oberfläche, Azeret Mono für die
Wertepaare, die wie Lotungen unter den Feature-Namen stehen.

**Layout.** Doppellinie oben und unten, Verzeichnis links mit Punktführung und nach Revieren
gruppiert (statt reiner Alphabetliste), Zeichenerklärung und Detailansicht als gerahmte
Kartuschen über der Karte.

**Signatur.** Die **Reviere plus Kartusche**: Der Quadrant ist Ort, nicht Etikett. Das
Detailfenster nennt deshalb auch das Revier des Features, und die Beziehungen heißen
*Geht aus von hier* und *Führt hierher*.

**Tag- und Nachttafel.** Der Schalter *Tafel: Tag / Nacht* im Kopfband wechselt die
Farbtafel — wie an einem Kartendisplay, das nachts auf eine gedämpfte Tafel umschaltet.
Die Nachttafel dreht die Rollen um, statt Farben zu invertieren: tiefes Blauschwarz als
Papier, helle Signaturen, Reviertöne auf ein Zehntel ihrer Sättigung zurückgenommen,
Magenta aufgehellt, damit die Warnfunktion auf dunklem Grund bestehen bleibt. Beide Tafeln
laufen über denselben Satz Farbtoken (`--paper`, `--ink`, `--shallow` …); die Umschaltung
setzt nur `data-theme` am Wurzelelement. Standard ist Tag, unabhängig von der
Systemeinstellung — eine Kopplung an `prefers-color-scheme` wäre eine Media Query.

**Passt, wenn** die Map vor allem Gesprächsgrundlage mit Stakeholdern ist. Die Tönung
beantwortet „wo stehen wir?" ohne Legende.

**Risiko.** Vier Flächentöne plus Schraffur sind das lauteste der drei Systeme. Wird die
Map dicht, muss die Tönung zurückgenommen werden.

## Offen, unabhängig von der Richtung

- Dark Mode ist laut PRD zurückgestellt (Abschnitt 11.3). Entwurf 03 hat ihn als Tag-/
  Nachttafel bereits, Entwurf 02 ist von Haus aus dunkel und bräuchte eine helle Variante,
  Entwurf 01 umgekehrt.
- Für Entwurf 03 offen: Der Bildexport (FR-63/64) soll vermutlich immer die Tagtafel
  ausgeben, auch wenn am Bildschirm die Nachttafel läuft — sonst kommen dunkle PNGs in
  Präsentationen an.
- Die Mockups zeigen nur den Hauptbildschirm. Modal (FR-01), Kontextmenü (FR-10) und
  Import-Vorschau (FR-61) sind noch zu entwerfen; die Bausteine dafür — Rahmen, Kartusche,
  Panel — stehen in allen drei Richtungen bereits fest.
- Die Mockups sind statisch. Zoom, Pan und Hover-Zustände sind nicht abgebildet.
