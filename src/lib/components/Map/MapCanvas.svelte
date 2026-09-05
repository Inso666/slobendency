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

	F-11 · Selektion, Hervorhebung, Dimming (features/F-11-selektion.md, Abschnitt
	„Interaktion"): Empfänger der Klicks auf freie Fläche (FR-46) und der ESC-Taste (FR-46,
	FR-13). Ein Klick auf ein Feature (FeatureNodes.svelte) stoppt seine eigene Ausbreitung, ein
	Klick daneben — auf Reviere, Raster, Kanten oder die Kartenfläche selbst — hebt die
	Selektion deshalb hier auf.

	F-12 · Zoom und Pan (features/F-12-zoom-pan.md, Abschnitt „Umfang"): Der Ausschnitt aus
	src/lib/store/viewport.ts wird als `transform`-Gruppe um den bereits vorhandenen Inhalt
	gelegt; die viewBox selbst bleibt für den späteren Bildexport unverändert (FR-65). Mausrad
	zoomt auf den Zeiger, Ziehen auf freier Fläche verschiebt (Ziehen, das auf einem Feature
	beginnt, stoppt seine Ausbreitung bereits in FeatureNodes.svelte und erreicht diese
	Komponente nie). Pinch- und Ein-Finger-Touch-Gesten bilden dieselben zwei Operationen über
	Touch nach (UI-14). Bildschirmkoordinaten (Zeiger, Finger) werden über die CTM der äußeren
	`<svg>` — also unabhängig vom inneren Zoom/Pan-`transform` — in den unskalierten
	Koordinatenraum von VIEWBOX/PLOT umgerechnet, in dem viewport.ts rechnet.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { VIEWBOX } from '../../layout/scales';
	import { placeFeatures } from '../../layout/jitter';
	import type { FeatureMap } from '../../model/types';
	import { clearSelection } from '../../store/selection';
	import { panBy, viewport, zoomAt } from '../../store/viewport';
	import Regions from './Regions.svelte';
	import Grid from './Grid.svelte';
	import Axes from './Axes.svelte';
	import Edges from './Edges.svelte';
	import FeatureNodes from './FeatureNodes.svelte';
	import Legend from './Legend.svelte';

	let { map, domainMax }: { map: FeatureMap; domainMax: number } = $props();

	let placements = $derived(placeFeatures(map, domainMax));

	let svgEl: SVGSVGElement | undefined;

	/** Empfindlichkeit des Mausrads: ein Rad-Ereignis mit deltaY=240 (eine „Rastung" in den
	 * meisten Browsern) ergibt einen Faktor von e^(240·0,0015) ≈ 1,43 (F-12, Zeile „Zoom"). */
	const WHEEL_SENSITIVITY = 0.0015;

	/** Rechnet eine Bildschirmposition (z. B. MouseEvent.clientX/Y) in den unskalierten
	 * Koordinatenraum von VIEWBOX/PLOT um — die CTM der äußeren `<svg>` selbst ist von deren
	 * eigener viewBox/preserveAspectRatio-Skalierung abhängig, nicht vom inneren Zoom/Pan-
	 * `transform` (siehe Modulkommentar in src/lib/store/viewport.ts). */
	function toContentPoint(clientX: number, clientY: number): { x: number; y: number } {
		if (!svgEl) return { x: clientX, y: clientY };
		const ctm = svgEl.getScreenCTM();
		if (!ctm) return { x: clientX, y: clientY };
		const point = svgEl.createSVGPoint();
		point.x = clientX;
		point.y = clientY;
		const transformed = point.matrixTransform(ctm.inverse());
		return { x: transformed.x, y: transformed.y };
	}

	function handleWheel(event: WheelEvent): void {
		event.preventDefault();
		const { x, y } = toContentPoint(event.clientX, event.clientY);
		const factor = Math.exp(-event.deltaY * WHEEL_SENSITIVITY);
		zoomAt(x, y, factor);
	}

	/** Ursprung des laufenden Ein-Finger-/Maus-Zugs, im Koordinatenraum von toContentPoint(),
	 * oder null ohne laufenden Zug. */
	let dragOrigin: { x: number; y: number } | null = null;

	/** Bildschirmabstand der beiden Finger bei der letzten Pinch-Messung, oder null ohne
	 * laufende Pinch-Geste (F-12, Zeile „Zoom", Spalte Mobil). */
	let pinchDistance: number | null = null;

	function handleMouseDown(event: MouseEvent): void {
		if (event.button !== 0) return;
		dragOrigin = toContentPoint(event.clientX, event.clientY);
	}

	function handleMouseMove(event: MouseEvent): void {
		if (!dragOrigin) return;
		const point = toContentPoint(event.clientX, event.clientY);
		panBy(point.x - dragOrigin.x, point.y - dragOrigin.y);
		dragOrigin = point;
	}

	function endDrag(): void {
		dragOrigin = null;
	}

	function touchDistance(a: Touch, b: Touch): number {
		return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
	}

	function touchMidpoint(a: Touch, b: Touch): { x: number; y: number } {
		return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
	}

	function handleTouchStart(event: TouchEvent): void {
		if (event.touches.length === 1) {
			dragOrigin = toContentPoint(event.touches[0].clientX, event.touches[0].clientY);
			pinchDistance = null;
		} else if (event.touches.length === 2) {
			pinchDistance = touchDistance(event.touches[0], event.touches[1]);
			dragOrigin = null;
		}
	}

	function handleTouchMove(event: TouchEvent): void {
		if (event.touches.length === 1 && dragOrigin) {
			event.preventDefault();
			const point = toContentPoint(event.touches[0].clientX, event.touches[0].clientY);
			panBy(point.x - dragOrigin.x, point.y - dragOrigin.y);
			dragOrigin = point;
		} else if (event.touches.length === 2 && pinchDistance !== null) {
			event.preventDefault();
			const [a, b] = [event.touches[0], event.touches[1]];
			const newDistance = touchDistance(a, b);
			const mid = touchMidpoint(a, b);
			const { x, y } = toContentPoint(mid.x, mid.y);
			zoomAt(x, y, newDistance / pinchDistance);
			pinchDistance = newDistance;
		}
	}

	function handleTouchEnd(event: TouchEvent): void {
		if (event.touches.length === 0) {
			dragOrigin = null;
			pinchDistance = null;
		} else if (event.touches.length === 1) {
			dragOrigin = toContentPoint(event.touches[0].clientX, event.touches[0].clientY);
			pinchDistance = null;
		}
	}

	onMount(() => {
		function handleKeydown(event: KeyboardEvent): void {
			if (event.key === 'Escape') clearSelection();
		}
		window.addEventListener('keydown', handleKeydown);
		// Am window, nicht am SVG: ein Zug endet auch, wenn der Zeiger die Kartenfläche
		// während des Ziehens verlässt (F-12, Zeile „Pan").
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', endDrag);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', endDrag);
		};
	});
</script>

<svg
	class="map"
	viewBox="0 0 {VIEWBOX.width} {VIEWBOX.height}"
	preserveAspectRatio="xMidYMid meet"
	role="img"
	aria-label="Streudiagramm: Effort waagerecht, Impact senkrecht"
	bind:this={svgEl}
	onclick={() => clearSelection()}
	onwheel={handleWheel}
	onmousedown={handleMouseDown}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
	ontouchcancel={handleTouchEnd}
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

	<g transform="translate({$viewport.x} {$viewport.y}) scale({$viewport.scale})">
		<Regions {domainMax} />
		<Grid {domainMax} />
		<Axes {domainMax} />
		<Edges {map} {placements} />
		<FeatureNodes {map} {domainMax} scale={$viewport.scale} />
	</g>
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
