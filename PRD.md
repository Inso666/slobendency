# Fachspezifikation: Feature Impact/Effort Map

**Dokumenttyp:** Requirements Engineering Document
**Version:** 1.1
**Datum:** 11.09.2026
**Status:** Entwicklungsbereit (Post-MVP-Erweiterung)

---

## 1. Überblick

### 1.1 Produktvision

Eine reine Client-Webanwendung, mit der Product Owner und vergleichbare Rollen Features nach **Impact** (Nutzen) und **Effort** (Aufwand/Komplexität) bewerten und in einem Streudiagramm visualisieren. Ergänzend lassen sich **gerichtete Beziehungen** zwischen Features definieren, um Umsetzungsreihenfolgen und Konflikte sichtbar zu machen.

### 1.2 Kernproblem

Priorisierungsdiskussionen finden heute in Tabellen oder auf Whiteboards statt. Beides zeigt entweder die Bewertung *oder* die Abhängigkeiten, nie beides zugleich. Ergebnisse sind zudem schwer teilbar und nicht wiederverwendbar.

### 1.3 Zielgruppe

- **Primär:** Product Owner, Product Manager
- **Sekundär:** Tech Leads, Projektleitung, Stakeholder in Priorisierungsworkshops

### 1.4 Abgrenzung (Nicht-Ziele des MVP)

Ausdrücklich **nicht** Bestandteil dieser Version:

- Kein Backend, keine Serverpersistenz, kein Login, keine Benutzerkonten
- Keine Mehrbenutzer-Kollaboration, keine aggregierte Schätzung (Planning Poker)
- Keine vollständige Roadmap-/Sprint-Planung, keine Termine, keine Kapazitäten
- Keine Verwaltung mehrerer Maps nebeneinander (nur eine aktive Map)
- Kein Import aus Jira/Azure DevOps o. ä.

### 1.5 Änderungshistorie

| Version | Datum | Änderung |
|---|---|---|
| 1.0 | 04.09.2026 | Erste vollständige Fachspezifikation, MVP (F-01–F-23) |
| 1.1 | 11.09.2026 | Nicht beteiligte Elemente bei Selektion umschaltbar vollständig ausblendbar statt nur abgedunkelt (FR-47); Zoom als Datenzoom mit live neu berechneten Achsen statt Bildskalierung (FR-25 geändert); freier Schätzmodus mit zentral konfigurierbarem Wertebereich als Alternative zu Fibonacci (FR-08, FR-09, FR-76) |

---

## 2. Systemkontext

```
┌──────────────────────────────────────────────┐
│              Browser (Client)                │
│                                              │
│  ┌────────────┐   ┌─────────┐   ┌─────────┐  │
│  │  Formular  │──▶│  Store  │──▶│   Map   │  │
│  │  / Liste   │◀──│ (State) │   │  (SVG)  │  │
│  └────────────┘   └────┬────┘   └────┬────┘  │
│                        │             │       │
│                   ┌────▼─────┐  ┌────▼─────┐ │
│                   │LocalStore│  │  Export  │ │
│                   │  (Auto)  │  │SVG / PNG │ │
│                   └──────────┘  └──────────┘ │
│                        ▲                     │
│                   ┌────┴─────┐               │
│                   │ DSL      │               │
│                   │Import/Exp│               │
│                   └──────────┘               │
└──────────────────────────────────────────────┘
```

Die Anwendung ist vollständig autark. Der einzige Austauschkanal nach außen ist die textuelle DSL (Copy-Paste, Datei) sowie der Bildexport.

---

## 3. Datenmodell

### 3.1 Entitäten

#### Feature

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `id` | string | ja | Eindeutiger technischer Bezeichner. Zeichensatz: `[A-Za-z0-9_-]+`. Case-sensitiv. Dient als Referenz in Beziehungen. |
| `label` | string | nein | Anzeigename. Fehlt er, wird `id` angezeigt. Beliebige Zeichen inkl. Leerzeichen. |
| `impact` | integer | ja | Nutzen. Wertebereich ≥ 0. |
| `effort` | integer | ja | Aufwand. Wertebereich ≥ 0. |

#### Relation

| Feld | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `from` | string (Feature.id) | ja | Quelle der gerichteten Beziehung |
| `to` | string (Feature.id) | ja | Ziel der gerichteten Beziehung |
| `type` | enum | ja | `requires` \| `relates` \| `excludes` |
| `label` | string | nein | Freitext zur Beschriftung der Kante |

#### Map (Wurzelobjekt)

| Feld | Typ | Beschreibung |
|---|---|---|
| `schemaVersion` | integer | Aktuell `1` |
| `features` | Feature[] | Liste aller Features |
| `relations` | Relation[] | Liste aller Beziehungen |

### 3.2 Beziehungstypen – Semantik

| Typ | Bedeutung | Transitive Auflösung |
|---|---|---|
| `requires` | *„from benötigt to"* – `to` muss vor `from` umgesetzt werden | **Ja**, über beliebig viele Stufen |
| `relates` | *„hängt lose zusammen mit"* – inhaltliche Nähe ohne Reihenfolgeaussage | Nein, nur direkte Nachbarn |
| `excludes` | *„schließt aus"* – die Features sind nicht gemeinsam umsetzbar | Nein, nur direkte Nachbarn |

