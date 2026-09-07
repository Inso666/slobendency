// Domänenmodell (F-02 · features/F-02-domaenenmodell.md, Abschnitt „Umfang").
//
// Prüffunktionen und Aggregatsoperationen auf FeatureMap. Jede Operation gibt eine neue
// Karte oder eine Fehlerliste zurück, statt ihr Argument zu mutieren
// (features/README.md, Leitplanke 2). Frameworkfrei — keine Svelte-, $app- oder
// DOM-Bezüge (Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.

import { SCHEMA_VERSION } from './types';
import type { Feature, FeatureId, FeatureMap, Quadrant, Relation } from './types';

/** Verletzung einer Fachregel. `rule` benennt die Regel (z. B. „INT-01"). */
export interface RuleViolation {
	rule: string;
	message: string;
	field?: string;
}

/** Ergebnis einer Aggregatsoperation: entweder eine neue Karte oder gesammelte Fehler. */
export type Result<T> = { ok: true; value: T } | { ok: false; errors: RuleViolation[] };

// Zeichensatz nach PRD 4.2 (Grammatik, `identifier = (letter | "_"), { letter | digit | "_" | "-" }`),
// maßgeblich gegenüber dem weiteren Zeichensatz aus PRD 3.1 — Entscheidung des Orchestrators,
// features/STATUS.md, Abschnitt „Entscheidungen des Orchestrators": eine Kennung muss mit einem
// Buchstaben oder Unterstrich beginnen; Ziffer und Bindestrich sind nur an Folgepositionen erlaubt.
const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const ID_MAX_LENGTH = 64;
const LABEL_MAX_LENGTH = 200;
const RELATION_LABEL_MAX_LENGTH = 120;

function ok<T>(value: T): Result<T> {
	return { ok: true, value };
}

function fail<T>(errors: RuleViolation[]): Result<T> {
	return { ok: false, errors };
}

/** Prüft die Kennung: erforderlich, Zeichensatz, maximale Länge (F-02, NFR-23). */
function validateId(id: FeatureId): RuleViolation[] {
	const errors: RuleViolation[] = [];
	if (id.length === 0) {
		errors.push({ rule: 'FIELD', message: 'Kennung darf nicht leer sein', field: 'id' });
		return errors;
	}
	if (id.length > ID_MAX_LENGTH) {
		errors.push({
			rule: 'FIELD',
			message: `Kennung darf höchstens ${ID_MAX_LENGTH} Zeichen lang sein`,
			field: 'id'
		});
	}
	if (!ID_PATTERN.test(id)) {
		errors.push({
			rule: 'FIELD',
			message:
				'Kennung muss mit einem Buchstaben oder „_" beginnen und darf danach nur Buchstaben, Ziffern, „_" und „-" enthalten',
			field: 'id'
		});
	}
	return errors;
}

/** Prüft den optionalen Anzeigenamen: maximale Länge, keine Anführungszeichen, kein Zeilenumbruch. */
function validateLabel(label: string | undefined, field: string): RuleViolation[] {
	if (label === undefined) return [];
	const errors: RuleViolation[] = [];
	if (label.length > LABEL_MAX_LENGTH) {
		errors.push({
			rule: 'FIELD',
			message: `Anzeigename darf höchstens ${LABEL_MAX_LENGTH} Zeichen lang sein`,
			field
		});
	}
	if (label.includes('"')) {
		errors.push({
			rule: 'FIELD',
			message: 'Anzeigename darf kein Anführungszeichen enthalten',
			field
		});
	}
	if (label.includes('\n')) {
		errors.push({
			rule: 'FIELD',
			message: 'Anzeigename darf keinen Zeilenumbruch enthalten',
			field
		});
	}
	return errors;
}

/** Prüft die optionale Kantenbeschriftung: maximale Länge, keine Anführungszeichen, kein Zeilenumbruch. */
function validateRelationLabel(label: string | undefined): RuleViolation[] {
	if (label === undefined) return [];
	const errors: RuleViolation[] = [];
	if (label.length > RELATION_LABEL_MAX_LENGTH) {
		errors.push({
			rule: 'FIELD',
			message: `Kantenbeschriftung darf höchstens ${RELATION_LABEL_MAX_LENGTH} Zeichen lang sein`,
			field: 'label'
		});
	}
	if (label.includes('"')) {
		errors.push({
			rule: 'FIELD',
			message: 'Kantenbeschriftung darf kein Anführungszeichen enthalten',
			field: 'label'
		});
	}
	if (label.includes('\n')) {
		errors.push({
			rule: 'FIELD',
			message: 'Kantenbeschriftung darf keinen Zeilenumbruch enthalten',
			field: 'label'
		});
	}
	return errors;
}

