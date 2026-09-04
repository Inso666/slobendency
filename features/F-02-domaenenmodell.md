# F-02 · Domänenmodell und Invarianten

**Schicht:** Domäne · **Hängt ab von:** F-01 · **Umfang:** L

## Ziel

Das Aggregat `FeatureMap` mit seinen Entitäten, Value Objects und allen Integritätsregeln aus
PRD 3.3 — vollständig frameworkfrei und isoliert testbar. Ab hier gibt es genau eine Stelle,
an der entschieden wird, ob eine Änderung an der Karte zulässig ist.

## DDD-Einordnung

- **Aggregat-Wurzel:** `FeatureMap`. Sie hält Features und Beziehungen und schützt deren
  Konsistenz. Beziehungen sind bewusst Teil der Karte und nicht des Features, weil ihre Regeln
  (INT-02, INT-04, INT-05, INT-06) nur mit Blick auf die gesamte Karte prüfbar sind.
- **Entität:** `Feature`, identifiziert über `FeatureId`.
- **Value Objects:** `FeatureId`, `Score`, `Relation`, `RelationType`, `Quadrant`.
- **Keine Repositories, keine Services** in diesem Feature. Nur Modell und Regeln.

## Umfang

`src/lib/model/types.ts`

```ts
export const SCHEMA_VERSION = 1;
export const FIBONACCI = [1, 2, 3, 5, 8, 13, 21] as const;

export type FeatureId = string;            // validiert, nicht bloß benannt
export type RelationType = 'requires' | 'relates' | 'excludes';
export type Quadrant = 'quickWins' | 'grosseVorhaben' | 'nebenbei' | 'vermeiden';

export interface Feature { id: FeatureId; label?: string; impact: number; effort: number; }
export interface Relation { from: FeatureId; to: FeatureId; type: RelationType; label?: string; }
export interface FeatureMap { schemaVersion: number; features: Feature[]; relations: Relation[]; }
```

`src/lib/model/validation.ts` — Prüffunktionen und Aggregatsoperationen:

```ts
export interface RuleViolation { rule: string; message: string; field?: string; }
export type Result<T> = { ok: true; value: T } | { ok: false; errors: RuleViolation[] };

export function emptyMap(): FeatureMap;
export function addFeature(map: FeatureMap, feature: Feature): Result<FeatureMap>;
export function updateFeature(map: FeatureMap, id: FeatureId, patch: Partial<Feature>): Result<FeatureMap>;
export function renameFeature(map: FeatureMap, from: FeatureId, to: FeatureId): Result<FeatureMap>;
export function removeFeature(map: FeatureMap, id: FeatureId): FeatureMap;
export function addRelation(map: FeatureMap, relation: Relation): Result<FeatureMap>;
export function updateRelation(map: FeatureMap, index: number, patch: Partial<Relation>): Result<FeatureMap>;
export function removeRelation(map: FeatureMap, relation: Relation): FeatureMap;
export function relationsOf(map: FeatureMap, id: FeatureId): { outgoing: Relation[]; incoming: Relation[] };
export function quadrantOf(score: { impact: number; effort: number }, domainMax: number): Quadrant;
```

Alle Operationen geben eine **neue** Karte zurück. Keine Funktion mutiert ihr Argument.

## Fachregeln

| ID | Regel | Verhalten |
|---|---|---|
| INT-01 | Kennung ist mapweit eindeutig | `addFeature` und `renameFeature` scheitern mit `RuleViolation` auf Feld `id` |
| INT-02 | Quelle und Ziel einer Beziehung müssen existieren | `addRelation` scheitert; `removeFeature` entfernt alle Beziehungen des Features mit |
| INT-03 | Keine Selbstreferenz | `addRelation` scheitert, wenn `from === to` |
| INT-04 | Kein doppeltes Tripel aus Quelle, Ziel und Art | `addRelation` scheitert mit „Beziehung existiert bereits" |
| INT-05 | `requires` darf keinen Zyklus bilden | Die Beziehung wird **angelegt**; die Zyklenprüfung selbst liefert F-07. Hier nur: kein Ablehnen |
| INT-06 | Umbenennen zieht alle Referenzen nach | `renameFeature` ersetzt die Kennung in Feature und in allen Beziehungen atomar |
| INT-07 | Nutzen und Aufwand sind nicht-negative Ganzzahlen | Verstoß ist ein `RuleViolation` auf dem jeweiligen Feld |

Ergänzende Feldregeln (NFR-23 und DSL-Grammatik):

- Kennung: erforderlich, `^[A-Za-z0-9_-]+$`, maximal 64 Zeichen, Groß-/Kleinschreibung
  signifikant.
- Anzeigename: optional, maximal 200 Zeichen, darf kein Anführungszeichen und keinen
  Zeilenumbruch enthalten — sonst wäre er in der DSL nicht darstellbar.
- Kantenbeschriftung: optional, maximal 120 Zeichen, dieselbe Zeichenbeschränkung.
- Nutzen und Aufwand: Ganzzahl ≥ 0. Werte außerhalb der Schätzreihe sind **gültig** und
  werden nie gerundet (FR-03, DSL-04).

## Revier-Ableitung

`quadrantOf` bekommt die Obergrenze des dargestellten Wertebereichs übergeben und vergleicht
gegen deren Hälfte:

```
hoherNutzen  = impact >= domainMax / 2
hoherAufwand = effort >= domainMax / 2
```

Daraus: hoch/niedrig → `quickWins`, hoch/hoch → `grosseVorhaben`, niedrig/niedrig →
`nebenbei`, niedrig/hoch → `vermeiden`. Das Revier wird nie gespeichert, immer abgeleitet.
Die Obergrenze berechnet F-08; das Modell kennt nur die Formel.

## Akzeptanzkriterien

- [ ] Jede Regel aus der Tabelle ist durch mindestens einen Test abgedeckt, der den erwarteten
      `rule`-Schlüssel prüft.
- [ ] `removeFeature` auf ein Feature mit drei Beziehungen liefert eine Karte ohne dieses
      Feature und ohne diese drei Beziehungen (AK-09).
- [ ] `renameFeature` auf ein Feature mit ein- und ausgehenden Beziehungen hält alle
      Beziehungen intakt (AK-10).
- [ ] `addRelation` legt eine Beziehung an, die einen Zyklus schließt, und meldet keinen Fehler.
- [ ] Ein Feature mit `impact = 7` bleibt nach beliebigen Operationen bei `7`.
- [ ] Keine Datei in `src/lib/model/` importiert aus `svelte`, `$app` oder dem DOM.

## Tests

Vitest, Zielabdeckung für `model/` mindestens 90 % (NFR-41). Mindestens: je ein positiver und
ein negativer Fall pro Invariante, Unveränderlichkeit der Eingabekarte, Grenzwerte der
Feldlängen, Revier-Ableitung an den vier Ecken und exakt auf der Schwelle.

## Nicht Teil dieses Features

Zyklenerkennung und transitive Auflösung (F-07), Persistenz (F-04), DSL (F-05, F-06),
irgendeine Oberfläche.
