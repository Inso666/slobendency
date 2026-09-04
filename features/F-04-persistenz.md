# F-04 · Persistenz im LocalStorage

**Schicht:** Infrastruktur (Repository-Adapter) · **Hängt ab von:** F-03 · **Umfang:** M

## Ziel

Die aktive Karte übersteht das Schließen des Browsers. Der Adapter schreibt gebündelt, liest
beim Start zurück und geht mit jedem Fehlerfall des Speichers so um, dass die Anwendung
weiterläuft statt abzustürzen.

## DDD-Einordnung

Repository-Adapter. Er kennt das Aggregat, aber das Aggregat kennt ihn nicht. Der Adapter ist
Abonnent des Kartenstores aus F-03 — die Anwendungsschicht ruft ihn nicht aktiv auf. Die
Serialisierung nach JSON ist eine reine Speicherform und hat nichts mit der DSL zu tun.

## Umfang

`src/lib/store/persistence.ts`

```ts
export type StorageState = 'ready' | 'unavailable' | 'quotaExceeded' | 'recovered';

export const storageState: Readable<StorageState>;
export const lastSavedAt: Readable<Date | null>;

export function initPersistence(): void;   // beim App-Start einmal aufrufen
```

`initPersistence` liest den gespeicherten Stand, übergibt ihn per `loadMap` an den Store und
abonniert danach jede Änderung.

## Fachregeln

| ID | Regel | Umsetzung |
|---|---|---|
| FR-70 | Der komplette Datenbestand wird automatisch gespeichert | Schlüssel `featuremap.map`, Wert JSON des Aggregats inklusive `schemaVersion` |
| FR-71 | Gebündeltes Schreiben | 400 ms nach der letzten Änderung; ein noch offener Schreibvorgang wird verworfen, nicht angehängt |
| FR-72 | Beim Laden wird der letzte Stand wiederhergestellt | Vor dem ersten Rendern der Karte |
| FR-73 | Genau eine Karte | Ein einziger Schlüssel, kein Namensraum für mehrere Karten |
| FR-74 | Beschädigter Inhalt führt nicht zum Absturz | Bei ungültigem JSON, fehlenden Pflichtfeldern oder verletzter Invariante: leere Karte, Zustand `recovered`, Hinweis in der Oberfläche |
| NFR-31 | `QuotaExceededError` | Zustand `quotaExceeded`, Hinweis mit Aufforderung zum Export; die Karte im Speicher bleibt bestehen |
| NFR-32 | LocalStorage nicht verfügbar | Zustand `unavailable`, Anwendung läuft im Sitzungsmodus weiter, Hinweis auf fehlende Persistenz |

Beim Lesen wird der gespeicherte Stand **validiert**, nicht blind vertraut: Er durchläuft
dieselben Prüfungen wie ein Import (F-02). Ist eine Schemaversion größer als
`SCHEMA_VERSION` gespeichert, wird der Stand verworfen und wie beschädigt behandelt
(DSL-07 sinngemäß).

## Akzeptanzkriterien

- [ ] Nach einer Änderung und 400 ms Ruhe steht der neue Stand im LocalStorage; zehn
      Änderungen in schneller Folge erzeugen einen einzigen Schreibvorgang.
- [ ] Nach `F5` ist der komplette Datenbestand unverändert vorhanden (AK-02).
- [ ] Ein manuell auf `{kaputt` gesetzter Speicherwert führt zu leerer Karte, Zustand
      `recovered` und einem sichtbaren Hinweis — nicht zu einem Fehlerabbruch.
- [ ] Ein Speicherwert mit `schemaVersion: 2` wird wie beschädigt behandelt.
- [ ] Wirft der Speicher beim Schreiben `QuotaExceededError`, bleibt die Karte im Speicher
      erhalten und der Zustand wechselt auf `quotaExceeded`.
- [ ] Ist `localStorage` nicht erreichbar, startet die Anwendung normal mit leerer Karte und
      Zustand `unavailable`.

## Tests

- Unit mit gefälschtem Speicher: Bündelung über Zeitgeber, Wiederherstellung, beschädigter
  Inhalt, zu neue Schemaversion, Quota-Fehler, fehlender Speicher.
- E2E: Feature anlegen, Seite neu laden, Feature ist da (AK-02).

## Nicht Teil dieses Features

Die Anzeige der Hinweise selbst (F-23 baut Fußleiste und Hinweisband und liest `storageState`),
DSL-Export als Sicherung (F-19).