/** Prüft INT-07: impact/effort sind nicht-negative Ganzzahlen. */
function validateNonNegativeInteger(value: number, field: string): RuleViolation[] {
	if (!Number.isInteger(value) || value < 0) {
		return [
			{
				rule: 'INT-07',
				message: `${field} muss eine nicht-negative Ganzzahl sein`,
				field
			}
		];
	}
	return [];
}

/** Prüft die Feldregeln eines Features (ohne Eindeutigkeit der Kennung). */
function validateFeatureFields(feature: Feature): RuleViolation[] {
	return [
		...validateId(feature.id),
		...validateLabel(feature.label, 'label'),
		...validateNonNegativeInteger(feature.impact, 'impact'),
		...validateNonNegativeInteger(feature.effort, 'effort')
	];
}

/** Liefert eine leere Karte mit aktueller Schemaversion. */
export function emptyMap(): FeatureMap {
	return { schemaVersion: SCHEMA_VERSION, features: [], relations: [] };
}

/** Fügt ein Feature hinzu. Prüft INT-01, INT-07 sowie die Feldregeln für Kennung und Label. */
export function addFeature(map: FeatureMap, feature: Feature): Result<FeatureMap> {
	const errors = validateFeatureFields(feature);

	if (map.features.some((existing) => existing.id === feature.id)) {
		errors.push({ rule: 'INT-01', message: 'Kennung ist bereits vergeben', field: 'id' });
	}

	if (errors.length > 0) return fail(errors);

	return ok({ ...map, features: [...map.features, { ...feature }] });
}

/** Ändert ein bestehendes Feature. Prüft dieselben Feldregeln wie addFeature. */
export function updateFeature(
	map: FeatureMap,
	id: FeatureId,
	patch: Partial<Feature>
): Result<FeatureMap> {
	const existing = map.features.find((f) => f.id === id);
	if (!existing) {
		return fail([{ rule: 'NOT_FOUND', message: 'Feature nicht gefunden', field: 'id' }]);
	}

	const updated: Feature = { ...existing, ...patch, id: existing.id };
	const errors = validateFeatureFields(updated);

	if (errors.length > 0) return fail(errors);

	return ok({
		...map,
		features: map.features.map((f) => (f.id === id ? updated : f))
	});
}

/** Benennt die Kennung eines Features um und zieht alle Referenzen in relations nach (INT-06). */
export function renameFeature(map: FeatureMap, from: FeatureId, to: FeatureId): Result<FeatureMap> {
	const existing = map.features.find((f) => f.id === from);
	if (!existing) {
		return fail([{ rule: 'NOT_FOUND', message: 'Feature nicht gefunden', field: 'id' }]);
	}

	const errors = validateId(to);

	if (from !== to && map.features.some((f) => f.id === to)) {
		errors.push({ rule: 'INT-01', message: 'Kennung ist bereits vergeben', field: 'id' });
	}

	if (errors.length > 0) return fail(errors);

	return ok({
		...map,
		features: map.features.map((f) => (f.id === from ? { ...f, id: to } : f)),
		relations: map.relations.map((r) => ({
			...r,
			from: r.from === from ? to : r.from,
			to: r.to === from ? to : r.to
		}))
	});
}

/** Entfernt ein Feature und alle seine Beziehungen (INT-02, AK-09). */
export function removeFeature(map: FeatureMap, id: FeatureId): FeatureMap {
	return {
		...map,
		features: map.features.filter((f) => f.id !== id),
		relations: map.relations.filter((r) => r.from !== id && r.to !== id)
	};
}

/**
 * Prüft INT-04 (kein doppeltes Tripel `from`/`to`/`type`) für `candidate` gegen `relations`.
 * Einzige Prüfstelle dieser Regel (features/README.md, Leitplanke 3) — sowohl addRelation als
 * auch updateRelation rufen diese Funktion auf, statt die Regel je Aggregatsoperation erneut zu
 * formulieren. `excludeIndex` nimmt beim Bearbeiten die zu ändernde Beziehung selbst von der
 * Prüfung aus, sonst schlüge jede unveränderte Bearbeitung am eigenen Tripel fehl.
 */
