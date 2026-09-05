<!--
	F-09 · Feature-Signaturen und Jitter (features/F-09-feature-signaturen.md, Abschnitt „Umfang").
	F-11 · Selektion, Hervorhebung, Dimming (features/F-11-selektion.md, Abschnitt „Darstellung").

	Zeichnet die Feature-Signaturen (Punkt, Name, Lotung, ggf. Ankerkreuz) auf Basis von
	src/lib/layout/jitter.ts. Anzeigenamen laufen ausschließlich über Svelte-Textbindung
	(NFR-21) — kein `{@html}`, kein injizierbares Markup.

	Selektion (Klick, FR-40) sowie Halo und Dimming leiten sich aus src/lib/store/highlight.ts
	und src/lib/store/selection.ts ab (F-11) — die Regel, was hervorgehoben wird, ist bereits
	dort entschieden; hier wird nur gezeichnet.

	F-12 · Zoom und Pan (features/F-12-zoom-pan.md, Abschnitt „Verhalten"): Ein Zug, der auf
	einem Feature beginnt, verschiebt die Karte nicht, sondern selektiert (dort gilt der Klick
	der Selektion) — Maus- und Touch-Beginn stoppen ihre Ausbreitung deshalb hier, bevor
	MapCanvas.svelte sie als Ziehen auf freier Fläche werten könnte. Punktradius und
	Schriftgrößen werden gegen den Maßstab gerechnet, damit sie bei Maßstab 0,5 nicht unter die
	geforderte Mindestschriftgröße von 9 px fallen, bei größerem Maßstab aber regulär mit
	skalieren (F-12, Abschnitt „Verhalten").
-->
<script lang="ts">
	import { placeFeatures, type Placement } from '../../layout/jitter';
	import { PLOT } from '../../layout/scales';
	import type { Feature, FeatureId, FeatureMap } from '../../model/types';
	import { highlight } from '../../store/highlight';
	import { selectedId } from '../../store/selection';

	/** Radius des Halo-Kreises um das selektierte Feature (F-11, Abschnitt „Darstellung"). */
	const HALO_RADIUS = 15;

	let { map, domainMax, scale = 1 }: { map: FeatureMap; domainMax: number; scale?: number } =
		$props();

	/** Radius des Signaturpunkts (F-09, Abschnitt „Darstellung"). */
	const NODE_RADIUS = 8;

	/** Schriftgröße des Feature-Namens bei Maßstab 1 (F-09, Abschnitt „Darstellung"). */
	const LABEL_FONT_SIZE = 13;
	/** Schriftgröße der Lotung bei Maßstab 1 (F-09, Abschnitt „Darstellung"). */
	const LOTUNG_FONT_SIZE = 10.5;
	/** Mindestschriftgröße auf dem Bildschirm, unabhängig vom Maßstab (F-12, Abschnitt
	 * „Verhalten"). */
	const MIN_SCREEN_FONT_SIZE = 9;

	/** Faktor, der Punktradius und Schriftgrößen gegen den Maßstab rechnet: oberhalb der
	 * Schwelle, ab der Maßstab 1 bereits genügend Bildschirmgröße liefert, bleibt er 1 (reguläre
	 * Skalierung mit dem Zoom); darunter — auf dem Weg zu MIN_SCALE — wächst er gerade so, dass
	 * die Bildschirmschriftgröße nie unter MIN_SCREEN_FONT_SIZE fällt. */
	let sizeFactor = $derived(Math.max(1, MIN_SCREEN_FONT_SIZE / (LABEL_FONT_SIZE * scale)));

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

	/** Klick auf ein Feature selektiert es (FR-40); die Karte reagiert darauf nie selbst mit
	 * einer eigenen Ableitung der Hervorhebung — das übernimmt store/highlight.ts. Bricht die
	 * Ereigniskette ab, damit MapCanvas.svelte den Klick nicht zusätzlich als Klick auf freie
	 * Fläche wertet (F-11, Abschnitt „Interaktion"). */
	function selectFeature(event: MouseEvent, id: FeatureId): void {
		event.stopPropagation();
		selectedId.set(id);
	}

	/** Stoppt Maus-/Touch-Beginn auf einem Feature, damit MapCanvas.svelte daraus kein Ziehen
	 * auf freier Fläche macht (F-12, Abschnitt „Verhalten": „Ein Ziehen, das auf einem Feature
	 * beginnt, verschiebt die Karte nicht"). Der Klick selbst (Selektion) läuft unbeeinflusst
	 * über selectFeature() weiter. */
	function stopDragStart(event: MouseEvent | TouchEvent): void {
		event.stopPropagation();
	}
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
		{@const isSelected = placement.id === $selectedId}
		{@const isDimmed = $highlight !== null && !$highlight.features.has(placement.id)}
		<g
			class="node"
			class:sel={isSelected}
			class:dim={isDimmed}
			onclick={(event) => selectFeature(event, placement.id)}
			onmousedown={stopDragStart}
			ontouchstart={stopDragStart}
		>
			{#if isSelected}
				<circle
					class="halo"
					data-testid="feature-halo-{placement.id}"
					cx={placement.x}
					cy={placement.y}
					r={HALO_RADIUS * sizeFactor}
				/>
			{/if}
			<circle
				data-testid="feature-node-{placement.id}"
				cx={placement.x}
				cy={placement.y}
				r={NODE_RADIUS * sizeFactor}
			/>
			<text
				data-testid="feature-label-{placement.id}"
				x={placement.x + (flipLeft ? -LABEL_OFFSET_X : LABEL_OFFSET_X)}
				y={placement.y + LABEL_OFFSET_Y}
				text-anchor={flipLeft ? 'end' : 'start'}
				style:font-size="{LABEL_FONT_SIZE * sizeFactor}px"
			>
				{labelOf(feature)}
			</text>
			<text
				class="snd"
				data-testid="feature-lotung-{placement.id}"
				x={placement.x + LABEL_OFFSET_X}
				y={placement.y + LOTUNG_OFFSET_Y}
				style:font-size="{LOTUNG_FONT_SIZE * sizeFactor}px"
			>
				{lotungOf(feature)}
			</text>
		</g>
	{/each}
</g>

<style>
	.node {
		cursor: pointer;
	}
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
	/* Selektiertes Feature: Punkt in --magenta, Name in 600 (F-11, Abschnitt „Darstellung"). */
	.node.sel circle {
		fill: var(--magenta);
	}
	.node.sel text {
		font-weight: 600;
	}
	/* Halo-Kreis um das selektierte Feature (F-11, Abschnitt „Darstellung"). Selektor eine Stufe
	   spezifischer als „.node circle", damit dessen Grundfarben (Tinte/Papier) hier nicht
	   greifen — der Halo ist selbst ein Kreis innerhalb von .node. */
	.node circle.halo {
		fill: none;
		stroke: var(--magenta);
		stroke-width: 1.2;
	}
	/* Abgedunkelte Features bleiben sichtbar, treten aber deutlich zurück (FR-43). */
	.node.dim {
		opacity: var(--dim-opacity);
	}
	.anchor {
		stroke: var(--ink-soft);
		stroke-width: 1;
	}
</style>
