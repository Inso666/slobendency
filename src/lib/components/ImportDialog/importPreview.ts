// Vorschau- und Rückfrage-Logik des Import-Dialogs (F-18 · features/F-18-import.md, Abschnitte
// „Umfang" und „Verhalten").
//
// ImportDialog.svelte selbst interpretiert den eingefügten Text nicht (F-18, Abschnitt
// „DDD-Einordnung": „Der Dialog interpretiert den Text nicht selbst; er ruft `parse` auf und
// zeigt entweder die Vorschau oder die Fehlerliste"). Dieses Modul zieht die reine
// Entscheidungslogik aus der Komponente heraus — wie schon `listing.ts` (F-14), `detail.ts`
// (F-15) und `relations.ts`/`slugify.ts`/`scoreOptions.ts` (F-13) für ihre jeweilige
// Svelte-Komponente —, damit sie ohne Component-Testing-Bibliothek mit reinem Vitest geprüft
// werden kann. Frameworkfrei, ruft aber `parse` (F-05) auf statt eine zweite Übersetzung
// Text → Domäne zu erfinden (features/README.md, Leitplanke 3).
//
// Signatur ist vom Test-Agenten vorgegeben. Die Rümpfe sind Aufgabe des Feature-Agenten.

import { parse } from '../../dsl/parser';
import type { ParseError } from '../../dsl/errors';
import type { Feature, FeatureMap } from '../../model/types';

/** Zahl der in der Vorschau gezeigten Features (F-18, Abschnitt „Umfang": „die ersten acht
 * Features mit Lotung"). */
export const PREVIEW_FEATURE_LIMIT = 8;

/**
 * Zustand des Textfelds (F-18, Abschnitt „Tests": „Zustände des Dialogs (leer, fehlerhaft,
 * gültig, Rückfrage offen)" — die ersten drei bildet dieser Typ ab, den vierten
 * `replaceNeedsConfirmation()` unten).
 *
 * `empty` gilt ausschließlich für den (noch) nicht befüllten Zustand des Textfelds selbst —
 * nicht für ein Dokument, das fehlerfrei zu einer leeren Karte parst (das ist `valid` mit
 * `featureCount: 0`). Ein Textfeld, das nur aus Leerraum besteht, gilt ebenfalls als `empty`,
 * weil `parse()` eine reine Leerzeile ohnehin als fehlende Kopfzeile ablehnen würde (DSL-07)
 * und der Dialog vor der ersten Eingabe keine Fehlerliste zeigen soll (F-18, Abschnitt
 * „Umfang": „Großes Textfeld … zum Einfügen, Platzhalter mit dem Kopfzeilen-Beispiel").
 */
export type ImportPreview =
	| { kind: 'empty' }
	| { kind: 'invalid'; errors: ParseError[] }
	| {
			kind: 'valid';
			map: FeatureMap;
			/** Gesamtzahl der Features im Dokument (F-18: „n Features · m Beziehungen"). */
			featureCount: number;
			/** Gesamtzahl der Beziehungen im Dokument. */
			relationCount: number;
			/** Die ersten `PREVIEW_FEATURE_LIMIT` Features in Dokumentreihenfolge, mit Lotung
			 * anzuzeigen (F-18, Abschnitt „Umfang"). */
			preview: Feature[];
	  };

/**
 * Wertet den Inhalt des Textfelds aus (F-18, Abschnitt „Umfang": „Vorschau … bei fehlerfreiem
 * Text die Zahlen n Features · m Beziehungen sowie die ersten acht Features mit Lotung; bei
 * Fehlern die vollständige Fehlerliste", DSL-01, DSL-03). Ruft dafür ausschließlich `parse()`
 * (F-05) auf; die DSL-Grammatik und die Fachregeln (INT-01 bis INT-07) werden hier nicht ein
 * zweites Mal geprüft (features/README.md, Leitplanke 3).
 */
export function evaluateImportText(text: string): ImportPreview {
	if (text.trim() === '') {
		return { kind: 'empty' };
	}

	const result = parse(text);
	if (!result.ok) {
		return { kind: 'invalid', errors: result.errors };
	}

	return {
		kind: 'valid',
		map: result.map,
		featureCount: result.map.features.length,
		relationCount: result.map.relations.length,
		preview: result.map.features.slice(0, PREVIEW_FEATURE_LIMIT)
	};
}

/**
 * Entscheidet, ob die Übernahme einer gültig geparsten Karte zuerst die Rückfrage „Bestehende
 * Karte ersetzen?" braucht (F-18, Abschnitt „Verhalten": „Text fehlerfrei, Karte nicht leer" →
 * Rückfrage; „Text fehlerfrei, Karte leer" → *Übernehmen* ersetzt den Bestand direkt; FR-62).
 * Eine Karte mit Beziehungen hat nach INT-02 stets auch mindestens ein Feature — die Prüfung
 * auf `features.length` allein deckt deshalb beide Fälle ab.
 */
export function replaceNeedsConfirmation(currentMap: FeatureMap): boolean {
	return currentMap.features.length > 0;
}
