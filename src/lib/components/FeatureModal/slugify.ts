// FeatureModal · Slugify (F-13 · features/F-13-feature-formular.md, Abschnitt "Umfang",
// Unterabschnitt "Slugify").
//
// Reine Funktion, kein Framework-, DOM- oder Store-Bezug: Schlägt aus einem Anzeigenamen eine
// Kennung vor. Prüft nichts, was das Aggregat prüft (features/README.md, Leitplanke 3) — ob das
// Ergebnis als Kennung gültig ist (Zeichensatz, Eindeutigkeit), entscheidet
// src/lib/model/validation.ts, nicht diese Funktion.
//
// Regel (F-13, Abschnitt "Slugify"): Kleinbuchstaben, Umlaute nach "ae", "oe", "ue", "ß" nach
// "ss", alles Übrige außerhalb von [a-z0-9-] zu "-", mehrfache Bindestriche zusammengefasst, an
// den Enden getrimmt, auf 64 Zeichen gekürzt. Ergibt das leeren Text, bleibt das Feld leer.
//
// Signatur ist vom Test-Agenten vorgegeben. Rumpf ist Aufgabe des Feature-Agenten.

const UMLAUT_MAP: Record<string, string> = {
	ä: 'ae',
	ö: 'oe',
	ü: 'ue',
	ß: 'ss'
};

/** Schlägt aus einem Anzeigenamen eine Kennung vor (F-13, Abschnitt "Slugify"). */
export function slugify(input: string): string {
	const lower = input.toLowerCase();
	const withoutUmlauts = lower.replace(/[äöüß]/g, (match) => UMLAUT_MAP[match]);
	const withDashes = withoutUmlauts.replace(/[^a-z0-9-]+/g, '-');
	const collapsed = withDashes.replace(/-+/g, '-');
	const trimmed = collapsed.replace(/^-+|-+$/g, '');
	return trimmed.slice(0, 64);
}