function findDuplicateTriple(
	relations: Relation[],
	candidate: Pick<Relation, 'from' | 'to' | 'type'>,
	excludeIndex?: number
): RuleViolation[] {
	const duplicate = relations.some(
		(r, i) =>
			i !== excludeIndex && r.from === candidate.from && r.to === candidate.to && r.type === candidate.type
	);
	return duplicate ? [{ rule: 'INT-04', message: 'Beziehung existiert bereits' }] : [];
}

/** Fügt eine Beziehung hinzu. Prüft INT-02, INT-03, INT-04 sowie die Feldregeln für Kantenlabels. */
export function addRelation(map: FeatureMap, relation: Relation): Result<FeatureMap> {
	const errors: RuleViolation[] = [];

	const sourceExists = map.features.some((f) => f.id === relation.from);
	const targetExists = map.features.some((f) => f.id === relation.to);
	if (!sourceExists) {
		errors.push({ rule: 'INT-02', message: 'Quelle der Beziehung existiert nicht', field: 'from' });
	}
	if (!targetExists) {
		errors.push({ rule: 'INT-02', message: 'Ziel der Beziehung existiert nicht', field: 'to' });
	}

	if (relation.from === relation.to) {
		errors.push({ rule: 'INT-03', message: 'Beziehung darf nicht auf sich selbst verweisen' });
	}

	errors.push(...findDuplicateTriple(map.relations, relation));
	errors.push(...validateRelationLabel(relation.label));

	if (errors.length > 0) return fail(errors);

	return ok({ ...map, relations: [...map.relations, { ...relation }] });
}

/**
 * Ändert Typ und/oder Label einer bestehenden Beziehung anhand ihres Index in relations
 * (F-17, Abschnitt "DDD-Einordnung": `Relation` ist ein Value Object, eine Änderung ist
 * fachlich ein Ersetzen). `from`/`to` bleiben dabei unveränderlich gesperrt — INT-03 gilt
 * beim Bearbeiten ebenso wie beim Anlegen, nach demselben Muster, mit dem updateFeature oben
 * die Kennung sperrt. Prüft INT-04 über dieselbe Prüfstelle wie addRelation
 * (findDuplicateTriple), ohne die Regel hier ein zweites Mal zu formulieren
 * (features/README.md, Leitplanke 3).
 */
export function updateRelation(
	map: FeatureMap,
	index: number,
	patch: Partial<Relation>
): Result<FeatureMap> {
	if (index < 0 || index >= map.relations.length) {
		return fail([{ rule: 'NOT_FOUND', message: 'Beziehung nicht gefunden' }]);
	}

	const existing = map.relations[index];
	const updated: Relation = { ...existing, ...patch, from: existing.from, to: existing.to };
	const errors: RuleViolation[] = [];

	errors.push(...findDuplicateTriple(map.relations, updated, index));
	errors.push(...validateRelationLabel(updated.label));

	if (errors.length > 0) return fail(errors);

	return ok({
		...map,
		relations: map.relations.map((r, i) => (i === index ? updated : r))
	});
}

/** Entfernt eine Beziehung aus der Karte. */
export function removeRelation(map: FeatureMap, relation: Relation): FeatureMap {
	return {
		...map,
		relations: map.relations.filter(
			(r) =>
				!(
					r.from === relation.from &&
					r.to === relation.to &&
					r.type === relation.type &&
					r.label === relation.label
				)
		)
	};
}

/** Liefert alle ein- und ausgehenden Beziehungen eines Features. */
export function relationsOf(
	map: FeatureMap,
	id: FeatureId
): { outgoing: Relation[]; incoming: Relation[] } {
	return {
		outgoing: map.relations.filter((r) => r.from === id),
		incoming: map.relations.filter((r) => r.to === id)
	};
}

/** Leitet das Revier eines Wertepaars aus der Obergrenze des Wertebereichs ab (nie gespeichert). */
export function quadrantOf(score: { impact: number; effort: number }, domainMax: number): Quadrant {
	const threshold = domainMax / 2;
	const highImpact = score.impact >= threshold;
	const highEffort = score.effort >= threshold;

	if (highImpact && highEffort) return 'grosseVorhaben';
	if (highImpact && !highEffort) return 'quickWins';
	if (!highImpact && highEffort) return 'vermeiden';
	return 'nebenbei';
}
