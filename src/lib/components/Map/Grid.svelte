<!--
	F-08 · Kartengerüst (features/F-08-kartengeruest.md, Abschnitte „Umfang" und
	„Darstellung").

	Gitterlinien auf den Teilstrichwerten beider Achsen (ticksOf). Das ungleichmäßige Raster
	ist gewollt, weil die Skala linear bleibt und die Fibonacci-Reihe nicht (design/README.md,
	„Fibonacci-Raster").
-->
<script lang="ts">
	import { PLOT, ticksOf, xOf, yOf } from '../../layout/scales';

	let { domainMax }: { domainMax: number } = $props();

	let ticks = $derived(ticksOf(domainMax));
</script>

{#each ticks as value (`x-${value}`)}
	<line
		class="grid-line"
		data-testid="grid-line"
		x1={xOf(value, domainMax)}
		y1={PLOT.top}
		x2={xOf(value, domainMax)}
		y2={PLOT.bottom}
	/>
{/each}
{#each ticks as value (`y-${value}`)}
	<line
		class="grid-line"
		data-testid="grid-line"
		x1={PLOT.left}
		y1={yOf(value, domainMax)}
		x2={PLOT.right}
		y2={yOf(value, domainMax)}
	/>
{/each}

<style>
	.grid-line {
		stroke: var(--grid);
		stroke-width: 1;
	}
</style>