**Begründung der Einschränkung:** Nur `requires` bildet eine transitive Ordnung ab. Würden `relates` und `excludes` mitverfolgt, entstünden fachlich falsche Verkettungen (A benötigt B, B hängt lose mit C zusammen, C schließt D aus → D würde fälschlich als relevant für A markiert).

### 3.3 Integritätsregeln

| ID | Regel | Verhalten bei Verletzung |
|---|---|---|
| INT-01 | `Feature.id` ist mapweit eindeutig | Anlegen wird abgelehnt, Fehlermeldung im Formular; beim Import Fehler mit Zeilenangabe |
| INT-02 | `Relation.from` und `Relation.to` müssen auf existierende Features verweisen | Import: Fehler mit Zeilenangabe. Laufzeit: Löschen eines Features entfernt alle seine Beziehungen |
| INT-03 | `from ≠ to` (keine Selbstreferenz) | Anlegen wird abgelehnt |
| INT-04 | Kein identisches Tripel (`from`, `to`, `type`) doppelt | Anlegen wird abgelehnt („Beziehung existiert bereits") |
| INT-05 | `requires`-Kanten dürfen keinen Zyklus bilden | Beziehung wird **angelegt**, aber als Warnung markiert; betroffene Kanten werden in der Map gesondert hervorgehoben (siehe 5.6) |
| INT-06 | Umbenennen einer `id` zieht alle Referenzen in `relations` automatisch nach | Automatische Migration ohne Nutzerinteraktion |
| INT-07 | `impact` und `effort` sind nicht-negative Ganzzahlen | Import: Fehler. Formular: Auswahl nur aus zulässiger Liste |

---

## 4. Domain Specification Language (DSL)

### 4.1 Designziele

Menschenlesbar, per Chat/E-Mail teilbar, an Mermaid-Syntax angelehnt, von Hand editierbar.

### 4.2 Grammatik (EBNF)

```ebnf
document        = header , { line } ;
header          = "featuremap" , WS , "v" , integer , NEWLINE ;

line            = feature_def | relation_def | comment | empty_line ;

comment         = "%%" , { any_char } , NEWLINE ;
empty_line      = { WS } , NEWLINE ;

feature_def     = identifier , [ label ] , WS , "::" , WS , attributes , NEWLINE ;
label           = "[" , quoted_string , "]" ;
attributes      = attribute , { "," , WS , attribute } ;
attribute       = ( "impact" | "effort" ) , "=" , integer ;

relation_def    = identifier , WS , arrow , [ edge_label ] , WS , identifier , NEWLINE ;
arrow           = "-->" | "-.->" | "--x" ;
edge_label      = "|" , quoted_string , "|" ;

identifier      = ( letter | "_" ) , { letter | digit | "_" | "-" } ;
quoted_string   = '"' , { any_char_except_quote } , '"' ;
integer         = [ "-" ] , digit , { digit } ;
```

### 4.3 Pfeil-Mapping

| Syntax | `Relation.type` |
|---|---|
| `-->` | `requires` |
| `-.->` | `relates` |
| `--x` | `excludes` |

### 4.4 Beispieldokument

```
featuremap v1

%% Authentifizierung
Login["Benutzer-Login"]      :: impact=8, effort=3
SSO["Single Sign-On"]        :: impact=5, effort=13
LegacyAuth["Basic Auth"]     :: impact=2, effort=1
Export                       :: impact=3, effort=2

SSO -->|"nutzt Session"| Login
Export -.->|"teilt Formatierung"| Login
SSO --x|"inkompatibel"| LegacyAuth
```

### 4.5 Parser-Anforderungen

| ID | Anforderung |
|---|---|
| DSL-01 | Der Parser meldet Fehler **zeilengenau** mit Zeilennummer, Originalzeile und verständlicher Ursache |
| DSL-02 | Bei Fehlern wird der Import **vollständig abgebrochen**; der bestehende Datenbestand bleibt unverändert (Transaktionsprinzip) |
| DSL-03 | Alle Fehler eines Dokuments werden gesammelt und gemeinsam ausgegeben, nicht nur der erste |
| DSL-04 | `impact`/`effort` akzeptieren **jeden nicht-negativen Integer**, nicht nur Fibonacci-Werte |
| DSL-05 | Reihenfolge der Blöcke ist frei; Beziehungen dürfen vor der Feature-Definition stehen (Zwei-Pass-Parsing) |
| DSL-06 | Attributreihenfolge (`impact`/`effort`) ist frei; beide sind Pflicht |
| DSL-07 | Unbekannte `schemaVersion` (> 1) führt zu einer Warnung mit Abbruch, nicht zu einem stillen Fehlverhalten |
| DSL-08 | Whitespace zwischen Tokens ist beliebig; Einrückung ohne Bedeutung |

### 4.6 Serialisierung (Export)

| ID | Anforderung |
|---|---|
| DSL-10 | Ausgabe erfolgt in fester Struktur: Header, Leerzeile, Feature-Block, Leerzeile, Relations-Block |
| DSL-11 | Features werden alphabetisch nach `id` sortiert ausgegeben (deterministische, diff-freundliche Ausgabe) |
| DSL-12 | Attributspalten werden ausgerichtet, um die Lesbarkeit im Chat zu erhalten |
| DSL-13 | `label` wird nur ausgegeben, wenn es existiert und von `id` abweicht |
| DSL-14 | Round-Trip-Garantie: Export → Import → Export erzeugt byte-identischen Text |

---

## 5. Funktionale Anforderungen

### 5.1 Feature-Verwaltung

| ID | Anforderung | Priorität |
|---|---|---|
| FR-01 | Nutzer kann ein Feature über ein **modales Formular** anlegen (Felder: ID, Label, Impact, Effort) | MUSS |
| FR-02 | Impact und Effort werden im Formular ausschließlich als **Fibonacci-Werte** angeboten: 1, 2, 3, 5, 8, 13, 21 | MUSS |
| FR-03 | Enthält ein importiertes Feature einen Nicht-Fibonacci-Wert, bleibt dieser **unverändert erhalten**. Beim Öffnen des Formulars wird der Originalwert als zusätzliche, vorselektierte Option angeboten und visuell als abweichend gekennzeichnet. Ein stillschweigendes Runden ist unzulässig. | MUSS |
| FR-04 | Nutzer kann ein bestehendes Feature bearbeiten (gleiches Formular, vorbefüllt) | MUSS |
| FR-05 | Nutzer kann ein Feature löschen. Bestehen Beziehungen, erfolgt eine Rückfrage mit Anzahl der betroffenen Kanten | MUSS |
| FR-06 | Im Anlege-/Bearbeitungsformular können **direkt Beziehungen zu bereits bekannten Features** definiert werden (Auswahl Zielfeature + Typ + optionales Label) | MUSS |
| FR-07 | Die ID wird beim Anlegen aus dem Label vorgeschlagen (Slugify), ist aber frei überschreibbar | SOLL |
| FR-08 | Der Schätzmodus ist umschaltbar zwischen **Fibonacci** (Standard, FR-02) und **Frei**: im freien Modus werden Impact und Effort über ein Zahlenfeld im konfigurierten Wertebereich erfasst statt über die Fibonacci-Auswahl. Enthält ein importiertes Dokument einen Impact- oder Effort-Wert außerhalb der Fibonacci-Reihe, während der Schätzmodus Fibonacci aktiv ist, wechselt die Anwendung nach dem Import automatisch in den freien Modus | MUSS |
| FR-09 | Der Wertebereich des freien Schätzmodus (Min/Max, **gemeinsam** für Impact und Effort) ist an zentraler Stelle einstellbar; Standardwert 0–100. Ein vorhandener Wert außerhalb des eingestellten Bereichs bleibt nach FR-03 erhalten und wird entsprechend gekennzeichnet, statt den Bereich stillschweigend zu erweitern | MUSS |

### 5.2 Beziehungs-Verwaltung

| ID | Anforderung | Priorität |
|---|---|---|
| FR-10 | Beziehungen können über ein **Kontextmenü auf der Map** angelegt werden (Rechtsklick / Long-Press) | MUSS |
| FR-11 | Das Kontextmenü bietet die Aktionen *„Als Start verwenden"* und *„Als Ziel verwenden"* | MUSS |
| FR-12 | Sind Start und Ziel gesetzt, öffnet sich ein Dialog zur Auswahl des Beziehungstyps und zur optionalen Eingabe eines Labels | MUSS |
| FR-13 | Ein gesetzter, aber unvollständiger Verbindungsvorgang ist jederzeit abbrechbar (ESC, Klick auf freie Fläche, expliziter Abbrechen-Button) | MUSS |
| FR-14 | Ein aktiv gesetzter Start wird auf der Map dauerhaft visuell markiert, solange der Vorgang läuft | MUSS |
| FR-15 | Beziehungen können ebenfalls über die Feature-Liste angelegt werden | MUSS |
| FR-16 | Beziehungen können gelöscht und in Typ/Label bearbeitet werden | MUSS |

### 5.3 Visualisierung (Map)

| ID | Anforderung | Priorität |
|---|---|---|
| FR-20 | Darstellung als 2D-Streudiagramm: **X-Achse = Effort, Y-Achse = Impact** | MUSS |
| FR-21 | Die Y-Achse ist so orientiert, dass hoher Impact oben liegt | MUSS |
| FR-22 | Die Map ist in vier Quadranten unterteilt, jeweils dezent beschriftet | SOLL |
| FR-23 | Jedes Feature wird als Kreis mit Beschriftung dargestellt | MUSS |
| FR-24 | Die Map aktualisiert sich **unmittelbar** bei jeder Datenänderung (reaktiv) | MUSS |
| FR-25 | Zoom und Pan sind möglich (Mausrad/Pinch, Ziehen der Fläche). Gezoomt wird der **sichtbare Wertebereich der Achsen** (Datenzoom), nicht das gerenderte Bild als Ganzes: Achsen, Teilstriche und Rasterlinien zeigen fortlaufend den aktuell sichtbaren Ausschnitt neu berechnet, Punktgrößen und Schriftgrößen bleiben bei jedem Zoomstand bildschirmkonstant | SOLL |
| FR-26 | Die Achsen skalieren automatisch auf den vorhandenen Wertebereich, mindestens jedoch bis 21 im Schätzmodus Fibonacci beziehungsweise bis zum eingestellten Maximum im freien Schätzmodus (FR-09) | SOLL |

#### Quadranten-Semantik

| Quadrant | Effort | Impact | Bezeichnung |
|---|---|---|---|
| oben links | niedrig | hoch | Quick Wins |
| oben rechts | hoch | hoch | Große Vorhaben |
| unten links | niedrig | niedrig | Nebenbei |
| unten rechts | hoch | niedrig | Vermeiden |

### 5.4 Kollisionsbehandlung (Jitter)

| ID | Anforderung |
|---|---|
| FR-30 | Features mit identischem (`impact`, `effort`)-Paar werden visuell leicht gegeneinander versetzt gezeichnet |
| FR-31 | Der Versatz ist **rein visuell**. Die gespeicherten Werte bleiben unverändert. Export und Tooltip zeigen stets die Originalwerte |
| FR-32 | Der Versatz ist **deterministisch** (abgeleitet aus der Feature-ID), sodass sich die Anordnung zwischen zwei Renderings nicht ändert |
| FR-33 | Der Versatz erfolgt radial um den Ankerpunkt, mit einem Radius kleiner als der halbe Rasterabstand der Achse |

### 5.5 Selektion und Hervorhebung

| ID | Anforderung |
|---|---|
| FR-40 | Klick auf ein Feature selektiert es und öffnet einen **Tooltip** mit: Label, ID, Impact, Effort, Liste aller ein- und ausgehenden Beziehungen, Aktionen (Bearbeiten, Löschen, Als Start/Ziel verwenden) |
| FR-41 | Bei Selektion werden alle `requires`-Vorbedingungen **transitiv** aufgelöst und hervorgehoben |
| FR-42 | `relates`- und `excludes`-Beziehungen werden nur für die **direkte** Nachbarschaft hervorgehoben |
| FR-43 | Nicht beteiligte Features und Kanten werden je nach eingestelltem Hervorhebungsmodus (FR-47) entweder abgedunkelt (Dimming, Standard) oder vollständig ausgeblendet |
| FR-44 | Ein Umschalter erlaubt den Wechsel zwischen *„nur direkte Beziehungen"* und *„transitiv"* |
| FR-45 | Kantenlabels werden nur bei Selektion oder Hover eingeblendet, um Überfrachtung zu vermeiden |
| FR-46 | Die Selektion wird durch Klick auf freie Fläche oder ESC aufgehoben |
| FR-47 | Ein weiterer, unabhängiger Umschalter erlaubt den Wechsel zwischen **Abdunkeln** und **Ausblenden** nicht beteiligter Elemente (FR-43); der Wechsel wirkt sofort, ohne die Selektion aufzuheben |

### 5.6 Visuelle Kodierung

| Element | Darstellung |
|---|---|
| `requires` | Durchgezogene Linie mit Pfeilspitze. Das benötigte Ziel erhält zusätzlich einen **umschließenden Ring** |
| `relates` | Gestrichelte Linie mit Pfeilspitze, Kreis zu Kreis |
| `excludes` | Linie mit `x`-Endmarkierung. Der Kreis des ausgeschlossenen Ziels wird **durchgestrichen** |
| Selektiertes Feature | Verstärkte Kontur, hervorgehobene Füllung |
| Verbindungs-Startpunkt | Gepulste oder gestrichelte Kontur während des laufenden Vorgangs |
| Zyklus-Warnung (INT-05) | Beteiligte `requires`-Kanten in Warnfarbe plus Warnhinweis in der UI |
| Ausgeblendetes Element (FR-47, Modus Ausblenden) | Nicht gerendert: kein Platzhalter, keine Trefferfläche, nicht per Tab erreichbar |

**Hinweis zur Zugänglichkeit:** Die Unterscheidung der Beziehungstypen erfolgt bewusst über **Linienform und Endmarkierung**, nicht allein über Farbe. Damit bleibt die Darstellung auch bei Farbfehlsichtigkeit eindeutig.

### 5.7 Feature-Liste

| ID | Anforderung |
|---|---|
| FR-50 | Ausklappbares Panel am linken Rand, standardmäßig eingeklappt |
| FR-51 | Zeigt alle Features mit Label, Impact und Effort |
| FR-52 | Textfilter über Label und ID |
| FR-53 | Sortierung nach Label, Impact, Effort |
| FR-54 | Klick auf einen Listeneintrag selektiert das Feature auch auf der Map und zentriert es im Viewport |
| FR-55 | Pro Eintrag stehen die Aktionen Bearbeiten, Löschen und Beziehung anlegen zur Verfügung |

### 5.8 Import und Export

| ID | Anforderung |
|---|---|
| FR-60 | **DSL-Export:** Anzeige des generierten Textes in einem Dialog mit „In Zwischenablage kopieren" und „Als `.fmap`-Datei herunterladen" |
| FR-61 | **DSL-Import:** Textfeld zum Einfügen sowie Datei-Upload. Vorschau der Parse-Ergebnisse vor der Übernahme |
| FR-62 | Beim Import mit vorhandenem Datenbestand erfolgt eine Rückfrage: **Ersetzen** oder **Abbrechen** (Zusammenführen ist nicht Teil des MVP) |
| FR-63 | **SVG-Export:** Download der Map als SVG-Datei |
| FR-64 | **PNG-Export:** Download der Map als PNG mit wählbarem Skalierungsfaktor **1x / 2x / 4x** |
| FR-65 | Beide Bildexporte umfassen **immer die vollständige Map** (Bounding Box aller Elemente), unabhängig vom aktuellen Zoom/Pan-Zustand |
| FR-66 | Exportierte Bilder enthalten Achsen, Achsenbeschriftungen, Quadranten-Beschriftungen, alle Features und alle Beziehungen |
| FR-67 | Der Bildexport spiegelt den **neutralen Zustand** wider (keine Selektion, kein Dimming), sofern nicht explizit anders gewählt |
| FR-68 | Im SVG werden Schriften über eine websichere Font-Stack-Definition eingebettet oder als Pfade gerendert, damit die Darstellung auf fremden Systemen stabil bleibt |
| FR-69 | PNG-Export mit weißem Hintergrund (Standard); transparenter Hintergrund als Option | 

### 5.9 Persistenz

| ID | Anforderung |
|---|---|
| FR-70 | Der komplette Datenbestand wird automatisch im **LocalStorage** gespeichert |
| FR-71 | Speicherung erfolgt debounced (ca. 300–500 ms nach der letzten Änderung), um Schreiblast zu vermeiden |
| FR-72 | Beim Laden der Anwendung wird der letzte Stand automatisch wiederhergestellt |
| FR-73 | Es wird genau **eine** aktive Map verwaltet |
| FR-74 | Ist der LocalStorage-Inhalt beschädigt oder nicht parsebar, startet die App mit leerer Map und zeigt einen Hinweis, statt abzustürzen |
| FR-75 | Eine Funktion „Map zurücksetzen" leert den Bestand nach Rückfrage |
| FR-76 | Schätzmodus und der Wertebereich des freien Schätzmodus (FR-08, FR-09) werden als **App-Einstellung** im LocalStorage persistiert, getrennt vom Kartenbestand und **nicht** Teil des DSL-Exports |

**Akzeptiertes Risiko:** Ein Löschen der Browserdaten führt zum Verlust der Map. Der DSL-Export ist das vom Nutzer bewusst einzusetzende Sicherungsmittel. Eine Warnfunktion ist bewusst **nicht** Teil des MVP.

---

## 6. Benutzeroberfläche

### 6.1 Layout Desktop

```
┌──────────────────────────────────────────────────────────┐
│ Toolbar: [+ Feature] [Import] [Export ▾] [Ansicht ▾]     │
├───┬──────────────────────────────────────────────────────┤
│ ☰ │                                                      │
│ F │                                                      │
│ e │              M A P   (dominante Fläche)              │
│ a │                                                      │
│ t │                       ● Login                        │
│ u │                          │                           │
│ r │                          ▼                           │
│ e │                       ● SSO      ┌──────────────┐    │
│ s │                                  │   Tooltip    │    │
│   │                                  └──────────────┘    │
├───┴──────────────────────────────────────────────────────┤
│ Statuszeile: 24 Features · 11 Beziehungen · gespeichert  │
└──────────────────────────────────────────────────────────┘
```

Die Feature-Liste ist ein **Overlay-Panel**, das über die Map gleitet und diese nicht dauerhaft verkleinert.

Das Menü **Ansicht ▾** bietet zusätzlich den Umschalter *Hervorhebung: Abdunkeln/Ausblenden*
(FR-47) sowie den Eintrag *Einstellungen* für Schätzmodus und Wertebereich (FR-08, FR-09).

### 6.2 Layout Mobil

| ID | Anforderung |
|---|---|
| UI-10 | Die App muss auf Smartphones und Tablets nutzbar sein (Responsive Web App) |
| UI-11 | Die Feature-Liste wird zu einem Bottom Sheet oder Vollbild-Overlay |
| UI-12 | Das Kontextmenü wird über **Long-Press** ausgelöst |
| UI-13 | Modale Formulare werden im Vollbild dargestellt |
| UI-14 | Zoom und Pan per Pinch- und Drag-Geste |
| UI-15 | Der Tooltip wird als Bottom Sheet statt als schwebendes Fenster dargestellt |
| UI-16 | Interaktive Trefferflächen (Kreise, Menüeinträge) mindestens 44 × 44 px |
| UI-17 | Die Toolbar reduziert sich auf Icons mit Overflow-Menü |
| UI-18 | Referenz-Breakpoints: < 768 px mobil, 768–1024 px Tablet, > 1024 px Desktop |

### 6.3 Interaktionsmatrix

| Aktion | Desktop | Mobil |
|---|---|---|
| Feature selektieren | Linksklick | Tap |
| Kontextmenü | Rechtsklick | Long-Press (≈500 ms) |
| Zoom | Mausrad | Pinch |
| Pan | Ziehen auf freier Fläche | Ein-Finger-Drag |
| Selektion aufheben | ESC / Klick ins Leere | Tap ins Leere |
| Vorgang abbrechen | ESC | Abbrechen-Button |

---

## 7. Technische Rahmenbedingungen

### 7.1 Tech-Stack

| Bereich | Festlegung | Begründung |
|---|---|---|
| Framework | **SvelteKit** | Kompakter Code, kleines Bundle, gute Reaktivität |
| Sprache | **TypeScript** (strict) | Typsicherheit für Datenmodell und Parser |
| Build | **Vite** | SvelteKit-Standard |
| Adapter | **adapter-static**, `ssr = false`, `prerender = true` | Reine Client-App, überall hostbar (Static Hosting, CDN, Confluence-Anhang) |
| Rendering | **Eigenes SVG** (deklarativ in Svelte-Komponenten) | Volle Kontrolle über Darstellung; SVG-Export ist dadurch trivial, da die Map bereits SVG ist |
| Achsenskalen | ggf. `d3-scale` (nur Skalen, kein d3-Rendering) | Vermeidet Eigenbau bei Achsenberechnung |
| Persistenz | Web Storage API (`localStorage`) | Kein Backend erforderlich |
| Tests | Vitest (Unit), Playwright (E2E) | Parser und Graphlogik sind gut unit-testbar |

**Migrationsvorbehalt:** Sollte das eigene SVG-Rendering bei Interaktion oder Kantenrouting zu komplex werden, ist ein Wechsel auf eine Graph-Bibliothek zulässig. Voraussetzung: Der SVG-Export bleibt erhalten. Die Rendering-Schicht ist daher hinter einer klaren Schnittstelle zu kapseln.

### 7.2 Architektur

```
src/
├── lib/
│   ├── model/
│   │   ├── types.ts            # Feature, Relation, FeatureMap
│   │   └── validation.ts       # INT-01 … INT-07
│   ├── dsl/
│   │   ├── tokenizer.ts
│   │   ├── parser.ts           # DSL → FeatureMap, Fehlersammlung
│   │   ├── serializer.ts       # FeatureMap → DSL
│   │   └── errors.ts
│   ├── graph/
│   │   ├── traversal.ts        # transitive requires-Auflösung
│   │   └── cycles.ts           # Zyklenerkennung
│   ├── layout/
│   │   ├── scales.ts           # Wert → Pixel
│   │   ├── jitter.ts           # deterministischer Versatz
│   │   └── edges.ts            # Kantenpfade, Pfeilspitzen
│   ├── export/
│   │   ├── svg.ts
│   │   └── png.ts              # SVG → Canvas → PNG
│   ├── store/
│   │   ├── mapStore.ts         # zentraler reaktiver Store
│   │   ├── selection.ts        # Selektion, Hervorhebungsmodus, Dim/Ausblenden
│   │   ├── viewport.ts         # sichtbarer Wertebereich (Datenzoom)
│   │   ├── settings.ts         # Schätzmodus, Wertebereich (App-Einstellung, FR-76)
│   │   └── persistence.ts      # LocalStorage, debounced
│   └── components/
│       ├── Map/
│       ├── FeatureList/
│       ├── FeatureModal/
│       ├── RelationDialog/
│       ├── ContextMenu/
│       ├── SettingsDialog/
│       └── Tooltip/
└── routes/
    └── +page.svelte
```

### 7.3 Zentrale Algorithmen

#### Transitive Auflösung (FR-41)

```
FUNKTION requiresClosure(startId):
  ergebnis ← ∅
  besucht  ← ∅
  stapel   ← [startId]

  SOLANGE stapel nicht leer:
    aktuell ← stapel.pop()
    WENN aktuell ∈ besucht: WEITER      // Zyklusschutz
    besucht ← besucht ∪ {aktuell}

    FÜR JEDE relation MIT from = aktuell UND type = "requires":
      ergebnis ← ergebnis ∪ {relation}
      stapel.push(relation.to)

  RÜCKGABE ergebnis
```

Komplexität O(V + E). Bei 100 Features unkritisch.

#### Zyklenerkennung (INT-05)

Tiefensuche über den `requires`-Teilgraphen mit Drei-Farben-Markierung (weiß/grau/schwarz). Eine Rückwärtskante zu einem grauen Knoten kennzeichnet einen Zyklus. Die Prüfung läuft nach jeder Änderung an den Beziehungen.

#### Deterministischer Jitter (FR-32)

```
FUNKTION jitterOffset(featureId, gruppenIndex, gruppenGroesse):
  WENN gruppenGroesse = 1: RÜCKGABE (0, 0)

  seed   ← hash(featureId)
  winkel ← (2π · gruppenIndex / gruppenGroesse) + (seed mod 360)°
  radius ← min(basisRadius · √gruppenGroesse, maxRadius)

  RÜCKGABE (radius · cos(winkel), radius · sin(winkel))
```

`gruppenIndex` wird durch stabile Sortierung der Gruppe nach `id` bestimmt.

#### Datenzoom (FR-25)

```
Zustand: sichtbarer Ausschnitt als (centerEffort, centerImpact, visibleRange)
  visibleRange ∈ [domainMax / 4, domainMax]   // 1x = ganze Karte, 4x = ein Viertel des Wertebereichs

FUNKTION zoomBeiZeiger(deltaFaktor, zeigerEffort, zeigerImpact):
  neuerBereich ← clamp(visibleRange · deltaFaktor, domainMax / 4, domainMax)
  skalenFaktor ← neuerBereich / visibleRange
  centerEffort ← zeigerEffort + (centerEffort − zeigerEffort) · skalenFaktor
  centerImpact ← zeigerImpact + (centerImpact − zeigerImpact) · skalenFaktor
  visibleRange ← neuerBereich
  // centerEffort/centerImpact anschließend je Achse so klemmen, dass
  // [center ± visibleRange/2] innerhalb [0, domainMax] bleibt
```

Achsen, Raster und Teilstriche werden aus `(centerEffort, centerImpact, visibleRange)` neu
berechnet, nicht aus einer Bildtransformation. Solange `visibleRange = domainMax`, gelten die
Teilstrichregeln aus 7.2/F-08 (Fibonacci-Reihe bzw. FR-09-Wertebereich); sobald `visibleRange <
domainMax`, erzeugen die Teilstriche runde, gleichmäßig verteilte Werte im sichtbaren Fenster.
Punkt- und Schriftgrößen bleiben bei jedem `visibleRange` bildschirmkonstant.

#### PNG-Export (FR-64/65)

1. Bounding Box über alle Elemente berechnen, Rand hinzufügen
2. SVG mit dieser ViewBox neu serialisieren (unabhängig vom UI-Zoom)
3. Styles inline einbetten (externe CSS-Regeln greifen im Canvas nicht)
4. SVG als Data-URL in ein `Image` laden
5. Canvas mit `breite × faktor`, `höhe × faktor` erzeugen, `ctx.scale(faktor, faktor)`
6. Zeichnen, `toBlob('image/png')`, Download auslösen

---

## 8. Nicht-funktionale Anforderungen

### 8.1 Performance

| ID | Anforderung | Zielwert |
|---|---|---|
| NFR-01 | Die Anwendung verarbeitet Maps mit bis zu **100 Features** flüssig | 100 Features, bis ~300 Kanten |
| NFR-02 | Neurendern der Map nach einer Änderung | < 100 ms |
| NFR-03 | Selektion inkl. transitiver Auflösung und Hervorhebung | < 50 ms |
| NFR-04 | Parsen eines DSL-Dokuments mit 100 Features | < 200 ms |
| NFR-05 | Initiales Laden der App (Time to Interactive) | < 2 s bei 3G-Verbindung |
| NFR-06 | PNG-Export bei 4x | < 3 s |
| NFR-07 | Zoom und Pan | 60 fps auf Desktop, ≥ 30 fps mobil |

### 8.2 Kompatibilität

| ID | Anforderung |
|---|---|
| NFR-10 | Unterstützte Browser: aktuelle Versionen von Chrome, Firefox, Safari, Edge (jeweils die letzten zwei Hauptversionen) |
| NFR-11 | Mobile Unterstützung: iOS Safari und Chrome für Android |
| NFR-12 | Keine Abhängigkeit von experimentellen Browser-APIs |

### 8.3 Sicherheit

| ID | Anforderung |
|---|---|
| NFR-20 | Keine Übertragung von Nutzerdaten an Server. Die App funktioniert vollständig offline nach dem ersten Laden |
| NFR-21 | Importierter DSL-Text ist als **nicht vertrauenswürdig** zu behandeln. Labels und Kantenbeschriftungen werden ausschließlich als Text gerendert, niemals als HTML/SVG-Markup interpretiert (XSS-Schutz beim Einfügen in SVG-`text`-Elemente) |
| NFR-22 | Keine Verwendung von `eval`, `innerHTML` oder `{@html}` für nutzergenerierte Inhalte |
| NFR-23 | Eingabelängen sind begrenzt (ID max. 64 Zeichen, Label max. 200, Kantenlabel max. 120), um Rendering-Probleme und Speichermissbrauch zu verhindern |
| NFR-24 | Content-Security-Policy ohne `unsafe-inline` für Skripte |

### 8.4 Robustheit

| ID | Anforderung |
|---|---|
| NFR-30 | Ein Parser-Fehler darf die laufende Anwendung nicht in einen inkonsistenten Zustand versetzen |
| NFR-31 | Überschreitet der LocalStorage sein Kontingent (`QuotaExceededError`), erhält der Nutzer einen klaren Hinweis mit Aufforderung zum Export |
| NFR-32 | Ist LocalStorage nicht verfügbar (z. B. privater Modus in manchen Browsern), läuft die App im Sitzungsmodus weiter und weist auf die fehlende Persistenz hin |

### 8.5 Wartbarkeit

| ID | Anforderung |
|---|---|
| NFR-40 | Parser, Serializer und Graphlogik sind frei von UI-Abhängigkeiten und isoliert unit-testbar |
| NFR-41 | Testabdeckung der Module `dsl/` und `graph/` mindestens 90 % |
| NFR-42 | Das Datenmodell ist über `schemaVersion` versioniert, um spätere Formatänderungen migrierbar zu halten |
| NFR-43 | Die Rendering-Schicht ist gekapselt, um den in 7.1 genannten Migrationsvorbehalt zu ermöglichen |

---

## 9. Akzeptanzkriterien (Auswahl)

| ID | Kriterium |
|---|---|
| AK-01 | Ein neu angelegtes Feature erscheint ohne Neuladen sofort an der korrekten Position auf der Map |
| AK-02 | Nach `F5` ist der komplette Datenbestand unverändert vorhanden |
| AK-03 | Export → neuer Browser-Tab → Import erzeugt eine identische Map |
| AK-04 | Zweifacher Export ohne zwischenzeitliche Änderung liefert byte-identischen Text |
| AK-05 | Bei drei Features mit `impact=5, effort=5` sind alle drei einzeln erkenn- und anklickbar; im Export stehen bei allen dreien exakt `5`/`5` |
| AK-06 | Kette A → B → C (`requires`): Selektion von A hebt B **und** C hervor |
| AK-07 | A `requires` B, B `relates` C: Selektion von A hebt C **nicht** hervor |
| AK-08 | Anlegen von A → B → A erzeugt eine sichtbare Zyklus-Warnung |
| AK-09 | Löschen eines Features entfernt alle zugehörigen Kanten aus Map und Export |
| AK-10 | Umbenennen einer Feature-ID hält alle Beziehungen intakt |
| AK-11 | PNG bei 4x hat exakt die vierfache Pixelbreite gegenüber 1x |
| AK-12 | Bei auf einen Ausschnitt gezoomter Map enthält der Export dennoch alle Features |
| AK-13 | Ein Feature mit Label `<script>alert(1)</script>` wird als sichtbarer Text dargestellt, ohne Skriptausführung |
| AK-14 | Import mit Referenz auf ein unbekanntes Feature liefert eine zeilengenaue Fehlermeldung; der Bestand bleibt unverändert |
| AK-15 | Import eines Features mit `impact=7` zeigt im Formular `7` als vorselektierte, markierte Zusatzoption; nach Abbruch bleibt der Wert `7` |
| AK-16 | Auf einem Gerät mit 375 px Breite sind alle Kernfunktionen erreichbar und bedienbar |
| AK-17 | Umschalten von Abdunkeln auf Ausblenden lässt nicht beteiligte Elemente vollständig verschwinden, ohne die Selektion aufzuheben; Zurückschalten stellt sie abgedunkelt wieder her |
| AK-18 | Reinzoomen mit dem Mausrad zeigt einen kleineren Wertebereich mit neu berechneten Teilstrichen; der Wertepunkt unter dem Zeiger bleibt unter dem Zeiger, Punktgröße und Schrift bleiben bildschirmgleich groß |
| AK-19 | Import eines Dokuments mit `impact=45` bei aktivem Fibonacci-Modus schaltet die Anwendung automatisch auf den freien Schätzmodus um; das Formular zeigt `45` danach als Zahlenfeldwert, nicht als Fibonacci-Auswahl |

---

## 10. Umsetzungsreihenfolge (Vorschlag)

| Schritt | Inhalt | Ergebnis |
|---|---|---|
| 1 | Datenmodell, Validierung, Store, LocalStorage | Daten lassen sich halten und persistieren |
| 2 | DSL-Parser und Serializer inkl. Tests | Round-Trip nachweisbar |
| 3 | SVG-Grundgerüst: Achsen, Skalen, Quadranten, Feature-Kreise | Statische Map sichtbar |
| 4 | Formular-Modal, Feature-CRUD | Features per UI pflegbar |
| 5 | Jitter, Feature-Liste, Tooltip | Vollständige Feature-Ansicht |
| 6 | Kanten-Rendering aller drei Typen | Beziehungen sichtbar |
| 7 | Kontextmenü, Verbindungsvorgang, Typ-Dialog | Beziehungen per UI pflegbar |
| 8 | Graph-Traversierung, Selektion, Hervorhebung, Zyklen | Kernnutzen erreicht |
| 9 | Import-/Export-Dialoge, SVG- und PNG-Export | Teilbarkeit hergestellt |
| 10 | Responsives Verhalten, Touch-Gesten | MVP abgeschlossen |

---

## 11. Offene Punkte für Folge-Iterationen

Bewusst zurückgestellt, hier zur Dokumentation:

1. Verwaltung mehrerer benannter Maps
2. Vollständige Tastaturbedienbarkeit und ARIA-Auszeichnung
3. Alternative Farbschemata inkl. Dark Mode
4. Undo/Redo
5. Zusammenführen beim Import statt reinem Ersetzen
6. Erinnerung an den Export bei längerer Nutzung ohne Sicherung
7. Zusätzliche Feature-Attribute (Beschreibung, Status, Tags, Team)
8. Kollaborative Bewertung durch mehrere Personen mit Aggregation
9. Automatisch abgeleitete Umsetzungsreihenfolge aus dem `requires`-Graphen (topologische Sortierung)
10. Teilen per URL (komprimierter Zustand im Fragment)
