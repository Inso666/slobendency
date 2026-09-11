<!--
	SettingsDialog (F-26 · features/F-26-schaetzmodus.md, Abschnitte „Umfang" und
	„Darstellung").

	Einstellungsdialog für den Schätzmodus (FR-08) und den Wertebereich des freien Schätzmodus
	(FR-09) — erreichbar über das Menü „Ansicht ▾" im Kopfband (src/routes/+page.svelte,
	`view-menu-panel`, Menüeintrag „Einstellungen"; features/STATUS.md, Abschnitt
	„Entscheidungen des Orchestrators", Eintrag „PRD 1.1 — drei Erweiterungen aus
	Nutzergespräch (11.09.)": „Einstellungen … hängen am bestehenden Menü Ansicht ▾"). Ruft bei
	„Speichern" `setEstimationRange()` (src/lib/store/settings.ts) auf und zeigt dessen
	RuleViolations an den passenden Feldern; prüft selbst nichts, was `setEstimationRange()`
	bereits prüft (features/README.md, Leitplanke 3).

	Kartuschen-Bauart wie FeatureModal.svelte (F-13, features/F-13-feature-formular.md,
	Abschnitt „Darstellung"): natives `<dialog class="cartouche">`, ESC und Klick auf den
	Hintergrund schließen ohne zu speichern, Fokus wird beim Öffnen auf das erste Bedienelement
	gesetzt, bleibt im Dialog gefangen und kehrt beim Schließen auf das auslösende Element
	zurück (derselbe Rückkanal `onClose` wie bei FeatureModal.svelte/ImportDialog.svelte).

	Vom Test-Agenten festgelegter, vom Feature-Agenten zu rendernder Wortlaut/zugänglicher
	Aufbau (e2e/F-26-schaetzmodus.spec.ts, Kommentar am Dateianfang; kein pixelgenauer Entwurf
	vorhanden, design/README.md Abschnitt „Offen, unabhängig von der Richtung" — dieselbe Lage
	wie beim Import-Vorschau-Aufbau aus F-18):
	  - Dialog: role="dialog", zugänglicher Name „Einstellungen".
	  - Umschalter Schätzmodus: role="group", aria-label „Schätzmodus", zwei Knöpfe mit
	    aria-pressed — „Fibonacci" und „Frei" (dieselbe Bauart wie die übrigen Kopfband-/Menü-
	    Umschalter, z. B. „Hervorhebung", „Tafel", „Abdunkeln"/„Ausblenden").
	  - Wertebereich (nur bedienbar/sichtbar, wenn im Dialog aktuell „Frei" gewählt ist — F-26,
	    Akzeptanzkriterium „Ändern des Bereichs … wirkt sofort auf neu geöffnete Formulare"):
	    zwei Zahlenfelder über getByLabel „Minimum" und „Maximum".
	  - Knöpfe „Speichern" und „Abbrechen" (dasselbe Wortpaar wie FeatureModal.svelte).
	  - Verstöße aus setEstimationRange() erscheinen als Text neben den betroffenen Feldern
	    (dasselbe `.field-error`-Muster wie FeatureModal.svelte).

	Rumpf ist Aufgabe des Feature-Agenten — dieses Modul ist ein leeres Gerüst ohne Inhalt
	(CLAUDE.md, Abschnitt „Regeln für den Test-Agenten").
-->
<script lang="ts">
	let {
		open,
		onClose
	}: {
		/** Sichtbarkeit des Dialogs — dasselbe Muster wie FeatureModal.svelte (F-13),
		 * ImportDialog.svelte (F-18) und ExportDialog.svelte (F-19). */
		open: boolean;
		/** ESC, Klick auf den Hintergrund, „Abbrechen" und nach erfolgreichem „Speichern" — der
		 * Aufrufer unterscheidet diese Fälle nicht (dasselbe Muster wie die übrigen Dialoge). */
		onClose: () => void;
	} = $props();
</script>

{#if open}
	<!-- Leeres Gerüst — Rumpf ist Aufgabe des Feature-Agenten (siehe Kopfkommentar). -->
{/if}
