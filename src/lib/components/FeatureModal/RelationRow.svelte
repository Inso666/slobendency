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
	import type { Feature, RelationType } from '../../model/types';
	import type { RelationRowInput } from './relations';

	/**
	 * `error` ist kein Teil der vom Test-Agenten vorgegebenen Signatur: Sie trägt die Meldung
	 * einer an dieser Zeile gescheiterten Beziehung (INT-02 bis INT-04, Kantenlabel-Regeln), die
	 * FeatureModal.svelte nach dem Speichern je Zeile zurückbekommt (F-13, Abschnitt
	 * „Fachregeln").
	 */
	let {
		index,
		row,
		candidateFeatures,
		onChange,
		onRemove,
		error = undefined
	}: {
		index: number;
		row: RelationRowInput;
		candidateFeatures: Feature[];
		onChange: (index: number, row: RelationRowInput) => void;
		onRemove: (index: number) => void;
		error?: string;
	} = $props();

	const TYPE_LABELS: Record<RelationType, string> = {
		requires: 'benötigt',
		relates: 'hängt zusammen',
		excludes: 'schließt aus'
	};
	const TYPES: RelationType[] = ['requires', 'relates', 'excludes'];

	function labelOf(feature: Feature): string {
		return feature.label ?? feature.id;
	}

	function handleTargetChange(event: Event): void {
		onChange(index, { ...row, targetId: (event.currentTarget as HTMLSelectElement).value });
	}

	function handleTypeChange(event: Event): void {
		onChange(index, {
			...row,
			type: (event.currentTarget as HTMLSelectElement).value as RelationType
		});
	}

	function handleLabelInput(event: Event): void {
		onChange(index, { ...row, label: (event.currentTarget as HTMLInputElement).value });
	}
</script>

<div class="relation-row" data-testid="relation-row-{index}">
	<label>
		Ziel
		<select value={row.targetId} onchange={handleTargetChange}>
			{#each candidateFeatures as feature (feature.id)}
				<option value={feature.id}>{labelOf(feature)}</option>
			{/each}
		</select>
	</label>
	<label>
		Art
		<select value={row.type} onchange={handleTypeChange}>
			{#each TYPES as type (type)}
				<option value={type}>{TYPE_LABELS[type]}</option>
			{/each}
		</select>
	</label>
	<label>
		Beschriftung
		<input type="text" maxlength="120" value={row.label} oninput={handleLabelInput} />
	</label>
	<button type="button" class="remove" onclick={() => onRemove(index)}>Entfernen</button>
	{#if error}
		<p class="field-error">{error}</p>
	{/if}
</div>

<style>
	.relation-row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 8px;
		padding: 8px 0;
		border-bottom: 1px solid var(--hair);
	}
	.relation-row label {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-soft);
		flex: 1 1 120px;
	}
	.relation-row select,
	.relation-row input {
		font: inherit;
		text-transform: none;
		letter-spacing: normal;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--hair);
		padding: 6px 7px;
		font-size: 13px;
	}
	.relation-row .remove {
		background: transparent;
		border: 1px solid var(--hair);
		color: var(--magenta);
		padding: 6px 10px;
		font-size: 12.5px;
		cursor: pointer;
		align-self: flex-end;
	}
	.relation-row .remove:hover {
		border-color: var(--magenta);
	}
	.field-error {
		flex-basis: 100%;
		margin: 0;
		font-size: 12px;
		color: var(--magenta);
	}

	/* F-22, Abschnitt „Trefferflächen"/UI-16: mindestens 44 × 44 px unter 768 px, wie jeder
	   andere Knopf/jedes andere Bedienelement der Anwendung in diesem Zustand. */
	@media (max-width: 768px) {
		.relation-row select {
			min-height: 44px;
		}
		.relation-row .remove {
			min-height: 44px;
			min-width: 44px;
		}
	}
</style>

