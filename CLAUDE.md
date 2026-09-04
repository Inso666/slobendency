# slobendency — Arbeitsregeln für Entwicklungssessions

Dieses Dokument regelt, **wie** in diesem Repository entwickelt wird. Was gebaut wird, steht
woanders und ist unverändert maßgeblich:

| Quelle | Rolle |
|---|---|
| `PRD.md` | Fachspezifikation. Bei Widerspruch zu allem anderen gewinnt sie. |
| `design/03-seekarte.html` | Verbindlicher visueller Entwurf. Farben, Typografie, Signaturen, Anordnung. |
| `design/README.md` | Begründung des Entwurfs, gemeinsame Festlegungen. |
| `features/README.md` | Ubiquitous Language, DDD-Aufbau, Reihenfolge, Abhängigkeiten. |
| `features/F-*.md` | Je ein Feature, je eine Session. |

Allgemeine Arbeitsregeln des Harness (Commit-Format, Formatierung, Werkzeugnutzung) werden hier
nicht wiederholt.

## Rollen

**Orchestrator** ist die Hauptsession. Sie plant, spawnt Agenten, prüft deren Ergebnisse,
führt Branches zusammen und hält den Fortschritt fest. **Der Orchestrator implementiert
nicht selbst.** Seine einzige eigene Schreibarbeit sind `features/STATUS.md` und Merges.

**Test-Agent** schreibt die Unit- und E2E-Tests eines Features — **vor** der Umsetzung. Er
legt den Feature-Branch an und arbeitet ausschließlich aus den Quellen, nie aus vorhandenem
Produktionscode des Features, den es zu diesem Zeitpunkt noch nicht gibt.

**Feature-Agent** setzt genau ein Feature um, bis die vorgelegten Tests grün sind.

**QA-Agent** prüft ein fertiges Feature gegen die drei Quellen und behebt Abweichungen.

Test-Agent, Feature-Agent und QA-Agent sind **drei frisch gespawnte Agenten**, keine Forks
voneinander. Jeder leitet seine Sicht aus den Quellen ab. Prüfte der QA-Agent mit dem Kontext
des Feature-Agenten, prüfte er dessen Annahmen statt der Spezifikation; schriebe derselbe
Agent Tests und Umsetzung, beschriebe der Test am Ende das Gebaute statt das Geforderte.

Agenten werden über das Agent-Werkzeug gespawnt. Laufen mehrere Feature-Agenten gleichzeitig,
bekommt jeder `isolation: "worktree"`.

## Sessionstart

Immer in dieser Reihenfolge:

1. **Weckauftrag anlegen** (siehe unten) — als Erstes, vor jeder inhaltlichen Arbeit. Bricht
   die Session am Limit ab, ist der Auftrag sonst nicht mehr anzulegen.
2. `features/STATUS.md` lesen. Existiert die Datei nicht, aus `features/README.md` anlegen:
   je Feature eine Zeile mit Zustand `offen`.
3. `git status` und `git branch` prüfen: Gibt es einen halbfertigen Feature-Branch, wird
   dieser zuerst zu Ende gebracht.
4. Nächste Features aus der Abhängigkeitstabelle in `features/README.md` bestimmen und
   Agenten beauftragen.

## Weckzyklus

Das Session-Limit ist nach etwa fünf Stunden erreicht. Damit die Arbeit danach von selbst
weiterläuft, legt der Orchestrator zu Sessionbeginn einen **einmaligen** Cron-Auftrag auf
*jetzt + 5 Stunden* an:

- `CronCreate` mit `recurring: false`, fünfstelliger Ausdruck in lokaler Zeit mit
  festgenagelter Minute, Stunde, Tag und Monat.
- Minute **nicht** auf 0 oder 30 legen, sondern auf einen krummen Wert (etwa 47).
- Beispiel für einen Start um 09:12 am 4. September: `47 14 4 9 *`.

Der Prompt des Auftrags lautet sinngemäß:

> Setze die Entwicklung an slobendency fort. Lege zuerst den nächsten Weckauftrag auf jetzt
> + 5 Stunden an (CronCreate, recurring: false, krumme Minute). Lies dann CLAUDE.md und
> features/STATUS.md und arbeite als Orchestrator weiter: unfertige Branches zuerst, danach
> die nächsten freien Features.

**Nach jedem Aufwachen wird als Erstes der nächste Weckauftrag angelegt.** Der Zyklus reißt
sonst nach einem Durchlauf ab.

Zwei Eigenschaften des Werkzeugs, die den Umgang bestimmen: Cron-Aufträge leben nur in der
laufenden Session — endet der Prozess, ist der Auftrag weg. Und sie feuern nur, wenn die
Session gerade nichts abarbeitet. Die Session bleibt deshalb offen; ein Weckauftrag ersetzt
keinen laufenden Prozess.

