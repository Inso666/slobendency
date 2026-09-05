<!--
	FeatureListRow (F-14 · features/F-14-verzeichnis.md, Abschnitt "Umfang").

	Ein Eintrag im Verzeichnis: Anzeigename (`label` ?? `id`, Ubiquitous Language), Punktführung
	und Lotung `impact · effort` in Azeret Mono (design/03-seekarte.html, `.entry`). Ist `selected`
	gesetzt, erhält der Eintrag den Hintergrund --shallow und halbfetten Namen (`.entry.here`).
	Die Aktionen "Bearbeiten", "Löschen" und "Beziehung anlegen" (FR-55) sind bei Hover und bei
	Tastaturfokus sichtbar (F-14, Abschnitt "Verhalten") und rufen ausschließlich die übergebenen
	Callbacks auf — welche Aggregatsoperation daraus folgt (deleteFeature, die Rückfrage nach
	FR-05, connectSource), entscheidet FeatureList.svelte, nicht diese Zeile.

	Rumpf ist Aufgabe des Feature-Agenten. Data-testid `directory-row-<id>` auf dem
	Zeilen-Container (Feature-Kennung, global eindeutig) — nötig, weil sich die Beschriftungen
	"Bearbeiten", "Löschen" und "Beziehung anlegen" über alle Zeilen wiederholen und ohne
	Container-Kennzeichen nicht eindeutig ansprechbar wären (e2e/F-14-verzeichnis.spec.ts).
-->
<script lang="ts">
	import type { Feature, FeatureId } from '../../model/types';

	let {
		feature,
		selected,
		onSelect,
		onEdit,
		onDelete,
		onConnect
	}: {
		feature: Feature;
		selected: boolean;
		onSelect: (id: FeatureId) => void;
		onEdit: (id: FeatureId) => void;
		onDelete: (id: FeatureId) => void;
		onConnect: (id: FeatureId) => void;
	} = $props();
</script>
