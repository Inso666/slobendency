<!--
	RelationRow (F-13 · features/F-13-feature-formular.md, Abschnitt "Umfang").

	Eine Zeile im Beziehungs-Abschnitt des Formulars: Ziel-Feature aus den bekannten Features
	(`candidateFeatures`, ohne das gerade bearbeitete Feature selbst), Art (`requires` /
	`relates` / `excludes`, in der Sprache der Oberfläche "benötigt" / "hängt zusammen" /
	"schließt aus", features/README.md, Ubiquitous Language) und optionale Beschriftung.
	Zeilen sind hinzufügbar und entfernbar (FR-06).

	Rumpf ist Aufgabe des Feature-Agenten. Data-testid `relation-row-<index>` auf dem
	Zeilen-Container (0-basiert, laufende Nummer der Zeile in der aktuellen Liste) — nötig, weil
	die Feldbeschriftungen "Ziel", "Art" und "Beschriftung" sich über mehrere Zeilen wiederholen
	und ohne Container-Kennzeichen nicht eindeutig ansprechbar wären
	(e2e/F-13-feature-formular.spec.ts).
-->
<script lang="ts">
	import type { Feature, FeatureId, RelationType } from '../../model/types';
	import type { RelationRowInput } from './relations';

	let {
		index,
		row,
		candidateFeatures,
		onChange,
		onRemove
	}: {
		index: number;
		row: RelationRowInput;
		candidateFeatures: Feature[];
		onChange: (index: number, row: RelationRowInput) => void;
		onRemove: (index: number) => void;
	} = $props();
</script>
