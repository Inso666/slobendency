<!--
	FeatureModal (F-13 · features/F-13-feature-formular.md, Abschnitt "Umfang").

	Modales Formular zum Anlegen und Bearbeiten eines Features (FR-01, FR-04). Ruft bei
	erfolgreicher Eingabe createFeature bzw. editFeature (src/lib/store/mapStore.ts) auf und
	zeigt deren RuleViolations an den passenden Feldern; prüft selbst nichts, was das Aggregat
	prüft (features/README.md, Leitplanke 3) — einzige Ausnahme ist die Sofortrückmeldung zur
	Zeichenmenge der Kennung (Abschnitt "DDD-Einordnung"). Beziehungen aus dem Beziehungs-
	Abschnitt (relations.ts, RelationRow.svelte) werden erst nach erfolgreichem Speichern des
	Features einzeln über createRelation angelegt; scheitert eine Zeile an einer Invariante,
	bleibt das Feature gespeichert und die betroffene Zeile zeigt den Fehler (Abschnitt
	"Fachregeln").

	Darstellung als Kartusche (.cartouche, design/03-seekarte.html) mit Rahmen aus --rule,
	Titel in Fraunces, Feldbeschriftungen in gesperrten Versalien in --ink-soft. ESC und Klick
	auf den Hintergrund schließen ohne zu speichern (Abschnitt "Darstellung"); der Fokus wird
	beim Öffnen auf das erste Feld (Anzeigename) gesetzt, bleibt im Modal gefangen und kehrt
	beim Schließen auf das auslösende Element zurück — `onClose` ist dafür der einzige
	Rückkanal, das auslösende Element selbst merkt sich der Aufrufer.

	Rumpf ist Aufgabe des Feature-Agenten. Data-testid, die er rendern muss, stehen im
	Abschlussbericht des Test-Agenten und als Kommentar in e2e/F-13-feature-formular.spec.ts:
	nur `relation-row-<index>` (RelationRow.svelte) ist neu; alle übrigen Elemente dieses
	Formulars werden über Rolle/Text angesprochen (Dialogname "Feature anlegen" /
	"Feature bearbeiten", Labels "Anzeigename" / "Kennung", Gruppen "Nutzen" / "Aufwand",
	Knöpfe "Speichern" / "Abbrechen" / "Beziehung hinzufügen").
-->
<script lang="ts">
	import type { Feature } from '../../model/types';

	/**
	 * `open` steuert Sichtbarkeit, `mode` unterscheidet Anlegen/Bearbeiten, `feature` liefert
	 * bei `mode: 'edit'` die vorzubefüllenden Werte (id, label, impact, effort). `onClose` wird
	 * bei ESC, Klick auf den Hintergrund und nach erfolgreichem Speichern aufgerufen.
	 */
	let {
		open,
		mode,
		feature = null,
		onClose
	}: {
		open: boolean;
		mode: 'create' | 'edit';
		feature?: Feature | null;
		onClose: () => void;
	} = $props();
</script>