## Ein Feature, ein Branch

```
git switch main && git pull --ff-only
git switch -c feature/F-07-graph-services
```

Angelegt wird der Branch vom Test-Agenten, weil er als Erster daran arbeitet; Feature- und
QA-Agent wechseln nur noch darauf.

Branchname ist `feature/` plus der Dateiname des Features ohne Endung. Auf einem Branch wird
genau ein Feature bearbeitet. Vor dem Zusammenführen wird auf `main` rebased, zusammengeführt
wird mit `--no-ff`, damit der Feature-Verlauf sichtbar bleibt. Der Branch wird nach dem Merge
gelöscht.

Auf `main` wird nie direkt entwickelt.

## Ablauf je Feature

1. **Tests beauftragen.** Der Orchestrator spawnt einen Test-Agenten: Branch anlegen, aus
   `features/F-XX-*.md`, `PRD.md` und `design/03-seekarte.html` die Unit- und E2E-Tests
   schreiben. Der Agent bekommt keinen Auszug, sondern die Dateipfade — er liest selbst.
2. **Tests vorlegen.** Der Test-Agent führt die Suite aus, weist nach, dass jeder neue Test
   aus dem richtigen Grund rot ist, und committet als `F-XX · Tests (rot)`.
3. **Umsetzen beauftragen.** Der Orchestrator spawnt einen frischen Feature-Agenten auf
   demselben Branch. Auftrag: dieselben Quellen lesen, das Feature bauen, bis alle Tests grün
   sind.
4. **QA-Abgleich.** Der Orchestrator spawnt einen frischen QA-Agenten auf demselben Branch.
5. **Abweichungen beheben.** Der QA-Agent behebt gefundene Abweichungen direkt und prüft
   anschließend erneut. Widersprechen sich die Quellen, wird nichts geraten: Der QA-Agent
   meldet den Widerspruch an den Orchestrator, der ihn dem Nutzer vorlegt.
6. **Zusammenführen.** Erst wenn keine Abweichung offen ist und die gesamte Testsuite grün
   läuft, wird gemergt und `features/STATUS.md` fortgeschrieben.

Der Orchestrator gibt dem Feature-Agenten weder Hinweise auf Lösungswege noch eigene
Auslegungen der Quellen weiter. Er reicht Pfade und den Branch durch — mehr nicht.

## QA-Abgleich

Geprüft wird gegen drei Quellen, in dieser Reihenfolge:

| Quelle | Frage |
|---|---|
| `features/F-XX-*.md` | Sind alle Akzeptanzkriterien erfüllt? Sind die genannten Dateien und Signaturen vorhanden? Wurde nichts umgesetzt, was unter „Nicht Teil dieses Features" steht? |
| `PRD.md` | Erfüllt die Umsetzung die im Feature referenzierten FR-, INT-, DSL-, NFR- und AK-Regeln im Wortlaut? |
| `design/03-seekarte.html` | Stimmen Farben, Abstände, Schriftrollen, Signaturen und Anordnung? Werden ausschließlich Token aus `app.css` verwendet? Funktioniert Tag- **und** Nachttafel? |

Zusätzlich prüft der QA-Agent die Tests selbst: Er vergleicht die Testdateien mit dem Stand
aus dem Commit `F-XX · Tests (rot)`. Jede Änderung daran muss vom Orchestrator freigegeben
und begründet sein; ein abgeschwächter, übersprungener oder gelöschter Test ist ein Befund.
Ebenso ein Akzeptanzkriterium der Featurebeschreibung, zu dem sich kein Test finden lässt.

Der Abgleich mit dem Entwurf erfolgt **am laufenden Programm**, nicht durch Codelesen: Der
QA-Agent startet die Anwendung, ruft den betroffenen Zustand auf und vergleicht mit dem
Entwurf, bei Bedarf über Screenshots. Zusätzlich zu prüfen sind die Breakpoints 375, 834 und
1440 px, sobald das Feature Oberfläche hat.

Jeder Befund wird in `features/qa/F-XX.md` festgehalten: Beobachtung, verletzte Quelle,
Behebung. Ein Feature ohne offene Befunde bekommt dort die Schlusszeile *Keine Abweichungen*.

**Fertig heißt: keine Abweichungen.** Ein Feature mit bekannten Abweichungen ist nicht fertig,
auch nicht „bis auf Kleinigkeiten". Teilergebnisse werden als solche gemeldet, nie als
Fertigmeldung.

## Tests

Tests entstehen **vor** dem Produktionscode und von anderer Hand. Zu jedem Feature gehören
beide Sorten. Ein Feature ohne E2E-Test gilt als unfertig, auch wenn alle Unit-Tests grün sind.

