# F-05 · DSL-Parser

**Schicht:** Anti-Corruption Layer · **Hängt ab von:** F-02 · **Umfang:** L

## Ziel

Fremder Text wird zu einer geprüften Karte — oder zu einer vollständigen, zeilengenauen
Fehlerliste. Der Parser ist die Schleuse, hinter der die Domäne nur noch gültige Daten sieht.

## DDD-Einordnung

Anti-Corruption Layer. Er übersetzt eine externe, menschengeschriebene Darstellung in das
Modell und übernimmt dabei nichts ungeprüft. Importierter Text gilt als nicht vertrauenswürdig
(NFR-21): Anzeigenamen und Kantenbeschriftungen sind reiner Text und werden später nie als
Markup interpretiert.

## Umfang

`src/lib/dsl/errors.ts`

```ts
export interface ParseError {
  line: number;          // 1-basiert
  source: string;        // die Originalzeile, unverändert
  code: ParseErrorCode;
  message: string;       // deutsch, für Nutzer lesbar
}
export type ParseErrorCode =
  | 'headerMissing' | 'unsupportedVersion' | 'syntax' | 'duplicateId'
  | 'unknownReference' | 'selfReference' | 'duplicateRelation'
  | 'negativeValue' | 'missingAttribute' | 'valueTooLong';
```

`src/lib/dsl/tokenizer.ts` — zerlegt eine Zeile in Marken und behält deren Spaltenposition.

`src/lib/dsl/parser.ts`

```ts
export type ParseResult =
  | { ok: true; map: FeatureMap }
  | { ok: false; errors: ParseError[] };

export function parse(text: string): ParseResult;
```

## Grammatik

Maßgeblich ist die EBNF aus PRD 4.2. Pfeilzuordnung: `-->` ist `requires`, `-.->` ist
`relates`, `--x` ist `excludes`.

```
featuremap v1

%% Kommentar
kennung["Anzeigename"]  :: impact=8, effort=3
kennung2                :: effort=3, impact=8

kennung --> |"beschriftung"| kennung2
kennung -.-> kennung2
kennung --x kennung2
```

## Fachregeln

| ID | Regel |
|---|---|
| DSL-01 | Jeder Fehler nennt Zeilennummer, Originalzeile und eine verständliche Ursache |
| DSL-02 | Bei mindestens einem Fehler wird der Import vollständig abgebrochen; der Aufrufer erhält keine Teilkarte |
| DSL-03 | Alle Fehler eines Dokuments werden gesammelt, nicht nur der erste |
| DSL-04 | Nutzen und Aufwand akzeptieren jeden nicht-negativen Integer, nicht nur die Schätzreihe |
| DSL-05 | Zwei-Pass: erst alle Feature-Definitionen, dann alle Beziehungen. Eine Beziehung darf vor der Definition ihrer Features stehen |
| DSL-06 | Attributreihenfolge ist frei, beide Attribute sind Pflicht |
| DSL-07 | Kopfzeile mit unbekannter Version (> 1) bricht mit Warnung ab, nie stillschweigend |
| DSL-08 | Whitespace zwischen Marken ist beliebig, Einrückung bedeutungslos |

Zusätzlich gelten alle Feldregeln aus F-02. Der Parser prüft sie selbst und meldet sie
zeilengenau, statt sie erst beim Aufbau des Aggregats auflaufen zu lassen — eine
Fehlermeldung ohne Zeilennummer wäre für den Nutzer wertlos.

Nach dem zweiten Durchgang wird die entstandene Karte zusätzlich gegen die Invarianten aus
F-02 geprüft. Verstöße, die dort auffallen, werden auf die Zeile abgebildet, die sie ausgelöst
hat.

## Akzeptanzkriterien

- [ ] Das Beispieldokument aus PRD 4.4 ergibt vier Features und drei Beziehungen mit den
      erwarteten Werten.
- [ ] Eine Beziehung auf ein unbekanntes Feature liefert genau eine Fehlermeldung mit der
      richtigen Zeilennummer, und der Aufrufer erhält keine Karte (AK-14).
- [ ] Ein Dokument mit drei Fehlern in drei Zeilen liefert drei Fehler in einem Durchlauf.
- [ ] `featuremap v2` bricht mit `unsupportedVersion` ab.
- [ ] Eine fehlende Kopfzeile bricht mit `headerMissing` ab.
- [ ] Ein Feature mit `impact=7` wird mit dem Wert 7 übernommen.
- [ ] Ein Anzeigename `<script>alert(1)</script>` wird als gewöhnlicher Text übernommen; der
      Parser entfernt oder verändert nichts daran.
- [ ] Beziehungen dürfen vor den Feature-Definitionen stehen und werden korrekt aufgelöst.
- [ ] Ein Dokument mit 100 Features wird in unter 200 ms geparst (NFR-04).

## Tests

Vitest, Zielabdeckung für `dsl/` mindestens 90 % (NFR-41). Tabellengetriebene Tests je
Fehlercode, dazu Beispieldokument, Reihenfolgevarianten, Whitespace-Varianten, Grenzlängen und
ein Leistungstest mit 100 Features.

## Nicht Teil dieses Features

Serialisierung (F-06), Import-Dialog samt Vorschau und Rückfrage (F-18).
