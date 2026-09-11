<!--
	F-08 · Kartengerüst (features/F-08-kartengeruest.md, Abschnitte „Umfang" und
	„Darstellung").

	Gitterlinien auf den Teilstrichwerten beider Achsen (ticksOf). Das ungleichmäßige Raster
	ist gewollt, weil die Skala linear bleibt und die Fibonacci-Reihe nicht (design/README.md,
	„Fibonacci-Raster").

	F-25 · Datenzoom (features/F-25-datenzoom.md, Abschnitt „Umfang"): liest das sichtbare
	Fenster aus src/lib/store/viewport.ts (über den Aufrufer, MapCanvas.svelte) statt eines
	festen [0, domainMax] und rendert bei jeder Änderung neu. effortMin/effortMax und
	impactMin/impactMax sind getrennt, weil centerEffort/centerImpact unabhängig voneinander
	verschoben sein können — x- und y-Teilstriche werden deshalb je Achse eigenständig berechnet.
-->
<script lang="ts">
	import { PLOT, ticksOf, xOf, yOf } from '../../layout/scales';

	let {
		effortMin,
		effortMax,
		impactMin,
		impactMax
	}: { effortMin: number; effortMax: number; impactMin: number; impactMax: number } = $props();

	let xTicks = $derived(ticksOf(effortMin, effortMax));
	let yTicks = $derived(ticksOf(impactMin, impactMax));
</script>

{#each xTicks as value (`x-${value}`)}
	<line
		class="grid-line"
		data-testid="grid-line"
		x1={xOf(value, effortMin, effortMax)}
		y1={PLOT.top}
		x2={xOf(value, effortMin, effortMax)}
		y2={PLOT.bottom}
	/>
{/each}
{#each yTicks as value (`y-${value}`)}
	<line
		class="grid-line"
		data-testid="grid-line"
		x1={PLOT.left}
		y1={yOf(value, impactMin, impactMax)}
		x2={PLOT.right}
		y2={yOf(value, impactMin, impactMax)}
	/>
{/each}

<style>
	.grid-line {
		stroke: var(--grid);
		stroke-width: 1;
	}
</style>
