# F-26 · Schätzmodus: Fibonacci oder freier Wertebereich

**Schicht:** Anwendung / Bedienung / Darstellung · **Hängt ab von:** F-08, F-13, F-25 · **Umfang:** L

## Ziel

Wer nicht in Fibonacci-Stufen schätzen will, stellt einen freien Wertebereich ein (Standard
0–100, gemeinsam für Nutzen und Aufwand) und erfasst Nutzen/Aufwand als Zahl statt über die
Fibonacci-Auswahl. Die Einstellung gilt für die App, nicht für die einzelne Karte.

## DDD-Einordnung

`impact`/`effort` bleiben im Aggregat weiterhin einfach nicht-negative Ganzzahlen (INT-07); der
Schätzmodus ändert keine Domäneninvariante, nur was das Formular anbietet und wie die Achsen bei
voller Ansicht skalieren. Er gehört deshalb in die Anwendungsschicht (`src/lib/store/`), nicht
in `model/`.

## Umfang

`src/lib/store/settings.ts` (neu):

```ts
export type EstimationMode = 'fibonacci' | 'free';
export interface EstimationRange { min: number; max: number; }   // gemeinsam für impact und effort

export const estimationMode: Writable<EstimationMode>;     // Default 'fibonacci', persistiert
export const estimationRange: Writable<EstimationRange>;   // Default { min: 0, max: 100 }, persistiert
```

Persistenz: eigener LocalStorage-Schlüssel, getrennt von `mapStore`/`persistence.ts` aus F-04
(FR-76) — die Einstellung ist keine Eigenschaft der Karte und nicht Teil des DSL-Exports.

Neue Komponente `src/lib/components/SettingsDialog/SettingsDialog.svelte`: Umschalter
Fibonacci/Frei, bei Frei zwei Zahlenfelder Min/Max (Validierung: beide nicht-negative
Ganzzahlen, Min < Max). Erreichbar über das Menü **Ansicht ▾** (Eintrag *Einstellungen*, PRD
6.1), als Kartusche über die Token aus `app.css` wie das Feature-Formular aus F-13.

Änderungen an Bestehendem:

- `ScoreSelect.svelte` (F-13): rendert bei `estimationMode = 'fibonacci'` unverändert die
  Knopfreihe der Fibonacci-Werte; bei `'free'` ein Zahlenfeld, das nur Ganzzahlen innerhalb von
  `estimationRange` annimmt. Werte außerhalb des jeweils aktiven Angebots bleiben nach FR-03
  unverändert als abweichende, gekennzeichnete Zusatzoption erhalten — dieselbe Regel gilt
  jetzt für beide Modi.
- `src/lib/layout/scales.ts` (F-08/F-25): `domainMaxOf` verwendet im Modus `free` das
  eingestellte `estimationRange.max` statt der festen 21 als Untergrenze (FR-26); `ticksOf` bei
  `visibleRange = domainMax` erzeugt im Modus `free` dieselben runden, gleichmäßig verteilten
  Teilstriche wie beim Hineinzoomen aus F-25, statt der Fibonacci-Reihe.

## Automatischer Wechsel beim Import

Enthält ein importiertes Dokument einen `impact`- oder `effort`-Wert, der nicht in der
Fibonacci-Reihe liegt, während `estimationMode = 'fibonacci'` aktiv ist, wechselt die Anwendung
nach erfolgreichem Import automatisch auf `estimationMode = 'free'`. `estimationRange` bleibt
dabei beim zuletzt eingestellten Wert (Default 0–100) — ein Wert außerhalb davon wird wie jeder
abweichende Wert behandelt (FR-03/FR-09), nicht automatisch als neue Bereichsgrenze übernommen.

## Darstellung

Einstellungsdialog als Kartusche über der Karte, gleicher Rahmen wie das Feature-Formular
(`.cartouche`, 1 px `--rule`, Token aus `app.css`). Feldbeschriftungen und Verhalten (ESC
schließt ohne Speichern, Fokusfalle, Rückgabe des Fokus beim Schließen) wie in F-13.

