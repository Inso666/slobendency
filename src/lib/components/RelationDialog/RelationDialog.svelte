<!--
	RelationDialog (F-16 · features/F-16-verbindungsvorgang.md, Abschnitt "Umfang").

	Öffnet sich, sobald über das Kontextmenü (ContextMenu.svelte) Start und Ziel eines
	Verbindungsvorgangs gesetzt sind (F-16, Ablauf Schritt 3, PRD FR-12): Auswahl der
	Beziehungsart über drei Knöpfe mit Signatur und Namen ("benötigt" / "hängt zusammen" /
	"schließt aus" — dieselbe Beschriftung wie in RelationRow.svelte aus F-13, features/README.md
	Ubiquitous Language), optionale Beschriftung, "Anlegen" und "Abbrechen" (F-16, Ablauf Schritt
	3). `from`/`to` liegen beim Öffnen bereits fest (durch die vorangegangenen Rechtsklicks) und
	sind in diesem Dialog nicht mehr änderbar — anders als im Beziehungs-Abschnitt des
	Feature-Formulars (F-13), das Ziel und Art in einer Zeile zusammen wählen lässt.

	"Anlegen" ruft createRelation (src/lib/store/mapStore.ts) auf, das INT-02 bis INT-04 sowie
	die Feldregeln für Kantenbeschriftungen prüft — diese Komponente prüft nichts davon selbst
	(features/README.md, Leitplanke 3). Scheitert der Aufruf (INT-03, INT-04), erscheint die
	Meldung unverändert im Dialog, der Dialog bleibt offen (F-16, Ablauf Schritt 4: "Verstöße
	gegen INT-03 und INT-04 erscheinen im Dialog; der Vorgang bleibt offen, bis er gelingt oder
	abgebrochen wird"). Gelingt der Aufruf — auch wenn die neue `requires`-Kante einen Zyklus
	schließt (INT-05, wird angelegt statt abgelehnt) —, ruft der Dialog `onCreated()` auf; die
	sichtbare Zyklus-Warnung selbst ist F-23, nicht Teil dieser Komponente (F-16, Abschnitt
	"Nicht Teil dieses Features").

	Rolle `dialog`, zugänglicher Name "Beziehung anlegen" (design/README.md: noch kein fertiger
	Entwurf für dieses Dialogfenster, deshalb wie ContextMenu.svelte über Rolle/Text zugänglich,
	nach demselben `<dialog class="cartouche">`-Muster wie FeatureModal.svelte, F-13).

	Die drei Knöpfe für die Beziehungsart übernehmen Signatur und Beschriftung unverändert aus
	Legend.svelte (F-10) — dieselbe Musterlinie, dieselbe Reihenfolge, dieselben Namen — statt
	ein zweites Signaturenset danebenzustellen (features/README.md, Leitplanke 3 sinngemäß auch
	für Darstellung). "Anlegen" bleibt deaktiviert, bis eine Art gewählt ist (F-16, Ablauf
	Schritt 3 nennt die Auswahl der Art als eigenen, der Beschriftung vorausgehenden Schritt).

	`open` folgt demselben Muster wie FeatureModal.svelte (F-13): der Aufrufer hält die
	Komponente nur gemountet, solange `open` gilt, und das Formular selbst öffnet sich beim
	Einhängen über `showModal()`. Anders als FeatureModal.svelte unterscheidet diese Komponente
	zwei Rückkanäle statt eines einzigen `onClose`, weil Erfolg (`onCreated`, beendet den
	Verbindungsvorgang) und Abbruch (`onCancel`, ebenso) unterschiedliche Bedeutung für den
	Aufrufer haben, auch wenn beide hier `cancelConnection()` aufrufen — die Unterscheidung ist
	Teil der von F-16 vorgegebenen Signatur.
-->
<script lang="ts">
	import type { FeatureId, RelationType } from '../../model/types';
	import { createRelation } from '../../store/mapStore';

	let {
		open,
		from,
		to,
		onCreated,
		onCancel
	}: {
		open: boolean;
		/** Startfeature des Verbindungsvorgangs (F-16, Ablauf Schritt 2), beim Öffnen bereits
		 * feststehend. */
		from: FeatureId;
		/** Zielfeature, über "Als Ziel verwenden" gewählt (F-16, Ablauf Schritt 3), beim Öffnen
		 * bereits feststehend. */
		to: FeatureId;
		/** Ruft createRelation auf; bei Erfolg ruft der Dialog selbst `onCreated()` auf, das den
		 * Vorgang beendet (cancelConnection() aus src/lib/store/selection.ts) und den Dialog
		 * schließt. Bei INT-03/INT-04-Verstößen bleibt der Dialog offen (Abschnitt oben). */
		onCreated: () => void;
		/** "Abbrechen" im Dialog sowie ESC und Klick auf den Hintergrund (F-16, Abschnitt
		 * "Abbruch") — bricht den gesamten Verbindungsvorgang ab, nicht nur den Dialog. */
		onCancel: () => void;
	} = $props();

	/** Reihenfolge, Beschriftung und Signatur wie Legend.svelte (F-10), features/README.md
	 * Ubiquitous Language. */
	const TYPES: RelationType[] = ['requires', 'relates', 'excludes'];
	const TYPE_LABELS: Record<RelationType, string> = {
		requires: 'benötigt',
		relates: 'hängt zusammen',
		excludes: 'schließt aus'
	};

	let selectedType = $state<RelationType | null>(null);
	let labelValue = $state('');
	/** Meldung einer an INT-03/INT-04 gescheiterten Beziehung (F-16, Ablauf Schritt 4) —
	 * unverändert aus dem Ergebnis von createRelation übernommen, keine eigene Formulierung
	 * (features/README.md, Leitplanke 3). */
	let errorMessage = $state<string | undefined>(undefined);

	let dialogEl: HTMLDialogElement | undefined = $state();

	/** True, sobald createRelation erfolgreich war — unterscheidet in handleDialogClose()
	 * zwischen dem (hier nie über dialogEl.close() ausgelösten) Erfolgsfall und einem
	 * Abbruch über das native Escape-Verhalten des <dialog>. */
	let created = false;

	$effect(() => {
		if (open && dialogEl && !dialogEl.open) dialogEl.showModal();
	});

	function chooseType(type: RelationType): void {
		selectedType = type;
		errorMessage = undefined;
	}

	/** "Anlegen" (F-16, Ablauf Schritt 4): ruft createRelation auf und zeigt eine Ablehnung
	 * (INT-03, INT-04) unverändert im Dialog, der dabei offen bleibt. Gelingt der Aufruf — auch
	 * wenn er einen Zyklus schließt (INT-05) —, endet der Vorgang über onCreated() (Abschnitt am
	 * Dateianfang). */
	function handleCreateClick(): void {
		if (selectedType === null) return;
		const label = labelValue.trim() === '' ? undefined : labelValue;
		const result = createRelation({ from, to, type: selectedType, label });
		if (!result.ok) {
			errorMessage = result.errors.map((error) => error.message).join('; ');
			return;
		}
		created = true;
		onCreated();
	}

	function handleCancelClick(): void {
		onCancel();
	}

	/** Klick auf den Hintergrund (F-16, Abschnitt "Abbruch": "Klick auf freie Fläche") — wie
	 * FeatureModal.svelte (F-13) liefert das native `<dialog>` dabei ein Click-Event mit
	 * `target === dialogEl` selbst, weil der sichtbare Inhalt in einem Kind-Element liegt. */
	function handleDialogClick(event: MouseEvent): void {
		if (event.target === dialogEl) onCancel();
	}

	/** Läuft beim nativen Schließen über Escape (F-16, Abschnitt "Abbruch") — nicht aber im
	 * Erfolgsfall, der die Komponente stattdessen über onCreated()/den Aufrufer aushängt, ohne
	 * dialogEl.close() aufzurufen. */
	function handleDialogClose(): void {
		if (!created) onCancel();
	}
</script>

{#if open}
	<dialog
		bind:this={dialogEl}
		class="relation-dialog cartouche"
		role="dialog"
		aria-labelledby="relation-dialog-title"
		onclick={handleDialogClick}
		onclose={handleDialogClose}
	>
		<h2 id="relation-dialog-title">Beziehung anlegen</h2>

		{#if errorMessage}
			<p class="field-error">{errorMessage}</p>
		{/if}

		<div class="types" role="group" aria-label="Art">
			<button
				type="button"
				class="type-btn"
				aria-pressed={selectedType === 'requires'}
				onclick={() => chooseType('requires')}
			>
				<svg viewBox="0 0 44 12" aria-hidden="true">
					<line class="s-ink" x1="0" y1="6" x2="36" y2="6" stroke-width="1.4" />
					<path class="f-ink" d="M36 3 L43 6 L36 9 Z" />
				</svg>
				{TYPE_LABELS.requires}
			</button>
			<button
				type="button"
				class="type-btn"
				aria-pressed={selectedType === 'relates'}
				onclick={() => chooseType('relates')}
			>
				<svg viewBox="0 0 44 12" aria-hidden="true">
					<line
						class="s-sea"
						x1="0"
						y1="6"
						x2="36"
						y2="6"
						stroke-width="1.4"
						stroke-dasharray="4 4"
					/>
					<path class="f-sea" d="M36 3 L43 6 L36 9 Z" />
				</svg>
				{TYPE_LABELS.relates}
			</button>
			<button
				type="button"
				class="type-btn"
				aria-pressed={selectedType === 'excludes'}
				onclick={() => chooseType('excludes')}
			>
				<svg viewBox="0 0 44 12" aria-hidden="true">
					<line class="s-mag" x1="0" y1="6" x2="38" y2="6" stroke-width="1.4" />
					<line class="s-mag" x1="35" y1="2" x2="43" y2="10" stroke-width="1.4" />
					<line class="s-mag" x1="43" y1="2" x2="35" y2="10" stroke-width="1.4" />
				</svg>
				{TYPE_LABELS.excludes}
			</button>
		</div>

		<div class="field">
			<label>
				Beschriftung
				<input type="text" maxlength="120" bind:value={labelValue} />
			</label>
		</div>

		<div class="actions">
			<button type="button" class="btn" onclick={handleCancelClick}>Abbrechen</button>
			<button
				type="button"
				class="btn pri"
				disabled={selectedType === null}
				onclick={handleCreateClick}
			>
				Anlegen
			</button>
		</div>
	</dialog>
{/if}

<style>
	.relation-dialog {
		padding: 0;
		margin: auto;
		width: min(90vw, 420px);
		color: var(--ink);
	}
	.relation-dialog::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.relation-dialog h2 {
		margin: 0;
		padding: 18px 20px 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 19px;
	}
	.types {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding: 14px 20px 0;
	}
	.type-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 44px;
		background: transparent;
		border: 1px solid var(--hair);
		padding: 7px 11px;
		font-size: 13px;
		color: var(--ink);
		cursor: pointer;
	}
	.type-btn svg {
		width: 32px;
		height: 10px;
		flex: none;
	}
	.type-btn:hover {
		border-color: var(--ink);
	}
	.type-btn[aria-pressed='true'] {
		border-color: var(--ink);
		background: var(--hover);
		font-weight: 600;
	}
	.s-ink {
		stroke: var(--ink);
	}
	.f-ink {
		fill: var(--ink);
	}
	.s-sea {
		stroke: var(--sea);
	}
	.f-sea {
		fill: var(--sea);
	}
	.s-mag {
		stroke: var(--magenta);
	}
	.field {
		padding: 14px 20px 0;
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
	.field-error {
		margin: 14px 20px 0;
		font-size: 12px;
		color: var(--magenta);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 16px 20px 20px;
		margin-top: 14px;
		border-top: 1px solid var(--hair);
	}

	@media (max-width: 768px) {
		.relation-dialog {
			width: 100vw;
			max-width: none;
			height: 100vh;
			max-height: none;
			margin: 0;
			inset: 0;
		}
	}
</style>
