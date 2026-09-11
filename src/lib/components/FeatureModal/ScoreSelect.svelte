<!--
	ScoreSelect (F-13 · features/F-13-feature-formular.md, Abschnitt "Umfang" und
	"Darstellung").

	Reihe gleich breiter Knöpfe für Nutzen bzw. Aufwand: die Schätzreihe FIBONACCI plus, bei
	einem abweichenden Wert, eine zusätzliche gekennzeichnete Option (scoreOptions.ts, PRD
	FR-02, FR-03). Der gewählte Wert erscheint in --ink mit Schrift in --paper, Zahlenwerte in
	Azeret Mono (Abschnitt "Darstellung"). `label` liefert die Beschriftung der Gruppe
	("Nutzen" / "Aufwand") und wird als aria-label der Knopfgruppe gerendert
	(e2e/F-13-feature-formular.spec.ts erwartet `getByRole('group', { name: label })`).

	Rumpf ist Aufgabe des Feature-Agenten. Data-testid: keiner — jede Option ist über ihren
	sichtbaren Zahlenwert eindeutig ansprechbar (`getByRole('button', { name: '5', exact: true
	})`), die abweichende Zusatzoption über ihren Text (z. B. "7 (abweichend)").

	F-26 · Schätzmodus (features/F-26-schaetzmodus.md, Abschnitte "Umfang" und "Werte außerhalb
	der Schätzreihe"): liest estimationMode/estimationRange direkt aus src/lib/store/settings.ts
	(derselbe Zugriffsweg wie $map in FeatureModal.svelte). Im Modus 'free' tritt an die Stelle
	der Fibonacci-Knopfreihe ein einzelnes Zahlenfeld im eingestellten Bereich
	(`getByRole('spinbutton', { name: label })`, e2e/F-26-schaetzmodus.spec.ts) — `label` bleibt
	unverändert dessen zugänglicher Name, keine zweite Beschriftung. Ein Wert außerhalb von
	estimationRange bleibt unverändert erhalten (FR-03 gilt jetzt für beide Modi) und wird über
	ein eigenes Kennzeichen `data-testid="score-deviating-{label in Kleinbuchstaben}"` markiert
	(Test-Agenten-Entscheidung, Kopfkommentar von e2e/F-26-schaetzmodus.spec.ts: im freien Modus
	gibt es keine Options-Liste mehr, an der sich ein Text wie "7 (abweichend)" festmachen ließe).
-->
<script lang="ts">
	import { scoreOptions } from './scoreOptions';
	import { estimationMode, estimationRange } from '../../store/settings';

	let {
		label,
		value,
		onSelect
	}: {
		label: string;
		value: number;
		onSelect: (value: number) => void;
	} = $props();

	let options = $derived(scoreOptions(value));

	function textOf(option: { value: number; deviating: boolean }): string {
		return option.deviating ? `${option.value} (abweichend)` : String(option.value);
	}

	/** FR-03 im Modus 'free': ein Wert außerhalb des eingestellten Bereichs bleibt erhalten und
	 * wird gekennzeichnet, statt stillschweigend übernommen oder verworfen zu werden. */
	let deviatesFromRange = $derived(value < $estimationRange.min || value > $estimationRange.max);

	function handleFreeInput(event: Event): void {
		const raw = (event.currentTarget as HTMLInputElement).value;
		if (raw === '') return;
		const parsed = Number(raw);
		if (Number.isNaN(parsed)) return;
		onSelect(parsed);
	}
</script>

{#if $estimationMode === 'free'}
	<div class="score-select score-free">
		<input
			type="number"
			step="1"
			class="score-input"
			aria-label={label}
			min={$estimationRange.min}
			max={$estimationRange.max}
			value={String(value)}
			oninput={handleFreeInput}
		/>
		{#if deviatesFromRange}
			<span class="deviating-tag" data-testid="score-deviating-{label.toLowerCase()}">
				abweichend
			</span>
		{/if}
	</div>
{:else}
	<div class="score-select" role="group" aria-label={label}>
		{#each options as option (option.value)}
			<button
				type="button"
				class="score-btn"
				class:deviating={option.deviating}
				aria-pressed={option.value === value}
				onclick={() => onSelect(option.value)}
			>
				{textOf(option)}
			</button>
		{/each}
	</div>
{/if}

<style>
	.score-select {
		display: flex;
		border: 1px solid var(--hair);
	}
	.score-btn {
		flex: 1;
		background: transparent;
		border: 0;
		border-right: 1px solid var(--hair);
		padding: 7px 4px;
		font-family: 'Azeret Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
		font-size: 12.5px;
		color: var(--ink);
		cursor: pointer;
	}
	.score-btn:last-child {
		border-right: 0;
	}
	/* Gewählter Wert in --ink mit Schrift in --paper (F-13, Abschnitt „Darstellung"). */
	.score-btn[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	/* Abweichende Zusatzoption in --magenta gekennzeichnet (F-13, Abschnitt „Werte außerhalb
	   der Schätzreihe"; PRD FR-03) — steht nach der Pressed-Regel, damit die Kennzeichnung auch
	   dann sichtbar bleibt, wenn die Zusatzoption zugleich der aktuelle Wert ist. */
	.score-btn.deviating {
		color: var(--magenta);
	}

	/* F-26, Modus 'free': ein einzelnes Zahlenfeld statt der Knopfreihe, gleicher Rahmen/gleiche
	   Token wie die übrigen Formularfelder (FeatureModal.svelte). */
	.score-free {
		display: flex;
		align-items: center;
		gap: 8px;
		border: none;
	}
	.score-input {
		flex: 1;
		font-family: 'Azeret Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
		font-size: 14px;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--hair);
		padding: 7px 9px;
	}
	.score-input:focus-visible {
		border-color: var(--ink);
	}
	/* FR-03: derselbe --magenta-Hinweis wie die abweichende Zusatzoption im Fibonacci-Modus. */
	.deviating-tag {
		font-size: 11.5px;
		letter-spacing: 0.04em;
		color: var(--magenta);
		white-space: nowrap;
	}
</style>
