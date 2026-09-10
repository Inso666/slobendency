// Fußleiste · Formatierung, Zustandsauswahl und Kursbildung (F-23 ·
// features/F-23-statuszeile.md, Abschnitte "Umfang" und "Tests": "Unit: Formatierung der
// Felder, Auswahl des Zustandstextes je StorageState, Kursbildung.").
//
// StatusBar.svelte berechnet nichts selbst (F-23, Abschnitt "DDD-Einordnung": "Die Fußleiste
// liest ausschließlich vorhandene Stores; sie berechnet nichts selbst."); dieses Modul zieht
// die reine Anzeigelogik heraus, wie bereits listing.ts (F-14), detail.ts (F-15) und
// importPreview.ts (F-18) für ihre jeweilige Komponente — damit sie ohne
// Component-Testing-Bibliothek mit reinem Vitest geprüft werden kann (siehe
// statusText.test.ts). courseText() formuliert dabei keine Fachregel neu, die nicht schon in
// src/lib/graph/ existiert (FR-41, FR-42, F-07) — sie baut nur eine Anzeigekette aus den
// bereits vorliegenden Kanten von `map.relations` (features/README.md, Leitplanke 3).
//
// Signatur ist vom Test-Agenten vorgegeben. Die Rümpfe sind Aufgabe des Feature-Agenten.

import type { FeatureId, FeatureMap } from '../../model/types';
import type { StorageState } from '../../store/persistence';
import { displayNameOf } from '../FeatureList/listing';

/**
 * Eingaben für den Speicherzustandstext der Fußleiste (F-23, Abschnitt "Umfang", Zeile
 * "Speicherzustand"; FR-70, FR-71, FR-74, NFR-31, NFR-32).
 *
 * `saving` bildet die laufende Bündelungsfrist ab (F-04, `DEBOUNCE_MS` in
 * src/lib/store/persistence.ts): `true`, solange der zuletzt geänderte Bestand noch nicht
 * geschrieben wurde. persistence.ts exportiert dafür bislang kein eigenes Signal — der
 * Feature-Agent muss src/lib/store/persistence.ts (F-04, bereits gemergt) um einen
 * entsprechenden `Readable<boolean>` erweitern, damit StatusBar.svelte diesen Parameter füllen
 * kann (features/F-04-persistenz.md, Abschnitt "Nicht Teil dieses Features" weist die Anzeige
 * ausdrücklich F-23 zu, ohne dass F-04 dafür bereits ein Signal bereitstellt). `storageState`
 * und `lastSavedAt` kommen dagegen unverändert aus persistence.ts.
 */
export interface SaveStatusInput {
	saving: boolean;
	storageState: StorageState;
	lastSavedAt: Date | null;
}

/** Anzeigeform des Speicherzustands: Text plus, ob er als Warnung erscheint (F-23, Abschnitt
 * "Umfang": "bei quotaExceeded 'Speicher voll' in --magenta"). */
export interface SaveStatusDisplay {
	text: string;
	warning: boolean;
}

/**
 * Wählt den Zustandstext des Speicherfelds (F-23, Abschnitt "Umfang", Zeile
 * "Speicherzustand"). Prüfreihenfolge, absteigend nach Vorrang:
 *
 * 1. `saving` — "Wird gespeichert …" (mit dem in der Featurebeschreibung vorgegebenen
 *    Leerzeichen vor dem Auslassungszeichen), unabhängig vom bisherigen `storageState`: erst
 *    nach Ablauf der Bündelungsfrist steht überhaupt fest, ob der Schreibvorgang gelingt.
 * 2. `storageState === 'quotaExceeded'` — "Speicher voll", `warning: true` (NFR-31).
 * 3. `storageState === 'unavailable'` — "Nicht gespeichert — Sitzungsmodus" (Halbgeviertstrich,
 *    NFR-32).
 * 4. `lastSavedAt !== null` — "Gespeichert HH:MM" (`formatSavedAt`, FR-70/FR-71).
 * 5. Sonst (kein `saving`, `storageState` "ready" oder "recovered", aber noch kein
 *    erfolgreicher Schreibvorgang) — ebenfalls "Wird gespeichert …": vor dem allerersten
 *    Schreibvorgang einer Sitzung ist noch nichts "gespeichert" (Designentscheidung dieses
 *    Test-Agenten, siehe statusText.test.ts).
 */
