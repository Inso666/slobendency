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

import { get, writable, type Writable } from 'svelte/store';
import { FIBONACCI } from '../model/types';
import type { FeatureMap } from '../model/types';
import type { Result, RuleViolation } from '../model/validation';

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

/** Abgelegte Form der App-Einstellung unter SETTINGS_STORAGE_KEY. */
interface StoredSettings {
	mode: EstimationMode;
	range: EstimationRange;
}

/**
 * Merkt Modus und Bereich gemeinsam im LocalStorage (FR-76). Ist LocalStorage nicht verfügbar
 * (NFR-32), bleibt die Einstellung für die laufende Sitzung wirksam, wird aber nicht darüber
 * hinaus gemerkt — dasselbe Muster wie persistTheme() (F-01, src/lib/store/theme.ts).
 */
function persistSettings(mode: EstimationMode, range: EstimationRange): void {
	try {
		const value: StoredSettings = { mode, range };
		window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(value));
	} catch {
		// LocalStorage nicht verfügbar — bewusst ignoriert, siehe Kommentar oben.
	}
}

/** Liest eine rohe, aus dem LocalStorage geparste Einstellung robust ein: fehlende oder falsch
 * geformte Felder fallen einzeln auf die Standardwerte zurück, statt die gesamte Einstellung zu
 * verwerfen. */
function coerceStoredSettings(raw: unknown): StoredSettings {
	const parsed = raw as Partial<StoredSettings> | null | undefined;
	const mode: EstimationMode = parsed?.mode === 'free' ? 'free' : DEFAULT_ESTIMATION_MODE;
	const candidateRange = parsed?.range;
	const range: EstimationRange =
		candidateRange &&
		typeof candidateRange.min === 'number' &&
		typeof candidateRange.max === 'number'
			? { min: candidateRange.min, max: candidateRange.max }
			: DEFAULT_ESTIMATION_RANGE;
	return { mode, range };
}

/**
 * Liest den zuletzt gemerkten Schätzmodus und Wertebereich aus dem LocalStorage (Schlüssel
 * SETTINGS_STORAGE_KEY) und wendet sie auf estimationMode/estimationRange an (FR-76). Fällt bei
 * fehlendem, ungültigem oder nicht verfügbarem LocalStorage auf die Standardwerte
 * (DEFAULT_ESTIMATION_MODE/DEFAULT_ESTIMATION_RANGE) zurück, statt zu werfen — dasselbe Muster
 * wie initTheme() (F-01, src/lib/store/theme.ts, NFR-32). Einmal beim App-Start aufzurufen,
 * analog zu initTheme() in src/routes/+page.svelte. Schreibt selbst nicht in den LocalStorage —
 * Persistenz ist Aufgabe von setEstimationRange() bzw. eines expliziten Moduswechsels
 * (Kommentar bei estimationMode oben).
 */
export function initSettings(): void {
	let stored: StoredSettings = { mode: DEFAULT_ESTIMATION_MODE, range: DEFAULT_ESTIMATION_RANGE };
	try {
		const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
		if (raw !== null) {
			stored = coerceStoredSettings(JSON.parse(raw));
		}
	} catch {
		stored = { mode: DEFAULT_ESTIMATION_MODE, range: DEFAULT_ESTIMATION_RANGE };
	}
	estimationMode.set(stored.mode);
	estimationRange.set(stored.range);
}

/** Prüft die Feldregeln eines Wertebereichs (FR-09): beide Grenzen nicht-negative Ganzzahlen,
 * `min` kleiner als `max`. Einzige Prüfstelle dieser Regel (features/README.md, Leitplanke 3). */
function validateRange(range: EstimationRange): RuleViolation[] {
	const errors: RuleViolation[] = [];
	if (!Number.isInteger(range.min) || range.min < 0) {
		errors.push({
			rule: 'FR-09',
			message: 'Minimum muss eine nicht-negative Ganzzahl sein',
			field: 'min'
		});
	}
	if (!Number.isInteger(range.max) || range.max < 0) {
		errors.push({
			rule: 'FR-09',
			message: 'Maximum muss eine nicht-negative Ganzzahl sein',
			field: 'max'
		});
	}
	if (errors.length === 0 && range.min >= range.max) {
		errors.push({
			rule: 'FR-09',
			message: 'Minimum muss kleiner als Maximum sein',
			field: 'min'
		});
	}
	return errors;
}

/**
 * Prüft und setzt einen neuen Wertebereich (FR-09): beide Grenzen müssen nicht-negative
 * Ganzzahlen sein, `min` muss kleiner als `max` sein (F-26, Abschnitt „Tests":
 * „Bereichsvalidierung (Min < Max, nicht-negativ)"). Bei Erfolg wird `estimationRange`
 * aktualisiert, zusammen mit dem aktuellen `estimationMode` gemerkt (FR-76) und der neue Bereich
 * zurückgegeben; bei einer Verletzung bleibt der Store unverändert und die gesammelten Verstöße
 * werden zurückgegeben — dasselbe Result/RuleViolation-Muster wie die Aggregatsoperationen in
 * src/lib/model/validation.ts (features/README.md, Leitplanke 3: keine Regel ein zweites Mal,
 * abweichend, in einer Komponente nachbilden — SettingsDialog.svelte zeigt nur die hier
 * zurückgegebenen Verstöße an den passenden Feldern, wie FeatureModal.svelte es mit den
 * Verstößen aus createFeature/editFeature hält).
 */
export function setEstimationRange(range: EstimationRange): Result<EstimationRange> {
	const errors = validateRange(range);
	if (errors.length > 0) return { ok: false, errors };

	estimationRange.set(range);
	persistSettings(get(estimationMode), range);
	return { ok: true, value: range };
}

/**
 * Automatischer Moduswechsel beim Import (F-26, Abschnitt „Automatischer Wechsel beim Import";
 * PRD FR-08, AK-19): enthält `map` einen impact- oder effort-Wert außerhalb der Fibonacci-Reihe
 * (FIBONACCI aus src/lib/model/types.ts), während `estimationMode` noch 'fibonacci' ist, wird
 * der Store auf 'free' gesetzt und die Einstellung gemerkt (FR-76). `estimationRange` bleibt
 * dabei unverändert beim zuletzt eingestellten Wert — ein Wert außerhalb davon wird wie jeder
 * abweichende Wert behandelt (FR-03/FR-09), nicht automatisch als neue Bereichsgrenze
 * übernommen. Enthält `map` keinen solchen Wert, oder ist der Modus bereits 'free', bleibt der
 * Store unverändert. Vom Aufrufer (ImportDialog.svelte, F-18) nach erfolgreicher Übernahme der
 * importierten Karte aufzurufen.
 */
export function applyEstimationModeAfterImport(map: FeatureMap): void {
	if (get(estimationMode) !== 'fibonacci') return;

	const fibonacciValues: readonly number[] = FIBONACCI;
	const hasDeviatingValue = map.features.some(
		(feature) =>
			!fibonacciValues.includes(feature.impact) || !fibonacciValues.includes(feature.effort)
	);
	if (!hasDeviatingValue) return;

	estimationMode.set('free');
	persistSettings('free', get(estimationRange));
}
