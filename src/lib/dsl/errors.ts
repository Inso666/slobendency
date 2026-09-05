// DSL-Fehlermodell (F-05 · features/F-05-dsl-parser.md, Abschnitt „Umfang").
//
// Ein ParseError bezieht sich immer auf genau eine Zeile des importierten Dokuments
// (DSL-01: Zeilennummer, Originalzeile, verständliche Ursache). Frameworkfrei — keine
// Svelte-, $app- oder DOM-Bezüge (features/README.md, Leitplanke 1).
//
// Signatur ist vom Test-Agenten vorgegeben, wörtlich aus der Featurebeschreibung übernommen.

/** Ein einzelner, zeilengenauer Fehler beim Einlesen eines DSL-Dokuments (DSL-01). */
export interface ParseError {
	/** 1-basierte Zeilennummer im Originaldokument. */
	line: number;
	/** Die Originalzeile, unverändert — auch bei abweichender Formatierung. */
	source: string;
	code: ParseErrorCode;
	/** Für Nutzer lesbare, deutsche Fehlermeldung. */
	message: string;
}

/** Fehlerarten, die der Parser unterscheidet (F-05, Abschnitt „Umfang"). */
export type ParseErrorCode =
	| 'headerMissing'
	| 'unsupportedVersion'
	| 'syntax'
	| 'duplicateId'
	| 'unknownReference'
	| 'selfReference'
	| 'duplicateRelation'
	| 'negativeValue'
	| 'missingAttribute'
	| 'valueTooLong';