export function saveStatusText(input: SaveStatusInput): SaveStatusDisplay {
	throw new Error('not implemented');
}

/**
 * Formatiert den Bestand (F-23, Abschnitt "Umfang", Zeile "Bestand": "14 Features ·
 * 9 Beziehungen"). Deutsche Singular-/Pluralregel wie bereits in FeatureList.svelte (F-14,
 * Rückfrage vor dem Löschen): 1 → Singular ("Feature"/"Beziehung"), jede andere Zahl
 * einschließlich 0 → Plural ("Features"/"Beziehungen"), je Feld unabhängig gewählt.
 */
export function inventoryText(featureCount: number, relationCount: number): string {
	throw new Error('not implemented');
}

/**
 * Formatiert den Zyklen-Hinweis (F-23, Abschnitt "Umfang", Zeile "Zyklen"; INT-05, AK-08):
 * "Keine Zyklen" ohne Zyklus, sonst "1 Zyklus-Warnung" (Singular) bzw. "n Zyklus-Warnungen"
 * (Plural ab 2).
 */
export function cycleWarningText(cycleCount: number): string {
	throw new Error('not implemented');
}

/**
 * Formatiert einen Zeitpunkt als zweistellige, lokale Uhrzeit "HH:MM" (F-23, Abschnitt
 * "Umfang": "Gespeichert 12:04"), jeweils mit führender Null.
 */
export function formatSavedAt(date: Date): string {
	throw new Error('not implemented');
}

/**
 * Bildet den Kurs des selektierten Features (F-23, Abschnitt "Umfang", Zeile "Kurs";
 * features/README.md, Ubiquitous Language: "Kurs — requiresPath — Kette transitiver
 * Vorbedingungen"): die Anzeigenamen (`displayNameOf`, F-14) entlang der `requires`-Kette ab
 * `selectedId`, durch " → " getrennt, beginnend mit dem selektierten Feature selbst (F-23,
 * Abschnitt "Umfang", Beispiel: "Rollen & Rechte → Single Sign-On → Benutzer-Login" — "Rollen
 * & Rechte" ist dort das selektierte Feature).
 *
 * - Ohne Selektion (`selectedId === null`) leer (F-23, Abschnitt "Umfang": "ohne Selektion
 *   leer").
 * - Folgt ausschließlich `requires`-Kanten (FR-41); `relates` und `excludes` werden nicht
 *   verfolgt (FR-42) — dieselbe Einschränkung wie `requiresClosure` (F-07), hier aber nur zur
 *   Anzeige einer einzelnen Kette, nicht der vollständigen Hüllmenge.
 * - Hat das selektierte Feature keine ausgehende `requires`-Kante, besteht der Kurs nur aus
 *   seinem eigenen Anzeigenamen (Designentscheidung dieses Test-Agenten, siehe
 *   statusText.test.ts — in den Quellen für diesen Fall nicht festgelegt).
 * - Bei mehreren ausgehenden `requires`-Kanten wird die Kante zum alphabetisch kleinsten Ziel
 *   verfolgt — dieselbe Tie-Break-Regel wie `findRequiresCycles` ("beginnt mit dem kleinsten
 *   enthaltenen Bezeichner", F-07, src/lib/graph/cycles.ts), hier für Determinismus ohne
 *   Quellenvorgabe für den Verzweigungsfall übernommen.
 * - Ein bereits in der Kette enthaltenes Feature bricht sie ab, statt sie endlos fortzusetzen
 *   (Zyklusschutz wie `requiresClosure`, F-07).
 */
export function courseText(map: FeatureMap, selectedId: FeatureId | null): string {
	throw new Error('not implemented');
}
