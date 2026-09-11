// Schätzmodus (F-26 · features/F-26-schaetzmodus.md, Abschnitt „Umfang").
//
// App-Einstellung in der Anwendungsschicht (F-26, Abschnitt „DDD-Einordnung"): impact/effort
// bleiben im Aggregat weiterhin einfach nicht-negative Ganzzahlen (INT-07); der Schätzmodus
// ändert keine Domäneninvariante, nur was das Formular anbietet (FeatureModal/ScoreSelect,
// F-13) und wie die Achsen bei voller Ansicht skalieren (scales.ts, F-08/F-25). Eigener
// LocalStorage-Schlüssel, getrennt von mapStore.ts/persistence.ts aus F-04 (FR-76) — die
// Einstellung ist keine Eigenschaft der Karte und nicht Teil des DSL-Exports (features/README.md,
// Sprachtabelle: „Schätzmodus"/„Freier Wertebereich" sind App-Einstellung, nicht Teil der
// Karte). Analog zur bestehenden Tafelumschaltung aus F-01 (src/lib/store/theme.ts:
// Default-Store-Wert plus eigene init…()-Funktion, die beim App-Start einmalig den gemerkten
// Wert liest und anwendet, statt den Store blind aus dem LocalStorage zu initialisieren, damit
// SSR/Modul-Ladezeit keinen Browser-Zugriff voraussetzt).
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import { writable, type Writable } from 'svelte/store';
import type { FeatureMap } from '../model/types';
import type { Result } from '../model/validation';

/** Schätzmodus: Fibonacci-Auswahl (Standard, FR-02) oder freier Zahlenbereich (FR-08). */
export type EstimationMode = 'fibonacci' | 'free';

/** Wertebereich des freien Schätzmodus — gemeinsam für Nutzen und Aufwand (FR-09). */
export interface EstimationRange {
	min: number;
	max: number;
}

/** LocalStorage-Schlüssel der App-Einstellung — eigens, getrennt von „featuremap.map“ (FR-76). */
export const SETTINGS_STORAGE_KEY = 'featuremap.settings';

/** Standard-Schätzmodus (FR-08, F-26 Abschnitt „Umfang": „Default 'fibonacci'“). */
export const DEFAULT_ESTIMATION_MODE: EstimationMode = 'fibonacci';

/** Standard-Wertebereich des freien Schätzmodus (FR-09, F-26 Abschnitt „Umfang": „Default { min: 0, max: 100 }“). */
export const DEFAULT_ESTIMATION_RANGE: EstimationRange = { min: 0, max: 100 };

/**
 * Reaktiver Store des aktuellen Schätzmodus. Startwert 'fibonacci' (FR-08) — reine Daten, keine
 * Logik (wie der Startwert von `viewport` aus src/lib/store/viewport.ts, F-25). Persistiert wird
 * über initSettings()/setEstimationRange() unten, nicht durch den Store selbst.
 */
export const estimationMode: Writable<EstimationMode> = writable<EstimationMode>(
	DEFAULT_ESTIMATION_MODE
);

/**
 * Reaktiver Store des aktuellen Wertebereichs. Startwert { min: 0, max: 100 } (FR-09).
 */
export const estimationRange: Writable<EstimationRange> = writable<EstimationRange>(
	DEFAULT_ESTIMATION_RANGE
);

/**
 * Liest den zuletzt gemerkten Schätzmodus und Wertebereich aus dem LocalStorage (Schlüssel
 * SETTINGS_STORAGE_KEY) und wendet sie auf estimationMode/estimationRange an (FR-76). Fällt bei
 * fehlendem, ungültigem oder nicht verfügbarem LocalStorage auf die Standardwerte
 * (DEFAULT_ESTIMATION_MODE/DEFAULT_ESTIMATION_RANGE) zurück, statt zu werfen — dasselbe Muster
 * wie initTheme() (F-01, src/lib/store/theme.ts, NFR-32). Einmal beim App-Start aufzurufen,
 * analog zu initTheme() in src/routes/+page.svelte.
 */
export function initSettings(): void {
	throw new Error('not implemented');
}

/**
 * Prüft und setzt einen neuen Wertebereich (FR-09): beide Grenzen müssen nicht-negative
 * Ganzzahlen sein, `min` muss kleiner als `max` sein (F-26, Abschnitt „Tests":
 * „Bereichsvalidierung (Min < Max, nicht-negativ)"). Bei Erfolg wird `estimationRange`
 * aktualisiert, gemerkt (FR-76) und der neue Bereich zurückgegeben; bei einer Verletzung bleibt
 * der Store unverändert und die gesammelten Verstöße werden zurückgegeben — dasselbe
 * Result/RuleViolation-Muster wie die Aggregatsoperationen in src/lib/model/validation.ts
 * (features/README.md, Leitplanke 3: keine Regel ein zweites Mal, abweichend, in einer
 * Komponente nachbilden — SettingsDialog.svelte zeigt nur die hier zurückgegebenen Verstöße an
 * den passenden Feldern, wie FeatureModal.svelte es mit den Verstößen aus createFeature/
 * editFeature hält).
 */
export function setEstimationRange(range: EstimationRange): Result<EstimationRange> {
	throw new Error('not implemented');
}

/**
 * Automatischer Moduswechsel beim Import (F-26, Abschnitt „Automatischer Wechsel beim Import";
 * PRD FR-08, AK-19): enthält `map` einen impact- oder effort-Wert außerhalb der Fibonacci-Reihe
 * (FIBONACCI aus src/lib/model/types.ts), während `estimationMode` noch 'fibonacci' ist, wird
 * der Store auf 'free' gesetzt. `estimationRange` bleibt dabei unverändert beim zuletzt
 * eingestellten Wert — ein Wert außerhalb davon wird wie jeder abweichende Wert behandelt
 * (FR-03/FR-09), nicht automatisch als neue Bereichsgrenze übernommen. Enthält `map` keinen
 * solchen Wert, oder ist der Modus bereits 'free', bleibt der Store unverändert. Vom Aufrufer
 * (ImportDialog.svelte, F-18) nach erfolgreicher Übernahme der importierten Karte aufzurufen.
 */
export function applyEstimationModeAfterImport(map: FeatureMap): void {
	throw new Error('not implemented');
}
