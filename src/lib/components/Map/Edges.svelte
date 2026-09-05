<!--
	F-10 · Kanten und Signaturenkatalog (features/F-10-kanten.md, Abschnitt „Umfang").

	Zeichnet die drei Beziehungsarten (`requires`, `relates`, `excludes`) anhand der Geometrie
	aus src/lib/layout/edges.ts, dazu Vorbedingungsring und Durchstreichung an den betroffenen
	Zielen. Signatur ist vom Test-Agenten vorgegeben; Inhalt ist Aufgabe des Feature-Agenten.

	Linienarten, Endmarken und Zusätze folgen dem Signaturenkatalog aus F-10: `requires`
	durchgezogen mit Pfeilspitze `#tipInk` und Ring am Ziel, `relates` gestrichelt mit
	Pfeilspitze `#tipSea`, `excludes` durchgezogen mit einer x-Endmarke aus zwei gekreuzten
	Strichen und Durchstreichung des Ziels. Ring und Durchstreichung hängen am Feature, nicht an
	der einzelnen Kante — ein Feature kann beide Rollen gleichzeitig tragen.

	Kantenbeschriftungen sind im Grundzustand unsichtbar (FR-45); die Sichtbarkeit bei
	Selektion/Hover liefert erst F-11. Beschriftungen laufen ausschließlich über Svelte-
	Textbindung (NFR-21) — kein `{@html}`.
-->
<script lang="ts">
	import { layoutEdges } from '../../layout/edges';
	import type { FeatureMap, RelationType } from '../../model/types';
	import type { Placement } from '../../layout/jitter';

	let { map, placements }: { map: FeatureMap; placements: Placement[] } = $props();

	/** Radius des Vorbedingungsrings (design/03-seekarte.html, Klasse `.ring`). */
	const RING_RADIUS = 15;

	/** Halber Versatz der Durchstreichung je Achse (design/03-seekarte.html, Klasse `.strike`). */
	const STRIKE_HALF = 8;

	/** Halbe Kantenlänge der x-Endmarke (design/03-seekarte.html, Legendeneintrag „schließt aus"). */
	const CROSS_HALF = 4;

	let geometries = $derived(layoutEdges(map.relations, placements));
	let placementById = $derived(new Map(placements.map((placement) => [placement.id, placement])));

	/** Kennungen aller Features, die Ziel mindestens einer `requires`-Beziehung sind. */
	let ringTargets = $derived([
		...new Set(
			map.relations.filter((relation) => relation.type === 'requires').map((relation) => relation.to)
		)
	]);

	/** Kennungen aller Features, die Ziel mindestens einer `excludes`-Beziehung sind. */
	let strikeTargets = $derived([
		...new Set(
			map.relations.filter((relation) => relation.type === 'excludes').map((relation) => relation.to)
		)
	]);

	const EDGE_CLASS: Record<RelationType, string> = {
		requires: 'e-req',
		relates: 'e-rel',
		excludes: 'e-exc'
	};

	const MARKER: Partial<Record<RelationType, string>> = {
		requires: 'url(#tipInk)',
		relates: 'url(#tipSea)'
	};
</script>

<g class="edges">
	{#each geometries as g (`${g.relation.from}→${g.relation.to}·${g.relation.type}`)}
		<line
			data-testid="edge-{g.relation.from}-{g.relation.to}-{g.relation.type}"
			class="edge {EDGE_CLASS[g.relation.type]}"
			x1={g.x1}
			y1={g.y1}
			x2={g.x2}
			y2={g.y2}
			marker-end={MARKER[g.relation.type]}
		/>

		{#if g.relation.label}
			<text
				data-testid="edge-label-{g.relation.from}-{g.relation.to}-{g.relation.type}"
				class="edge-label"
				x={g.labelX}
				y={g.labelY}
				text-anchor={g.labelAnchor}
			>
				{g.relation.label}
			</text>
		{/if}

		{#if g.crossMark}
			<g
				data-testid="edge-crossmark-{g.relation.from}-{g.relation.to}"
				class="crossmark"
				transform="rotate({g.crossMark.angle} {g.crossMark.x} {g.crossMark.y})"
			>
				<line
					x1={g.crossMark.x - CROSS_HALF}
					y1={g.crossMark.y - CROSS_HALF}
					x2={g.crossMark.x + CROSS_HALF}
					y2={g.crossMark.y + CROSS_HALF}
				/>
				<line
					x1={g.crossMark.x - CROSS_HALF}
					y1={g.crossMark.y + CROSS_HALF}
					x2={g.crossMark.x + CROSS_HALF}
					y2={g.crossMark.y - CROSS_HALF}
				/>
			</g>
		{/if}
	{/each}

	{#each ringTargets as id (id)}
		{@const p = placementById.get(id)}
		{#if p}
			<circle data-testid="edge-ring-{id}" class="ring" cx={p.x} cy={p.y} r={RING_RADIUS} />
		{/if}
	{/each}

	{#each strikeTargets as id (id)}
		{@const p = placementById.get(id)}
		{#if p}
			<line
				data-testid="edge-strike-{id}"
				class="strike"
				x1={p.x - STRIKE_HALF}
				y1={p.y + STRIKE_HALF}
				x2={p.x + STRIKE_HALF}
				y2={p.y - STRIKE_HALF}
			/>
		{/if}
	{/each}
</g>

<style>
	.edge {
		fill: none;
		stroke-width: 1.4;
	}
	.e-req {
		stroke: var(--ink);
	}
	.e-rel {
		stroke: var(--sea);
		stroke-dasharray: 4 4;
	}
	.e-exc {
		stroke: var(--magenta);
	}
	.crossmark line {
		stroke: var(--magenta);
		stroke-width: 1.4;
	}
	.edge-label {
		display: none;
		font-family: 'Karla', sans-serif;
		font-size: 11px;
		fill: var(--ink-soft);
		paint-order: stroke;
		stroke: var(--paper);
		stroke-width: 4px;
		stroke-linejoin: round;
	}
	.ring {
		fill: none;
		stroke: var(--ink);
		stroke-width: 1;
		stroke-dasharray: 2 3;
	}
	.strike {
		stroke: var(--magenta);
		stroke-width: 1.6;
	}
</style>
