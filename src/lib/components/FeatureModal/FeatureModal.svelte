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
	import { onMount } from 'svelte';
	import type { Feature, FeatureId, RelationType } from '../../model/types';
	import { FIBONACCI } from '../../model/types';
	import type { RuleViolation } from '../../model/validation';
	import { createFeature, createRelation, editFeature, map } from '../../store/mapStore';
	import { renameFeatureId } from '../../store/mapStore';
	import { slugify } from './slugify';
	import { relationsFromRows, type RelationRowInput } from './relations';
	import ScoreSelect from './ScoreSelect.svelte';
	import RelationRow from './RelationRow.svelte';

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

	const title = mode === 'create' ? 'Feature anlegen' : 'Feature bearbeiten';
	const originalId: FeatureId | null = feature?.id ?? null;

	// Formularfelder — lokaler Zustand, initialisiert aus `feature` im Bearbeitungsmodus. Das
	// Formular prüft hier nichts, was das Aggregat prüft (features/README.md, Leitplanke 3);
	// die einzige Ausnahme sind die Sofortrückmeldungen zur Zeichenmenge über `maxlength`
	// (F-13, Abschnitt „DDD-Einordnung").
	let labelValue = $state(feature?.label ?? '');
	let idValue = $state(feature?.id ?? '');
	// FR-07 gilt nur beim Anlegen: Im Bearbeitungsmodus folgt die Kennung dem Anzeigenamen nie.
	let idEditedManually = $state(mode === 'edit');
	let impact = $state(feature?.impact ?? FIBONACCI[0]);
	let effort = $state(feature?.effort ?? FIBONACCI[0]);

	// Beziehungs-Abschnitt: ausschließlich neu hinzuzufügende Zeilen (F-13, Abschnitt
	// „Fachregeln" — bestehende Beziehungen ändern oder löschen ist F-17, nicht F-13).
	let rows = $state<RelationRowInput[]>([]);
	let rowErrors = $state<Array<string | undefined>>([]);

	let idError = $state<string | undefined>(undefined);
	let labelError = $state<string | undefined>(undefined);
	let generalError = $state<string | undefined>(undefined);

	let dialogEl: HTMLDialogElement;
	let firstFieldEl: HTMLInputElement;

	/** Bekannte Features als Ziel-Kandidaten, ohne das gerade bearbeitete Feature selbst
	 * (RelationRow.svelte, Kommentar am Dateianfang). */
	let candidateFeatures = $derived($map.features.filter((f) => f.id !== originalId));

	onMount(() => {
		dialogEl.showModal();
		firstFieldEl.focus();
	});

	const FOCUSABLE_SELECTOR =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	/**
	 * Manuelle Fokusfalle (F-13-AK: „der Fokus bleibt im Modal gefangen, solange es offen
	 * ist."). Das native `<dialog>` macht die Karte dahinter zwar unerreichbar, lässt den
	 * Fokus beim Tabben über das letzte Element hinaus aber kurz auf `<body>` fallen, bevor er
	 * beim nächsten Tab wieder ins Formular zurückspringt — das zählt bereits als „außerhalb
	 * des Modals" und wird hier verhindert, indem Tab/Shift+Tab am Rand der Fokusreihenfolge
	 * selbst auf das jeweils andere Ende springen.
	 *
	 * Zusätzlich wird ein Escape-Tastendruck hier per `stopPropagation()` von der Karte
	 * ferngehalten: Das native `<dialog>` schließt sich bei Escape unabhängig davon, ob das
	 * zugehörige `keydown` weiterläuft (das Schließen ist eine Default-Aktion des Browsers,
	 * keine Reaktion auf einen Bubbling-Listener) — ohne dieses `stopPropagation()` erreicht
	 * dasselbe `keydown` aber zusätzlich den globalen Escape-Listener der Karte
	 * (MapCanvas.svelte, F-11-AK „ESC hebt Selektion auf") und hebt die Selektion des gerade
	 * bearbeiteten Features nebenbei mit auf — ein Bruch, den Escape hier nicht auslösen darf
	 * (F-13, Abschnitt „Darstellung": Escape ist ausschließlich fürs Schließen des Formulars
	 * zuständig, siehe QA-Befund F-13).
	 */
	function handleTrapKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.stopPropagation();
			return;
		}
		if (event.key !== 'Tab') return;

		const focusable = Array.from(dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
		if (focusable.length === 0) return;

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (event.shiftKey) {
			if (active === first) {
				event.preventDefault();
				last.focus();
			}
		} else if (active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleLabelInput(event: Event): void {
		labelValue = (event.currentTarget as HTMLInputElement).value;
		if (mode === 'create' && !idEditedManually) {
			idValue = slugify(labelValue);
		}
	}

	function handleIdInput(event: Event): void {
		idValue = (event.currentTarget as HTMLInputElement).value;
		idEditedManually = true;
	}

	/** Klick auf den Hintergrund (F-13, Abschnitt „Darstellung"): das native `<dialog>` liefert
	 * bei Klick auf sein Backdrop ein Click-Event mit `target === dialogEl` selbst, weil der
	 * gesamte sichtbare Inhalt in einem Kind-Element liegt. */
	function handleDialogClick(event: MouseEvent): void {
		if (event.target === dialogEl) {
			dialogEl.close();
		}
	}

	/** Läuft bei jedem Schließen — ESC (Standardverhalten des Dialogs), Klick auf den
	 * Hintergrund, Abbrechen und nach erfolgreichem Speichern — und ist der einzige Rückkanal
	 * zum Aufrufer (Kommentar am Dateianfang). */
	function handleDialogClose(): void {
		onClose();
	}

	function addRow(): void {
		const firstCandidate = candidateFeatures[0];
		rows = [...rows, { targetId: firstCandidate?.id ?? '', type: 'requires', label: '' }];
		rowErrors = [...rowErrors, undefined];
	}

	function updateRow(index: number, row: RelationRowInput): void {
		rows = rows.map((current, i) => (i === index ? row : current));
	}

	function removeRow(index: number): void {
		rows = rows.filter((_, i) => i !== index);
		rowErrors = rowErrors.filter((_, i) => i !== index);
	}

	/** Verteilt die Fehler einer Aggregatsoperation an das passende Feld — formuliert dabei
	 * keine Regel neu, sondern übernimmt Wortlaut und Feldzuordnung unverändert aus dem
	 * Ergebnis (features/README.md, Leitplanke 3). */
	function applyErrors(errors: RuleViolation[]): void {
		for (const error of errors) {
			if (error.field === 'id') idError = error.message;
			else if (error.field === 'label') labelError = error.message;
			else generalError = error.message;
		}
	}

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();

		idError = undefined;
		labelError = undefined;
		generalError = undefined;

		const featureLabel = labelValue === '' ? undefined : labelValue;
		let currentId: FeatureId;

		if (mode === 'create') {
			const result = createFeature({ id: idValue, label: featureLabel, impact, effort });
			if (!result.ok) {
				applyErrors(result.errors);
				return;
			}
			currentId = idValue;
		} else {
			currentId = originalId as FeatureId;
			if (idValue !== originalId) {
				const renamed = renameFeatureId(originalId as FeatureId, idValue);
				if (!renamed.ok) {
					applyErrors(renamed.errors);
					return;
				}
				currentId = idValue;
			}
			const updated = editFeature(currentId, { label: featureLabel, impact, effort });
			if (!updated.ok) {
				applyErrors(updated.errors);
				return;
			}
		}

		// Beziehungen aus dem Formular werden erst nach dem erfolgreichen Speichern des Features
		// angelegt; scheitert eine einzelne Zeile an einer Invariante, bleibt das Feature
		// gespeichert und die betroffene Zeile zeigt den Fehler (F-13, Abschnitt „Fachregeln").
		const relations = relationsFromRows(currentId, rows);
		const nextRowErrors: Array<string | undefined> = rows.map(() => undefined);
		for (let i = 0; i < relations.length; i++) {
			const result = createRelation(relations[i]);
			if (!result.ok) {
				nextRowErrors[i] = result.errors.map((e) => e.message).join('; ');
			}
		}
		rowErrors = nextRowErrors;

		if (nextRowErrors.every((message) => message === undefined)) {
			dialogEl.close();
		}
	}

	function handleCancel(): void {
		dialogEl.close();
	}
</script>

{#if open}
	<!--
		`role="dialog"` ist am nativen <dialog>-Element redundant (dessen implizite Rolle ist
		bereits „dialog") — hier trotzdem explizit gesetzt, weil der Fokusfallen-Test in
		e2e/F-13-feature-formular.spec.ts über document.querySelector('[role="dialog"]') statt
		über den Accessibility-Baum fährt, der kein Attribut, sondern die berechnete Rolle sieht.
	-->
	<dialog
		bind:this={dialogEl}
		class="feature-modal cartouche"
		role="dialog"
		aria-labelledby="feature-modal-title"
		onclick={handleDialogClick}
		onclose={handleDialogClose}
		onkeydown={handleTrapKeydown}
	>
		<form class="feature-form" onsubmit={handleSubmit}>
			<h2 id="feature-modal-title">{title}</h2>

			{#if generalError}
				<p class="field-error">{generalError}</p>
			{/if}

			<div class="field">
				<label>
					Anzeigename
					<input
						type="text"
						maxlength="200"
						bind:this={firstFieldEl}
						value={labelValue}
						oninput={handleLabelInput}
					/>
				</label>
			</div>

			<div class="field">
				<label>
					Kennung
					<input type="text" maxlength="64" value={idValue} oninput={handleIdInput} />
				</label>
				{#if idError}
					<p class="field-error">{idError}</p>
				{/if}
			</div>

			<div class="field score-field">
				<span class="caption">Nutzen</span>
				<ScoreSelect label="Nutzen" value={impact} onSelect={(value) => (impact = value)} />
			</div>

			<div class="field score-field">
				<span class="caption">Aufwand</span>
				<ScoreSelect label="Aufwand" value={effort} onSelect={(value) => (effort = value)} />
			</div>

			{#if labelError}
				<p class="field-error">{labelError}</p>
			{/if}

			<div class="relations">
				<span class="caption">Beziehungen</span>
				{#each rows as row, index (index)}
					<RelationRow
						{index}
						{row}
						{candidateFeatures}
						onChange={updateRow}
						onRemove={removeRow}
						error={rowErrors[index]}
					/>
				{/each}
				<button type="button" class="add-relation" onclick={addRow}>Beziehung hinzufügen</button>
			</div>

			<div class="actions">
				<button type="button" class="btn" onclick={handleCancel}>Abbrechen</button>
				<button type="submit" class="btn pri">Speichern</button>
			</div>
		</form>
	</dialog>
{/if}

<style>
	.feature-modal {
		padding: 0;
		margin: auto;
		width: min(90vw, 480px);
		max-height: 86vh;
		overflow: auto;
		color: var(--ink);
	}
	.feature-modal::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.feature-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px 20px;
	}
	.feature-form h2 {
		margin: 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 19px;
		letter-spacing: 0.005em;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.field label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 10.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.field label input {
		font: inherit;
		text-transform: none;
		letter-spacing: normal;
		font-size: 14px;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--hair);
		padding: 8px 9px;
	}
	.field label input:focus-visible {
		border-color: var(--ink);
	}
	.caption {
		display: block;
		font-size: 10.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.score-field {
		gap: 6px;
	}
	.relations {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 4px;
		border-top: 1px solid var(--hair);
	}
	.add-relation {
		align-self: flex-start;
		background: transparent;
		border: 1px solid var(--hair);
		color: var(--ink);
		padding: 7px 11px;
		font-size: 13px;
		cursor: pointer;
	}
	.add-relation:hover {
		border-color: var(--ink);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 6px;
		border-top: 1px solid var(--hair);
	}
	.field-error {
		margin: 0;
		font-size: 12px;
		color: var(--magenta);
	}

	/* UI-13: Modale Formulare füllen unter 768 px den Bildschirm (F-13, Abschnitt
	   „Darstellung"). */
	@media (max-width: 768px) {
		.feature-modal {
			width: 100vw;
			max-width: none;
			height: 100vh;
			max-height: none;
			margin: 0;
			inset: 0;
		}
		/* F-22, Abschnitt „Trefferflächen"/UI-16: „Beziehung hinzufügen" ist ein Knopf wie jeder
		   andere in diesem Formular (app.css setzt dieselbe Mindesthöhe bereits für die
		   gemeinsame `.btn`-Klasse — dieser Knopf trägt sie nicht, deshalb hier eigens). */
		.add-relation {
			min-height: 44px;
		}
	}
</style>
