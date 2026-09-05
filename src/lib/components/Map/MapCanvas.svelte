<!--
	F-08 · Kartengerüst (features/F-08-kartengeruest.md, Abschnitt „Umfang").
	F-09 · Feature-Signaturen und Jitter (features/F-09-feature-signaturen.md).

	SVG-Wurzel der Karte: viewBox, role="img" mit Beschreibung, Marker- und Musterdefinitionen,
	gibt die Skala an Regions.svelte, Grid.svelte, Axes.svelte und die Feature-Signaturen
	(FeatureNodes.svelte) weiter. Marker (Pfeilspitzen) werden bereits hier definiert, weil sie
	zur SVG-Struktur gehören, die der spätere Bildexport (NFR-43) wiederverwendet; gezeichnet
	werden sie erst mit den Kanten aus F-10.

	F-10 · Kanten und Signaturenkatalog (features/F-10-kanten.md): Platzierungen werden hier
	einmal berechnet und an Edges.svelte weitergegeben, damit Kanten auf versetzte Features an
	deren tatsächlich gerenderten Punkten enden. Die Zeichenerklärung (Legend.svelte) liegt als
	Kartusche über der Kartenfläche, außerhalb des SVG, weil sie fester Bestandteil des
	Bildschirms ist, nicht des exportierten Bildes.
-->
<script lang="ts">
	import { VIEWBOX } from '../../layout/scales';
	import { placeFeatures } from '../../layout/jitter';
	import type { FeatureMap } from '../../model/types';
	import Regions from './Regions.svelte';
	import Grid from './Grid.svelte';
	import Axes from './Axes.svelte';
	import Edges from './Edges.svelte';
	import FeatureNodes from './FeatureNodes.svelte';
	import Legend from './Legend.svelte';

	let { map, domainMax }: { map: FeatureMap; domainMax: number } = $props();

	let placements = $derived(placeFeatures(map, domainMax));
</script>

<svg
	class="map"
	viewBox="0 0 {VIEWBOX.width} {VIEWBOX.height}"
	preserveAspectRatio="xMidYMid meet"
	role="img"
	aria-label="Streudiagramm: Effort waagerecht, Impact senkrecht"
>
	<defs>
		<marker
			id="tipInk"
			viewBox="0 0 10 8"
			refX="9"
			refY="4"
			markerWidth="8"
			markerHeight="7"
			orient="auto-start-reverse"
		>
			<path class="f-ink" d="M0 0 L10 4 L0 8 Z" />
		</marker>
		<marker
			id="tipSea"
			viewBox="0 0 10 8"
			refX="9"
			refY="4"
			markerWidth="8"
			markerHeight="7"
			orient="auto-start-reverse"
		>
			<path class="f-sea" d="M0 0 L10 4 L0 8 Z" />
		</marker>
		<pattern
			id="hatch"
			width="9"
			height="9"
			patternUnits="userSpaceOnUse"
			patternTransform="rotate(45)"
		>
			<line class="hatch-line" x1="0" y1="0" x2="0" y2="9" stroke-width="1" />
		</pattern>
	</defs>

	<Regions {domainMax} />
	<Grid {domainMax} />
	<Axes {domainMax} />
	<Edges {map} {placements} />
	<FeatureNodes {map} {domainMax} />
</svg>

<Legend />

<style>
	.map {
		display: block;
		width: 100%;
		height: 100%;
	}
	.f-ink {
		fill: var(--ink);
	}
	.f-sea {
		fill: var(--sea);
	}
	.hatch-line {
		stroke: var(--magenta);
		opacity: var(--hatch-opacity);
	}
</style>