| Sorte | Ort | Umfang |
|---|---|---|
| Unit (Vitest) | neben der Quelle als `*.test.ts` | Jede Regel, jeder Grenzfall, jede Fehlermeldung aus der Featurebeschreibung. Für `src/lib/dsl/` und `src/lib/graph/` mindestens 90 % Abdeckung (NFR-41) |
| E2E (Playwright) | `e2e/F-XX-*.spec.ts` | Mindestens ein Durchlauf, der das Kernakzeptanzkriterium aus Nutzersicht fährt; jedes im Feature genannte AK aus der PRD bekommt einen eigenen Test |

### Regeln für den Test-Agenten

- Die Akzeptanzkriterien der Featurebeschreibung sind die Vorlage. Jedes Kriterium wird zu
  mindestens einem Test; die Zuordnung steht als Kommentar über dem Test (`// AK-06`,
  `// F-07: Kette A → B → C`).
- Er schreibt **keinen** Produktionscode. Damit die Tests überhaupt laufen, darf er die im
  Feature genannten Module mit ihren Signaturen anlegen, deren Rümpfe
  `throw new Error('not implemented')` werfen. Mehr nicht — keine Logik, keine Komponenten
  mit Inhalt.
- Er führt die Suite aus und weist im Abschlussbericht nach, dass jeder neue Test rot ist,
  und zwar an der Zusicherung oder am fehlenden Rumpf, nicht an einem Tippfehler oder einem
  fehlenden Import.
- E2E-Tests greifen bevorzugt über Rolle und sichtbaren Text zu (`getByRole`, `getByText`),
  weil das zugleich die Beschriftungen aus dem Entwurf prüft. Wo das nicht eindeutig ist,
  vergibt er `data-testid` und listet die vergebenen Namen in seinem Abschlussbericht auf —
  der Feature-Agent muss wissen, welche Kennzeichen er zu rendern hat.
- Tests prüfen beobachtbares Verhalten, nicht die innere Umsetzung. Ein Test, der eine
  bestimmte Implementierung erzwingt, ist ein QA-Befund.

### Regeln für den Feature-Agenten

- Vorgelegte Tests werden nicht abgeschwächt, nicht übersprungen und nicht gelöscht.
- Hält er einen Test für falsch, ändert er ihn nicht, sondern meldet ihn mit Begründung an
  den Orchestrator. Der entscheidet anhand der Quellen; nur er gibt eine Teständerung frei.
- Zusätzliche Tests darf er jederzeit hinzufügen.

Vor jedem Merge läuft die **gesamte** Suite, nicht nur die neuen Tests. Ein Feature darf keinen
vorher grünen Test rot machen. Schlägt etwas fehl, wird die Ursache behoben.

## Parallelität

Mehrere Feature-Agenten gleichzeitig sind erlaubt, wenn die Features laut
`features/README.md` voneinander unabhängig sind **und** keine gemeinsamen Dateien anfassen.
F-05 und F-06 etwa teilen sich `src/lib/dsl/` und laufen deshalb nacheinander; F-05 und F-08
laufen problemlos parallel.

Der Orchestrator startet höchstens drei Feature-Agenten gleichzeitig und führt jeden Branch
einzeln zusammen, nie mehrere in einem Rutsch.

## Fachliche Leitplanken

Diese vier Regeln aus `features/README.md` gelten in jeder Session und werden von der QA
mitgeprüft:

1. `src/lib/model/`, `graph/` und `dsl/` enthalten keine Framework-, DOM- oder Farbbezüge.
2. Das Aggregat ist unveränderlich; Operationen geben eine neue Karte oder eine Fehlerliste
   zurück.
3. Fachregeln stehen im Aggregat, nicht in Komponenten. Eine Regel zweimal umgesetzt ist ein
   QA-Befund.
4. Bezeichner im Code englisch, Texte für Nutzer deutsch, Begriffe nach der Sprachtabelle in
   `features/README.md`.

## Fortschritt

`features/STATUS.md` ist der Übergabepunkt zwischen den Sessions. Eine Zeile je Feature:

```
| F-07 | Vorbedingungen und Zyklen | fertig   | feature/F-07-graph-services | gemergt 04.09. 11:20 |
| F-08 | Kartengerüst              | in QA    | feature/F-08-kartengeruest  | 2 offene Befunde     |
| F-09 | Feature-Signaturen         | in Tests | feature/F-09-feature-signaturen | 14 Tests rot     |
```

Zustände: `offen`, `in Tests`, `in Arbeit`, `in QA`, `fertig`, `blockiert`. `in Tests` heißt,
der Test-Agent schreibt noch; `in Arbeit` beginnt erst mit dem Commit der roten Tests. Bei
`blockiert` steht in der letzten Spalte, worauf gewartet wird. Der Orchestrator schreibt die Datei nach jedem
Zustandswechsel fort — ein geweckter Orchestrator hat sonst keinen Anhaltspunkt.
