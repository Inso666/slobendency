<!--
	F-08 · Kartengerüst (features/F-08-kartengeruest.md, Abschnitte „Umfang" und
	„Darstellung").

	Vier getönte Reviere plus Schraffur auf „Vermeiden", darüber die Reviernamen. Rechtecke
	kommen aus regionRects() (src/lib/layout/scales.ts), Klassennamen und Token aus
	design/03-seekarte.html. Reviername steht mittig im Revier (F-08, Abschnitt
	„Darstellung"), oben 34 px unter der Rahmenkante, unten 20 px darüber.
-->
<script lang="ts">
	import { regionRects } from '../../layout/scales';
	import type { Quadrant } from '../../model/types';

	let { domainMax }: { domainMax: number } = $props();

	const REGION_CLASS: Record<Quadrant, string> = {
		quickWins: 'r-qw',
		grosseVorhaben: 'r-gv',
		nebenbei: 'r-nb',
		vermeiden: 'r-vm'
	};

	const REGION_NAME: Record<Quadrant, string> = {
		quickWins: 'QUICK WINS',
		grosseVorhaben: 'GROSSE VORHABEN',
		nebenbei: 'NEBENBEI',
		vermeiden: 'VERMEIDEN'
	};

	const TOP_ROW = new Set<Quadrant>(['quickWins', 'grosseVorhaben']);

	let rects = $derived(regionRects(domainMax));

	function labelY(rect: { y: number; height: number }, quadrant: Quadrant): number {
		return TOP_ROW.has(quadrant) ? rect.y + 34 : rect.y + rect.height - 20;
	}

	function labelX(rect: { x: number; width: number }): number {
		return rect.x + rect.width / 2;
	}
</script>

{#each rects as rect (rect.quadrant)}
	<rect
		class={REGION_CLASS[rect.quadrant]}
		data-testid="region-{rect.quadrant}"
		x={rect.x}
		y={rect.y}
		width={rect.width}
		height={rect.height}
	/>
	{#if rect.quadrant === 'vermeiden'}
		<rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill="url(#hatch)" />
	{/if}
{/each}

{#each rects as rect (rect.quadrant)}
	<text class="region-lbl" x={labelX(rect)} y={labelY(rect, rect.quadrant)} text-anchor="middle">
		{REGION_NAME[rect.quadrant]}
	</text>
{/each}

<style>
	.r-qw {
		fill: var(--shallow);
	}
	.r-gv {
		fill: var(--deep);
	}
	.r-nb {
		fill: var(--flat);
	}
	.r-vm {
		fill: var(--hazard);
	}
	.region-lbl {
		font-family: 'Fraunces', serif;
		font-style: italic;
		font-weight: 600;
		font-size: 15px;
		letter-spacing: 0.38em;
		fill: var(--region);
	}
</style>
