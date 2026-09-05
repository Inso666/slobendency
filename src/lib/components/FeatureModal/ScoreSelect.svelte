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
-->
<script lang="ts">
	import { scoreOptions } from './scoreOptions';

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
</script>

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
</style>
