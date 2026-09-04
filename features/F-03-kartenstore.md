# F-03 · Kartenstore und Kommandos

**Schicht:** Anwendung · **Hängt ab von:** F-02 · **Umfang:** M

## Ziel

Die Anwendungsschicht zwischen Oberfläche und Aggregat: ein reaktiver Store, der die eine
aktive Karte hält, und Kommandos, die Aggregatsoperationen anstoßen und deren Fehler
weiterreichen. Komponenten rufen ab hier nur noch Kommandos auf und lesen Stores — sie fassen
das Aggregat nie direkt an.

## DDD-Einordnung

Anwendungsschicht. Sie hält keine Fachregeln, sondern orchestriert: Kommando entgegennehmen,
Aggregatsoperation aufrufen, Ergebnis übernehmen oder Fehler zurückgeben. Der Selektionszustand
ist bewusst **kein** Teil des Aggregats — er ist Sitzungszustand der Oberfläche und wird nicht
persistiert.

## Umfang

`src/lib/store/mapStore.ts`

```ts
export const map: Readable<FeatureMap>;

export function loadMap(next: FeatureMap): void;          // ersetzt vollständig (Import, Wiederherstellung)
export function resetMap(): void;                          // leere Karte

export function createFeature(input: Feature): Result<void>;
export function editFeature(id: FeatureId, patch: Partial<Feature>): Result<void>;
export function renameFeatureId(from: FeatureId, to: FeatureId): Result<void>;
export function deleteFeature(id: FeatureId): void;
export function createRelation(relation: Relation): Result<void>;
export function editRelation(relation: Relation, patch: Partial<Relation>): Result<void>;
export function deleteRelation(relation: Relation): void;
```

Kommandos, die scheitern können, geben das `Result` aus F-02 unverändert weiter; die Karte
bleibt in diesem Fall unverändert. Erfolgreiche Kommandos setzen die neue Karte in den Store.

`src/lib/store/selection.ts`

```ts
export const selectedId: Writable<FeatureId | null>;
export const highlightMode: Writable<'direct' | 'transitive'>;   // Startwert: 'transitive'
export const connectSource: Writable<FeatureId | null>;          // laufender Verbindungsvorgang
export function clearSelection(): void;                          // hebt Selektion und Verbindungsvorgang auf
```

Abgeleitete Stores für die Oberfläche:

```ts
export const featureCount: Readable<number>;
export const relationCount: Readable<number>;
export const selectedFeature: Readable<Feature | null>;
```

## Fachregeln

| Regel | Quelle |
|---|---|
| Es wird genau eine aktive Karte verwaltet. | FR-73 |
| Jede Datenänderung wirkt sofort auf alle Abnehmer; kein manuelles Neuzeichnen. | FR-24 |
| Wird ein Feature gelöscht, das gerade selektiert ist, wird die Selektion aufgehoben. | FR-46 sinngemäß |
| Wird ein Feature gelöscht, das Start eines Verbindungsvorgangs ist, wird der Vorgang abgebrochen. | FR-13 |
| Ein Umbenennen zieht die Selektion auf die neue Kennung nach. | INT-06 |
| Der Store setzt keine eigenen Regeln durch; er ruft ausschließlich Aggregatsoperationen auf. | Konvention 3 |

## Akzeptanzkriterien

- [ ] Ein Abonnent des Stores erhält nach jedem erfolgreichen Kommando genau eine
      Aktualisierung mit der neuen Karte.
- [ ] Ein fehlgeschlagenes Kommando löst keine Aktualisierung aus und lässt die Karte
      unverändert.
- [ ] `deleteFeature` auf das selektierte Feature setzt `selectedId` auf `null`.
- [ ] `renameFeatureId` auf das selektierte Feature setzt `selectedId` auf die neue Kennung.
- [ ] `loadMap` ersetzt die Karte vollständig und hebt Selektion und Verbindungsvorgang auf.
- [ ] `featureCount` und `relationCount` entsprechen jederzeit dem Karteninhalt.

## Tests

Unit gegen die Stores mit `get()` aus `svelte/store`: Erfolg und Misserfolg je Kommando,
Selektionsnachführung bei Löschen und Umbenennen, Zählerstände, Unveränderlichkeit der Karte
bei Fehlern.

## Nicht Teil dieses Features

Persistenz (F-04), Rückfragen vor dem Löschen (F-15 und F-17 stellen sie, das Kommando selbst
fragt nicht), Zyklenprüfung (F-07).
