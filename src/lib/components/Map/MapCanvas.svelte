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

	F-16 · Kontextmenü und Verbindungsvorgang (features/F-16-verbindungsvorgang.md, Abschnitt
	„Ablauf" Schritt 1; Absatz nach „Fachregeln"): Rechtsklick auf die Karte — ein Feature oder
	freie Fläche — meldet Bildschirmposition und Ziel über `onContextMenu` an den Aufrufer
	(routes/+page.svelte), der ContextMenu.svelte öffnet. Das native Browser-Kontextmenü wird
	über einen *capturing* `contextmenu`-Listener auf `window` unterdrückt, an `onMount`
	angehängt statt am SVG-Element selbst: Ein Listener am Element sitzt im Ereignispfad erst in
	der Ziel-/Bubbling-Phase, also nach jedem capturing-Listener, den ein Test (oder anderer
	Seitencode) seinerseits auf `window` registriert, um `event.defaultPrevented` zu prüfen —
	`preventDefault()` käme für einen solchen Listener zu spät. Ein früh (beim Einhängen dieser
	Komponente) registrierter capturing-Listener auf `window` selbst läuft dagegen vor jedem
	später hinzukommenden capturing-Listener auf demselben Ziel (Ereignisse am selben Knoten
	feuern in Registrierungsreihenfolge) und erreicht damit zuverlässig auch capturing-Prüfungen
	von außen (e2e/F-16-verbindungsvorgang.spec.ts, `rightClickAt()`). Welches Feature getroffen
	wurde, ermittelt `data-feature-id` (FeatureNodes.svelte) über `closest()` am Ereignisziel;
	ohne Treffer gilt der Rechtsklick der freien Fläche. ESC läuft ab sofort über
	`handleEscape()` (src/lib/store/selection.ts) statt über `clearSelection()`: F-16, Abschnitt
	„Abbruch" — „ESC bricht zuerst den Verbindungsvorgang ab, erst ein zweites ESC hebt die
	Selektion auf" —, die von `clearSelection()` allein nicht zu unterscheidenden zwei Stufen
	liegen bereits in `handleEscape()` selbst (Leitplanke 3: Fachregel steht im Aggregat/Store,
	nicht hier).

	F-17 · Beziehungen bearbeiten und löschen (features/F-17-beziehungen-pflegen.md, Abschnitt
	„Umfang"): Ein Rechtsklick, der zuerst eine Kante trifft (`data-relation-from`/`-to`/`-type`
	aus Edges.svelte über `closest()`), meldet `{ kind: 'relation', relation }` statt eines
	Feature- oder Leerflächentreffers — geprüft vor dem Feature-Treffer, weil Kanten außerhalb
	jeder Feature-Gruppe liegen und beide Prüfungen sich deshalb nie überschneiden. Die Beziehung
	selbst wird dabei aus `map.relations` nachgeschlagen (Tripel `from`/`to`/`type` ist laut
	INT-04 mapweit eindeutig), damit auch ein vorhandenes Label mitgeführt wird, das die
	DOM-Attribute allein nicht trügen. Long-Press bildet denselben Treffer über Touch nach
	(Edges.svelte, `onLongPress`) — dort liegt die volle Beziehung als `g.relation` bereits vor,
	ein Nachschlagen entfällt.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { VIEWBOX } from '../../layout/scales';
	import { placeFeatures } from '../../layout/jitter';
	import type { FeatureId, FeatureMap, Relation } from '../../model/types';
	import { clearSelection, handleEscape } from '../../store/selection';
	import { panBy, viewport, zoomAt } from '../../store/viewport';
	import Regions from './Regions.svelte';
	import Grid from './Grid.svelte';
	import Axes from './Axes.svelte';
	import Edges from './Edges.svelte';
	import FeatureNodes from './FeatureNodes.svelte';
	import Legend from './Legend.svelte';
	import type { ContextMenuTarget } from '../ContextMenu/ContextMenu.svelte';

	let {
		map,
		domainMax,
		onContextMenu
	}: {
		map: FeatureMap;
		domainMax: number;
		/** Rechtsklick oder Long-Press auf der Karte (F-16, Ablauf Schritt 1; F-17) —
		 * Bildschirmposition und Ziel (ein bestimmtes Feature, eine Beziehung oder freie Fläche). */
		onContextMenu: (x: number, y: number, target: ContextMenuTarget) => void;
	} = $props();

	function handleFeatureContextMenu(x: number, y: number, id: FeatureId): void {
		onContextMenu(x, y, { kind: 'feature', id });
	}

	/** Long-Press auf einer Kante (F-17, Absatz zur Trefferfläche). */
	function handleEdgeLongPress(x: number, y: number, relation: Relation): void {
		onContextMenu(x, y, { kind: 'relation', relation });
	}

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

	/** Rechtsklick auf die Karte (F-16, Ablauf Schritt 1; Absatz nach „Fachregeln") — capturing
	 * auf `window`, siehe Modulkommentar zur Begründung. Nur Rechtsklicks innerhalb dieses
	 * SVGs werden behandelt; anderswo (Kopfband, Verzeichnis, Kartuschen) bleibt das native
	 * Kontextmenü unverändert, weil F-16 es nur „über der Karte" ersetzt. */
	function handleContextMenu(event: MouseEvent): void {
		if (!svgEl || !(event.target instanceof Node) || !svgEl.contains(event.target)) return;
		event.preventDefault();
		const target = event.target as Element;

		const edgeEl = target.closest?.('[data-relation-from]');
		if (edgeEl) {
			const from = edgeEl.getAttribute('data-relation-from') as FeatureId;
			const to = edgeEl.getAttribute('data-relation-to') as FeatureId;
			const type = edgeEl.getAttribute('data-relation-type') as Relation['type'];
			const relation = map.relations.find(
				(r) => r.from === from && r.to === to && r.type === type
			);
			if (relation) {
				onContextMenu(event.clientX, event.clientY, { kind: 'relation', relation });
				return;
			}
		}

		const featureEl = target.closest?.('[data-feature-id]');
		if (featureEl) {
			onContextMenu(event.clientX, event.clientY, {
				kind: 'feature',
				id: featureEl.getAttribute('data-feature-id') as FeatureId
			});
		} else {
			onContextMenu(event.clientX, event.clientY, { kind: 'blank' });
		}
	}

	onMount(() => {
		function handleKeydown(event: KeyboardEvent): void {
			if (event.key === 'Escape') handleEscape();
		}
		window.addEventListener('keydown', handleKeydown);
		// Am window, nicht am SVG: ein Zug endet auch, wenn der Zeiger die Kartenfläche
		// während des Ziehens verlässt (F-12, Zeile „Pan").
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', endDrag);
		// capture: true — siehe Modulkommentar (F-16, Kontextmenü-Abschnitt).
		window.addEventListener('contextmenu', handleContextMenu, true);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', endDrag);
			window.removeEventListener('contextmenu', handleContextMenu, true);
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
		<Edges {map} {placements} onLongPress={handleEdgeLongPress} />
		<FeatureNodes {map} {domainMax} scale={$viewport.scale} onLongPress={handleFeatureContextMenu} />
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
