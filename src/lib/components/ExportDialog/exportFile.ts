// ExportDialog · Hilfsfunktionen für Dateiname und Inhalt (F-19 · features/F-19-export-dsl.md,
// Abschnitt „Umfang").
//
// Frei von Svelte-, DOM- oder Blob-Bezügen, damit Dateiname und Inhalt ohne mount unit-testbar
// sind (features/README.md, Leitplanke 1 gilt sinngemäß: reine Formatierungslogik gehört nicht
// in die Komponente). Das eigentliche Anlegen des Blobs und Auslösen des Downloads bleibt
// Infrastruktur in ExportDialog.svelte (F-19, Abschnitt „DDD-Einordnung": „Zwischenablage und
// Download — beides Infrastruktur, die nicht in die Domäne gehört").
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf ist Aufgabe des Feature-Agenten.

import type { FeatureMap } from '../../model/types';

/** Inhaltstyp der heruntergeladenen Datei (F-19, Abschnitt „Umfang": „Inhaltstyp
 * text/plain;charset=utf-8"). */
export const EXPORT_MIME_TYPE = 'text/plain;charset=utf-8';

/**
 * Dateiname für den Download: `featuremap-JJJJ-MM-TT.fmap` mit dem übergebenen Datum (F-19,
 * Abschnitt „Umfang": „Dateiname featuremap-JJJJ-MM-TT.fmap mit dem aktuellen Datum"). Das
 * aktuelle Datum liefert der Aufrufer (ExportDialog.svelte) — die Funktion selbst bleibt mit
 * einem festen Datum testbar, statt sich auf die Systemuhr zu verlassen.
 */
export function exportFilename(date: Date): string {
	throw new Error('not implemented');
}

/**
 * Inhalt der Export-Datei bzw. des in die Zwischenablage kopierten Texts, zusammen mit dem
 * Inhaltstyp für den Blob. Der Inhalt ist unverändert das Ergebnis von serialize() (F-06) — diese
 * Funktion formatiert nichts um (DSL-14: „Der angezeigte Text ist derselbe, den ein erneuter
 * Export erzeugt").
 */
export function exportFileContent(map: FeatureMap): { content: string; mimeType: string } {
	throw new Error('not implemented');
}
