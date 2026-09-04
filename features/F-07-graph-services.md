# F-07 · Vorbedingungen und Zyklen

**Schicht:** Domäne (Services) · **Hängt ab von:** F-02 · **Umfang:** S

## Ziel

Zwei Fragen, die das Aggregat allein nicht beantwortet, weil sie den ganzen Graphen betreffen:
*Was muss vor diesem Feature fertig sein?* und *Widerspricht sich die Reihenfolge irgendwo?*

## DDD-Einordnung

Domänen-Services — zustandslose Funktionen über dem Aggregat. Sie gehören nicht in die
Entität, weil sie mehrere Features betreffen, und nicht in die Anwendungsschicht, weil sie
fachliche Bedeutung tragen.

## Umfang

`src/lib/graph/traversal.ts`

```ts
export interface Closure {
  features: Set<FeatureId>;    // ohne den Startknoten
  relations: Relation[];
}
export function requiresClosure(map: FeatureMap, start: FeatureId): Closure;
export function directNeighbours(map: FeatureMap, id: FeatureId): Closure;
```

`src/lib/graph/cycles.ts`

```ts
export interface Cycle { path: FeatureId[]; relations: Relation[]; }
export function findRequiresCycles(map: FeatureMap): Cycle[];
export function isOnCycle(cycles: Cycle[], relation: Relation): boolean;
```

## Fachregeln

| ID | Regel |
|---|---|
| FR-41 | `requires` wird transitiv aufgelöst, über beliebig viele Stufen |
| FR-42 | `relates` und `excludes` gelten nur für die direkte Nachbarschaft |
| — | Die transitive Auflösung folgt ausschließlich **ausgehenden** `requires`-Kanten. Eine Kante, die auf den Startknoten zeigt, ist eine Nachfolgebeziehung und gehört nicht in die Vorbedingungsmenge |
| — | `requires` wird nicht über `relates` oder `excludes` fortgesetzt (PRD 3.2, Begründung der Einschränkung) |
| INT-05 | Zyklen werden erkannt, aber nicht verhindert. Beteiligte Kanten werden markiert |

`requiresClosure` arbeitet iterativ mit Stapel und Besuchsmenge nach dem Pseudocode in
PRD 7.3, damit ein Zyklus nicht in eine Endlosschleife läuft. `directNeighbours` liefert alle
ein- und ausgehenden Kanten eines Features samt deren Gegenknoten, unabhängig von der Art —
die Unterscheidung, was davon hervorgehoben wird, trifft F-11.

`findRequiresCycles` macht eine Tiefensuche über den `requires`-Teilgraphen mit
Drei-Farben-Markierung; eine Rückwärtskante auf einen grauen Knoten schließt einen Zyklus. Der
gefundene Pfad wird so zurückgegeben, dass er mit dem kleinsten enthaltenen Bezeichner beginnt
— sonst hinge das Ergebnis von der Startreihenfolge ab und ließe sich schlecht anzeigen.

## Akzeptanzkriterien

- [ ] Kette A → B → C: `requiresClosure(A)` enthält B und C sowie beide Kanten (AK-06).
- [ ] A `requires` B, B `relates` C: `requiresClosure(A)` enthält C **nicht** (AK-07).
- [ ] X `requires` A: `requiresClosure(A)` enthält X nicht.
- [ ] A → B → A: `findRequiresCycles` liefert genau einen Zyklus mit beiden Kanten (AK-08).
- [ ] Zwei getrennte Zyklen in einer Karte werden beide gefunden.
- [ ] Eine Karte mit 100 Features und 300 Kanten wird in unter 50 ms ausgewertet (NFR-03).
- [ ] `requiresClosure` auf einem Knoten in einem Zyklus terminiert.

## Tests

Vitest, Zielabdeckung für `graph/` mindestens 90 % (NFR-41): Ketten, Verzweigungen,
Diamantform (zwei Wege zum selben Ziel — die Kante darf nur einmal im Ergebnis stehen),
Zyklen, isolierte Knoten, leere Karte, Leistungstest.

## Nicht Teil dieses Features

Darstellung der Hervorhebung (F-11), Warnhinweis zur Zyklus-Meldung in der Oberfläche (F-23),
topologische Sortierung (laut PRD 11 zurückgestellt).
