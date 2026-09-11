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

	Umsetzung (Feature-Agent): „Speichern" hält den gewählten Modus/Bereich zunächst nur als
	lokalen Formularzustand (dasselbe Muster wie FeatureModal.svelte, F-13 — Klick auf
	„Fibonacci"/„Frei" ändert also noch NICHT den globalen estimationMode-Store, sonst zeigte ein
	danach mit ESC verworfener Wechsel bereits Wirkung). Erst „Speichern" übernimmt beide Werte:
	`estimationMode.set(mode)` unmittelbar vor `setEstimationRange()`, damit dessen interne
	Persistenz (FR-76) den neuen Modus zusammen mit dem geprüften Bereich merkt; scheitert die
	Prüfung (FR-09), wird `estimationMode` auf den vorherigen Wert zurückgesetzt, die Verstöße
	erscheinen an Minimum/Maximum, der Dialog bleibt offen (dasselbe Result/RuleViolation-Muster
	wie FeatureModal.svelte, features/README.md Leitplanke 3). Im Modus Fibonacci sind Minimum/
	Maximum weder sichtbar noch bedienbar; `setEstimationRange()` wird trotzdem mit dem zuletzt
	gültigen, unveränderten Bereich aufgerufen — die einzige Stelle, die persistiert (Kommentar
	in src/lib/store/settings.ts: „Persistiert wird über initSettings()/setEstimationRange(),
	nicht durch den Store selbst"), sonst überstünde ein reiner Moduswechsel zurück auf Fibonacci
	kein Neuladen (FR-76).
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { RuleViolation } from '../../model/validation';
	import {
		estimationMode,
		estimationRange,
		setEstimationRange,
		type EstimationMode
	} from '../../store/settings';

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

	// Lokaler Formularzustand, initialisiert aus den aktuellen Stores (F-26, Kopfkommentar oben:
	// erst „Speichern" übernimmt ihn in estimationMode/estimationRange).
	let mode = $state<EstimationMode>($estimationMode);
	let minValue = $state($estimationRange.min);
	let maxValue = $state($estimationRange.max);

	let minError = $state<string | undefined>(undefined);
	let maxError = $state<string | undefined>(undefined);
	let generalError = $state<string | undefined>(undefined);

	let dialogEl: HTMLDialogElement | undefined = $state();
	let firstFieldEl: HTMLButtonElement | undefined = $state();

	onMount(() => {
		dialogEl?.showModal();
		firstFieldEl?.focus();
	});

	// Manuelle Fokusfalle plus Escape-stopPropagation — unverändert aus FeatureModal.svelte
	// übernommen (F-13, Kommentar dort erklärt beide Verhalten ausführlich; F-26, Abschnitt
	// „Darstellung": „Feldbeschriftungen und Verhalten … wie in F-13").
	const FOCUSABLE_SELECTOR =
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function handleTrapKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.stopPropagation();
			return;
		}
		if (event.key !== 'Tab') return;
		if (!dialogEl) return;

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

	function chooseMode(next: EstimationMode): void {
		mode = next;
	}

	/** Verteilt die Verstöße aus setEstimationRange() an Minimum/Maximum — formuliert dabei keine
	 * Regel neu (features/README.md, Leitplanke 3), analog zu applyErrors() in
	 * FeatureModal.svelte. */
	function applyErrors(errors: RuleViolation[]): void {
		for (const error of errors) {
			if (error.field === 'min') minError = error.message;
			else if (error.field === 'max') maxError = error.message;
			else generalError = error.message;
		}
	}

	function handleSubmit(event: SubmitEvent): void {
		event.preventDefault();

		minError = undefined;
		maxError = undefined;
		generalError = undefined;

		const previousMode = $estimationMode;
		estimationMode.set(mode);

		const result = setEstimationRange({ min: minValue, max: maxValue });
		if (!result.ok) {
			estimationMode.set(previousMode);
			applyErrors(result.errors);
			return;
		}

		dialogEl?.close();
	}

	function handleCancel(): void {
		dialogEl?.close();
	}

	/** Klick auf den Hintergrund — wie FeatureModal.svelte (F-13) liefert das native `<dialog>`
	 * dabei ein Click-Event mit `target === dialogEl` selbst. */
	function handleDialogClick(event: MouseEvent): void {
		if (event.target === dialogEl) dialogEl?.close();
	}

	/** Läuft bei jedem Schließen — ESC, Klick auf den Hintergrund, „Abbrechen" und nach
	 * erfolgreichem „Speichern" — und ist der einzige Rückkanal zum Aufrufer. */
	function handleDialogClose(): void {
		onClose();
	}
</script>

{#if open}
	<!-- Kein explizites role="dialog": anders als FeatureModal.svelte (dessen eigener
		Fokusfallen-Test über document.querySelector('[role="dialog"]') fährt) greifen
		e2e/F-26-schaetzmodus.spec.ts ausschließlich über getByRole (Accessibility-Baum) zu, den
		das native <dialog>-Element bereits ohne das redundante Attribut korrekt bedient. -->
	<dialog
		bind:this={dialogEl}
		class="settings-dialog cartouche"
		aria-labelledby="settings-dialog-title"
		onclick={handleDialogClick}
		onclose={handleDialogClose}
		onkeydown={handleTrapKeydown}
	>
		<form class="settings-form" onsubmit={handleSubmit}>
			<h2 id="settings-dialog-title">Einstellungen</h2>

			{#if generalError}
				<p class="field-error">{generalError}</p>
			{/if}

			<div class="field">
				<span class="caption">Schätzmodus</span>
				<span class="sw" role="group" aria-label="Schätzmodus">
					<button
						type="button"
						bind:this={firstFieldEl}
						aria-pressed={mode === 'fibonacci'}
						onclick={() => chooseMode('fibonacci')}
					>
						Fibonacci
					</button>
					<button
						type="button"
						aria-pressed={mode === 'free'}
						onclick={() => chooseMode('free')}
					>
						Frei
					</button>
				</span>
			</div>

			{#if mode === 'free'}
				<div class="field">
					<label>
						Minimum
						<input type="number" step="1" bind:value={minValue} />
					</label>
					{#if minError}
						<p class="field-error">{minError}</p>
					{/if}
				</div>

				<div class="field">
					<label>
						Maximum
						<input type="number" step="1" bind:value={maxValue} />
					</label>
					{#if maxError}
						<p class="field-error">{maxError}</p>
					{/if}
				</div>
			{/if}

			<div class="actions">
				<button type="button" class="btn" onclick={handleCancel}>Abbrechen</button>
				<button type="submit" class="btn pri">Speichern</button>
			</div>
		</form>
	</dialog>
{/if}

<style>
	.settings-dialog {
		padding: 0;
		margin: auto;
		width: min(90vw, 420px);
		color: var(--ink);
	}
	.settings-dialog::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px 20px;
	}
	.settings-form h2 {
		margin: 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 19px;
		letter-spacing: 0.005em;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
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
	.field-error {
		margin: 0;
		font-size: 12px;
		color: var(--magenta);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 6px;
		border-top: 1px solid var(--hair);
	}

	@media (max-width: 768px) {
		.settings-dialog {
			width: 100vw;
			max-width: none;
			height: 100vh;
			max-height: none;
			margin: 0;
			inset: 0;
		}
	}
</style>