## Fachregeln

| ID | Regel |
|---|---|
| FR-08 | Der Schätzmodus ist umschaltbar zwischen Fibonacci (Standard) und Frei; im freien Modus wird Nutzen/Aufwand über ein Zahlenfeld im konfigurierten Wertebereich erfasst. Ein importiertes Dokument mit einem Wert außerhalb der Fibonacci-Reihe schaltet die Anwendung automatisch von Fibonacci in den freien Modus |
| FR-09 | Der Wertebereich des freien Schätzmodus (Min/Max, gemeinsam für Nutzen und Aufwand) ist an zentraler Stelle einstellbar; Standard 0–100 |
| FR-26 | Achsen skalieren mindestens bis 21 (Fibonacci) bzw. bis zum eingestellten Maximum (frei) |
| FR-76 | Schätzmodus und Wertebereich werden als App-Einstellung im LocalStorage persistiert, getrennt vom Kartenbestand |
| INT-07 | Unverändert: Nutzen/Aufwand nicht-negative Ganzzahlen, unabhängig vom Modus |

## Akzeptanzkriterien

- [ ] Standardzustand ist Fibonacci; das Formular verhält sich unverändert wie in F-13 (alle
      F-13-Akzeptanzkriterien bleiben erfüllt).
- [ ] Umschalten auf Frei mit Bereich 0–100 zeigt im Formular ein Zahlenfeld statt der
      Fibonacci-Knöpfe; Werte innerhalb 0–100 werden angenommen.
- [ ] Ändern des Bereichs (z. B. auf 0–50) wirkt sofort auf neu geöffnete Formulare.
- [ ] Import eines Dokuments mit `impact=45` bei aktivem Fibonacci-Modus schaltet automatisch
      auf Frei um (AK-19); das Formular zeigt `45` danach als Zahlenfeldwert.
- [ ] Ein Wert außerhalb des eingestellten Bereichs (z. B. `impact=150` bei Bereich 0–100)
      bleibt erhalten und wird wie in FR-03 als abweichend gekennzeichnet, statt den Bereich
      automatisch zu erweitern.
- [ ] Bei Modus Frei zeigt die volle Kartenansicht Teilstriche als runde, gleichmäßig verteilte
      Werte bis mindestens zum eingestellten Maximum.
- [ ] Schätzmodus und Bereich überstehen ein Neuladen der Seite (App-Einstellung, FR-76).
- [ ] Export/Import einer Karte enthält keine Spur des Schätzmodus (reine Ganzzahlen wie
      bisher); zwei Nutzer mit unterschiedlichem Modus sehen dieselbe importierte Karte korrekt
      (DSL-14 bleibt unberührt).

## Tests

- Unit für `settings.ts`: Default-Werte, Persistenz, Bereichsvalidierung (Min < Max,
  nicht-negativ).
- Unit für die `scales.ts`-Erweiterung: `domainMaxOf` im Modus `free`, `ticksOf` bei
  `visibleRange = domainMax` im Modus `free`.
- Unit für den Import-Ablauf (F-05/F-18): automatischer Moduswechsel bei einem
  Fibonacci-fremden Wert, kein Wechsel wenn alle Werte in der Reihe liegen.
- E2E: Einstellungsdialog öffnen, Modus wechseln, Formular zeigt Zahlenfeld statt Knöpfe;
  Bereich ändern und Formularverhalten prüfen; Import mit abweichendem Wert schaltet den Modus
  automatisch um; Export/Import-Roundtrip bleibt bei unterschiedlichem Modus byte-identisch.

## Nicht Teil dieses Features

Datenzoom-Mechanik selbst (F-25) — nur deren `ticksOf`-Erzeugung wird hier für den
Vollansicht-Fall im Modus `free` mitgenutzt. Hervorhebung/Ausblenden (F-24). Getrennte
Wertebereiche für Nutzen und Aufwand (bewusst nicht Teil dieses Features).
