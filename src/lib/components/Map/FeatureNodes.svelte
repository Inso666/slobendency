<!--
	F-09 · Feature-Signaturen und Jitter (features/F-09-feature-signaturen.md, Abschnitt „Umfang").

	Zeichnet die Feature-Signaturen (Punkt, Name, Lotung, ggf. Ankerkreuz) auf Basis von
	src/lib/layout/jitter.ts. Anzeigenamen laufen ausschließlich über Svelte-Textbindung
	(NFR-21) — kein `{@html}`, kein injizierbares Markup.
-->
<script lang="ts">
	import { placeFeatures, type Placement } from '../../layout/jitter';
	import { PLOT } from '../../layout/scales';
	import type { Feature, FeatureId, FeatureMap } from '../../model/types';

	let { map, domainMax }: { map: FeatureMap; domainMax: number } = $props();

	/** Radius des Signaturpunkts (F-09, Abschnitt „Darstellung"). */
	const NODE_RADIUS = 8;

	/** Halbe Länge des Ankerkreuzes — 10 Einheiten Gesamtlänge (F-09, Abschnitt „Darstellung"). */
	const ANCHOR_HALF_LENGTH = 5;

	/** Abstand von Name/Lotung zum Mittelpunkt in x-Richtung (F-09, Abschnitt „Darstellung"). */
	const LABEL_OFFSET_X = 16;
	/** Name sitzt 5 Einheiten über dem Mittelpunkt. */
	const LABEL_OFFSET_Y = -5;
	/** Lotung sitzt 11 Einheiten unter dem Mittelpunkt. */
	const LOTUNG_OFFSET_Y = 11;

	/**
	 * Schwelle, ab der ein Name über den Rahmen liefe: 82 % der Plotbreite (F-09, Abschnitt
	 * „Darstellung").
	 */
	const RIGHT_EDGE_THRESHOLD = PLOT.left + 0.82 * (PLOT.right - PLOT.left);

	let placements = $derived(placeFeatures(map, domainMax));

	function featureOf(id: FeatureId): Feature {
		const feature = map.features.find((candidate) => candidate.id === id);
		if (!feature) throw new Error(`Interner Fehler: kein Feature für Platzierung ${id}`);
		return feature;
	}

	function labelOf(feature: Feature): string {
		return feature.label ?? feature.id;
	}

	function lotungOf(feature: Feature): string {
		return `${feature.impact} · ${feature.effort}`;
	}

	function nearRightEdge(x: number): boolean {
		return x > RIGHT_EDGE_THRESHOLD;
	}

	/** Ein Ankerkreuz je versetzter Gruppe, nicht je Feature — Gruppen über den Ankerpunkt entdoppelt. */
	function anchorsOf(list: Placement[]): Array<{ x: number; y: number }> {
		const seen = new Set<string>();
		const anchors: Array<{ x: number; y: number }> = [];
		for (const placement of list) {
			if (!placement.jittered) continue;
			const key = `${placement.anchorX.toFixed(6)}:${placement.anchorY.toFixed(6)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			anchors.push({ x: placement.anchorX, y: placement.anchorY });
		}
		return anchors;
	}

	let anchors = $derived(anchorsOf(placements));
</script>

<g class="nodes">
	{#each anchors as anchor, index (index)}
		<g class="anchor-group" data-testid="feature-anchor">
			<line
				class="anchor"
				x1={anchor.x - ANCHOR_HALF_LENGTH}
				y1={anchor.y}
				x2={anchor.x + ANCHOR_HALF_LENGTH}
				y2={anchor.y}
			/>
			<line
				class="anchor"
				x1={anchor.x}
				y1={anchor.y - ANCHOR_HALF_LENGTH}
				x2={anchor.x}
				y2={anchor.y + ANCHOR_HALF_LENGTH}
			/>
		</g>
	{/each}

	{#each placements as placement (placement.id)}
		{@const feature = featureOf(placement.id)}
		{@const flipLeft = nearRightEdge(placement.x)}
		<g class="node">
			<circle
				data-testid="feature-node-{placement.id}"
				cx={placement.x}
				cy={placement.y}
				r={NODE_RADIUS}
			/>
			<text
				data-testid="feature-label-{placement.id}"
				x={placement.x + (flipLeft ? -LABEL_OFFSET_X : LABEL_OFFSET_X)}
				y={placement.y + LABEL_OFFSET_Y}
				text-anchor={flipLeft ? 'end' : 'start'}
			>
				{labelOf(feature)}
			</text>
			<text
				class="snd"
				data-testid="feature-lotung-{placement.id}"
				x={placement.x + LABEL_OFFSET_X}
				y={placement.y + LOTUNG_OFFSET_Y}
			>
				{lotungOf(feature)}
			</text>
		</g>
	{/each}
</g>

<style>
	.node circle {
		fill: var(--ink);
		stroke: var(--paper);
		stroke-width: 2;
	}
	.node text {
		font-family: 'Karla', sans-serif;
		font-size: 13px;
		fill: var(--ink);
		paint-order: stroke;
		stroke: var(--paper);
		stroke-width: 3.5px;
		stroke-linejoin: round;
	}
	.node .snd {
		font-family: 'Azeret Mono', monospace;
		font-size: 10.5px;
		fill: var(--ink-soft);
	}
	.anchor {
		stroke: var(--ink-soft);
		stroke-width: 1;
	}
</style>
