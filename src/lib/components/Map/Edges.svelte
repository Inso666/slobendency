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

	F-11 · Selektion, Hervorhebung, Dimming (features/F-11-selektion.md): Kanten und die an
	Feature-Zielen hängenden Ring-/Durchstreichungssignaturen dimmen nach store/highlight.ts,
	ohne die Regel hier erneut zu formulieren. Kantenbeschriftungen werden ausschließlich bei
	Hervorhebung oder Hover eingeblendet (FR-45) — Hover ist reiner Anzeigezustand dieser
	Komponente, keine Fachregel.

	F-24 · Hervorhebung: Abdunkeln oder Ausblenden (features/F-24-hervorhebung-sichtbarkeit.md,
	Abschnitt „Umfang"; PRD FR-43, FR-47): Zusätzlich zu `highlight` wird `highlightVisibility`
	aus src/lib/store/selection.ts geprüft. Bei `'hide'` erhalten nicht beteiligte Kanten (samt
	ihrer Trefferfläche), Beschriftungen, Vorbedingungsringe und Durchstreichungen das native
	Attribut `hidden` statt (nur) der Klasse `.dim` — vollständig aus der Darstellung entfernt
	(PRD, Abschnitt 5.6 „Visuelle Kodierung", Zeile „Ausgeblendetes Element"). Bei `'dim'`
	(Standard) bleibt das Verhalten aus F-11 unverändert.

	F-17 · Beziehungen bearbeiten und löschen (features/F-17-beziehungen-pflegen.md, Abschnitt
	"Umfang"/Absatz zur Trefferfläche): Jede Kante trägt `data-relation-from`/`-to`/`-type`, über
	die MapCanvas.svelte einen Rechtsklick anywhere im SVG der richtigen Beziehung zuordnet —
	genau das Gegenstück zu `data-feature-id` in FeatureNodes.svelte (F-16). Long-Press (UI-12,
	dieselben 500 ms wie in FeatureNodes.svelte) bildet über `onLongPress` denselben Aufruf über
	Touch nach; die bereits bestehende Trefferfläche aus F-11 (`.edge-hitbox`, 12 Einheiten
	Breite) dient dabei zugleich als Ziel des Rechtsklicks, ist Kind derselben Gruppe wie die
	sichtbare Linie und liegt so unter derselben `data-relation-*`-Zuordnung.

	Bug A · Zoom-Clipping (https://github.com/Inso666/slobendency/issues/3, Abschnitt „Erwartetes
	Verhalten"): eine Kante wird ausgeblendet, sobald mindestens einer ihrer beiden Endpunkte
	außerhalb des sichtbaren Fensters liegt, ebenso der an einem betroffenen Ziel hängende
	Vorbedingungsring/Durchstreichung — dieselbe Prüfung wie in FeatureNodes.svelte
	(`isPositionVisible()`, src/lib/layout/scales.ts, am unversetzten Ankerpunkt aus den bereits
	übergebenen `placements`), einmal aus `placements` abgeleitet und von jeder Stelle unten
	gelesen, damit die Fachregel „ist ein Feature sichtbar" nicht zweimal hergeleitet wird
	(features/README.md, Leitplanke 3).
-->
<script lang="ts">
	import { layoutEdges } from '../../layout/edges';
	import type { FeatureMap, Relation, RelationType } from '../../model/types';
	import type { Placement } from '../../layout/jitter';
	import { highlight, relationKey } from '../../store/highlight';
	import { cycles } from '../../store/cycles';
	import { isOnCycle } from '../../graph/cycles';
	import { highlightVisibility } from '../../store/selection';
	import { isPositionVisible } from '../../layout/scales';

	/** Dauer eines Long-Press bis zum Öffnen des Beziehungsmenüs (F-17, Absatz zur
	 * Trefferfläche: "Auf Touchgeräten öffnet Long-Press ... dasselbe Menü"); dieselbe Frist wie
	 * in FeatureNodes.svelte (F-16, PRD UI-12). */
	const LONG_PRESS_MS = 500;

	let {
		map,
		placements,
		onLongPress
	}: {
		map: FeatureMap;
		placements: Placement[];
		/** Long-Press auf einer Kante (F-17, Absatz zur Trefferfläche) — meldet
		 * Bildschirmposition und die betroffene Beziehung, wie ein Rechtsklick, den
		 * MapCanvas.svelte über `data-relation-*` derselben Beziehung zuordnet. */
		onLongPress: (x: number, y: number, relation: Relation) => void;
	} = $props();

	/** Kennung der Beziehung, deren Kante gerade mit der Maus überfahren wird (F-11, FR-45). */
	let hoveredKey = $state<string | null>(null);

	/** Laufender Long-Press-Timer, oder undefined ohne laufenden Druck (F-17, wie
	 * FeatureNodes.svelte, F-16). Je ein Timer über alle Kanten hinweg genügt — ein Touchgerät
	 * führt ohnehin nur einen Druck gleichzeitig aus. */
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;

	function startLongPress(event: TouchEvent, relation: Relation): void {
		event.stopPropagation();
		const touch = event.touches[0];
		if (!touch) return;
		const point = { x: touch.clientX, y: touch.clientY };
		longPressTimer = setTimeout(() => {
			longPressTimer = undefined;
			onLongPress(point.x, point.y, relation);
		}, LONG_PRESS_MS);
	}

	/** Bricht einen laufenden Long-Press-Timer ab — Loslassen, Bewegen oder Abbrechen der
	 * Berührung vor Ablauf der Frist zählt nicht als Long-Press (wie FeatureNodes.svelte). */
	function cancelLongPress(): void {
		if (longPressTimer === undefined) return;
		clearTimeout(longPressTimer);
		longPressTimer = undefined;
	}

	/** Radius des Vorbedingungsrings (design/03-seekarte.html, Klasse `.ring`). */
	const RING_RADIUS = 15;

	/** Halber Versatz der Durchstreichung je Achse (design/03-seekarte.html, Klasse `.strike`). */
	const STRIKE_HALF = 8;

	/** Halbe Kantenlänge der x-Endmarke (design/03-seekarte.html, Legendeneintrag „schließt aus"). */
	const CROSS_HALF = 4;

	let geometries = $derived(layoutEdges(map.relations, placements));
	let placementById = $derived(new Map(placements.map((placement) => [placement.id, placement])));

	/** Je Feature: liegt sein Ankerpunkt innerhalb des sichtbaren Fensters (Bug A ·
	 * Zoom-Clipping)? Dieselbe Ableitung wie in FeatureNodes.svelte, hier aus den übergebenen
	 * `placements` statt aus eigenen Fensterwerten, damit diese Komponente effortMin/effortMax/
	 * impactMin/impactMax nicht zusätzlich kennen muss. */
	let visibility = $derived(
		new Map(placements.map((placement) => [placement.id, isPositionVisible(placement.anchorX, placement.anchorY)]))
	);

	/** True, sobald mindestens eines der beiden Enden außerhalb des sichtbaren Fensters liegt
	 * (Bug-Report, Abschnitt „Erwartetes Verhalten": „falls beide Endpunkte betroffen, die
	 * zugehörige Kante" — hier bereits ab einem betroffenen Endpunkt). */
	function isEdgeOutOfWindow(relation: Relation): boolean {
		return visibility.get(relation.from) === false || visibility.get(relation.to) === false;
	}

	function isFeatureOutOfWindow(id: string): boolean {
		return visibility.get(id) === false;
	}

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
		{@const key = relationKey(g.relation)}
		{@const isHighlighted = $highlight !== null && $highlight.relations.has(key)}
		{@const isDimmed = $highlight !== null && !isHighlighted}
		{@const isHidden = (isDimmed && $highlightVisibility === 'hide') || isEdgeOutOfWindow(g.relation)}
		{@const showLabel = isHighlighted || hoveredKey === key}
		{@const isCyclic = isOnCycle($cycles, g.relation)}
		<g
			class="edge-group"
			data-relation-from={g.relation.from}
			data-relation-to={g.relation.to}
			data-relation-type={g.relation.type}
			hidden={isHidden ? true : undefined}
			ontouchstart={(event) => startLongPress(event, g.relation)}
			ontouchend={cancelLongPress}
			ontouchmove={cancelLongPress}
			ontouchcancel={cancelLongPress}
		>
			<line
				data-testid="edge-{g.relation.from}-{g.relation.to}-{g.relation.type}"
				class="edge {EDGE_CLASS[g.relation.type]}"
				class:dim={isDimmed && !isHidden}
				class:cyclic={isCyclic}
				x1={g.x1}
				y1={g.y1}
				x2={g.x2}
				y2={g.y2}
				marker-end={MARKER[g.relation.type]}
			/>
			<!-- Unsichtbarer, breiterer Trefferbereich für Hover (FR-45) und Rechtsklick/Long-Press
				 (F-17): die sichtbare Linie ist nur 1,4 Einheiten breit, bei `relates` zusätzlich
				 gestrichelt — beides macht sie als Zeigerziel unzuverlässig klein bzw. lückenhaft. -->
			<line
				class="edge-hitbox"
				x1={g.x1}
				y1={g.y1}
				x2={g.x2}
				y2={g.y2}
				onmouseenter={() => (hoveredKey = key)}
				onmouseleave={() => {
					if (hoveredKey === key) hoveredKey = null;
				}}
			/>
		</g>

		{#if g.relation.label}
			<!-- F-20 · SVG-Export (features/F-20-export-svg.md, Abschnitt „Ablauf" Schritt 4):
				die Beschriftung einer beschrifteten Beziehung muss im gerenderten SVG vorhanden
				sein, damit buildExportSvg() sie unabhängig vom aktuellen Bildschirmzustand
				sichtbar setzen kann — deshalb steht sie immer im DOM (F-11, FR-45 bleibt
				gewahrt: sie ist per Stil verborgen, außer bei Hervorhebung/Hover). -->
			<text
				data-testid="edge-label-{g.relation.from}-{g.relation.to}-{g.relation.type}"
				class="edge-label"
				style:visibility={showLabel ? 'visible' : 'hidden'}
				hidden={isHidden ? true : undefined}
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
				class:dim={isDimmed && !isHidden}
				hidden={isHidden ? true : undefined}
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
		{@const isDimmed = $highlight !== null && !$highlight.features.has(id)}
		{@const isHidden = (isDimmed && $highlightVisibility === 'hide') || isFeatureOutOfWindow(id)}
		{#if p}
			<circle
				data-testid="edge-ring-{id}"
				class="ring"
				class:dim={isDimmed && !isHidden}
				hidden={isHidden ? true : undefined}
				cx={p.x}
				cy={p.y}
				r={RING_RADIUS}
			/>
		{/if}
	{/each}

	{#each strikeTargets as id (id)}
		{@const p = placementById.get(id)}
		{@const isDimmed = $highlight !== null && !$highlight.features.has(id)}
		{@const isHidden = (isDimmed && $highlightVisibility === 'hide') || isFeatureOutOfWindow(id)}
		{#if p}
			<line
				data-testid="edge-strike-{id}"
				class="strike"
				class:dim={isDimmed && !isHidden}
				hidden={isHidden ? true : undefined}
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
	.edge-hitbox {
		fill: none;
		stroke: transparent;
		stroke-width: 12;
		cursor: pointer;
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
	/* F-23, Abschnitt „Umfang": die am Zyklus beteiligten requires-Kanten werden auf der Karte
	   dauerhaft in --magenta gezeichnet, auch ohne Selektion (INT-05, AK-08). Zwei Klassen
	   (.e-req.cyclic) sind spezifischer als .e-req allein und gewinnen deshalb ohne !important. */
	.e-req.cyclic {
		stroke: var(--magenta);
	}
	.crossmark line {
		stroke: var(--magenta);
		stroke-width: 1.4;
	}
	.edge-label {
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
	/* Abgedunkelte Kanten und Zielsignaturen bleiben sichtbar, treten aber deutlich zurück
	   (FR-43); der Opazitätswert ist der Tafel-Token aus src/app.css (F-11). */
	.edge.dim,
	.ring.dim,
	.strike.dim,
	.crossmark.dim {
		opacity: var(--dim-opacity);
	}
	/* F-24, Abschnitt „Darstellung": bei highlightVisibility "hide" tragen nicht beteiligte Kanten
	   (samt Trefferfläche), Beschriftungen, Vorbedingungsringe und Durchstreichungen das native
	   Attribut `hidden` — Chromiums Standard-Stylblatt setzt `[hidden] { display: none }` nur für
	   Elemente im HTML-Namensraum, nicht für SVG (siehe FeatureNodes.svelte), deshalb hier
	   ausdrücklich nachgezogen. */
	[hidden] {
		display: none;
	}
</style>
