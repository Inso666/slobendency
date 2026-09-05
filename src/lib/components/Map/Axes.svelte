<!--
	F-08 · Kartengerüst (features/F-08-kartengeruest.md, Abschnitte „Umfang" und
	„Darstellung").

	Rahmen um die Plotfläche, Teilstrichbeschriftungen auf beiden Achsen (ticksOf) und die
	Achsentitel EFFORT/IMPACT. Positionen der Achsentitel und der x-Teilstrichzeile sind fix
	(design/03-seekarte.html), weil PLOT selbst nicht mit domainMax skaliert — nur die
	Teilstrichwerte auf den Achsen tun das (xOf/yOf).
-->
<script lang="ts">
	import { PLOT, ticksOf, xOf, yOf } from '../../layout/scales';

	let { domainMax }: { domainMax: number } = $props();

	let ticks = $derived(ticksOf(domainMax));

	const AXIS_MID_X = (PLOT.left + PLOT.right) / 2;
	const AXIS_MID_Y = (PLOT.top + PLOT.bottom) / 2;
	const TICK_X_ROW_Y = 638;
	const TICK_Y_COLUMN_X = 68;
	// Vertikale Ausgleichsverschiebung, damit die Teilstrichbeschriftung der y-Achse optisch
	// auf der Gitterlinie sitzt statt auf ihr aufzusetzen (design/03-seekarte.html).
	const TICK_Y_BASELINE_OFFSET = 4;
</script>

<rect
	class="frame"
	data-testid="map-frame"
	x={PLOT.left}
	y={PLOT.top}
	width={PLOT.right - PLOT.left}
	height={PLOT.bottom - PLOT.top}
/>

{#each ticks as value (`x-${value}`)}
	<text
		class="tick-lbl"
		data-testid="tick-x-{value}"
		x={xOf(value, domainMax)}
		y={TICK_X_ROW_Y}
		text-anchor="middle"
	>
		{value}
	</text>
{/each}
{#each ticks as value (`y-${value}`)}
	<text
		class="tick-lbl"
		data-testid="tick-y-{value}"
		x={TICK_Y_COLUMN_X}
		y={yOf(value, domainMax) + TICK_Y_BASELINE_OFFSET}
		text-anchor="end"
	>
		{value}
	</text>
{/each}

<text class="axis-lbl" x={AXIS_MID_X} y="664" text-anchor="middle">EFFORT</text>
<text class="axis-lbl" transform="translate(32, {AXIS_MID_Y}) rotate(-90)" text-anchor="middle">
	IMPACT
</text>

<style>
	.frame {
		fill: none;
		stroke: var(--rule);
		stroke-width: 1;
	}
	.tick-lbl {
		font-family: 'Azeret Mono', monospace;
		font-size: 10.5px;
		fill: var(--ink-soft);
	}
	.axis-lbl {
		font-family: 'Fraunces', serif;
		font-style: italic;
		font-size: 12px;
		letter-spacing: 0.24em;
		fill: var(--ink-soft);
	}
</style>
