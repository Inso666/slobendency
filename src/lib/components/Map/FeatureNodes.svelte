<!--
	F-09 · Feature-Signaturen und Jitter (features/F-09-feature-signaturen.md, Abschnitt „Umfang").
	F-11 · Selektion, Hervorhebung, Dimming (features/F-11-selektion.md, Abschnitt „Darstellung").

	Zeichnet die Feature-Signaturen (Punkt, Name, Lotung, ggf. Ankerkreuz) auf Basis von
	src/lib/layout/jitter.ts. Anzeigenamen laufen ausschließlich über Svelte-Textbindung
	(NFR-21) — kein `{@html}`, kein injizierbares Markup.

	Selektion (Klick, FR-40) sowie Halo und Dimming leiten sich aus src/lib/store/highlight.ts
	und src/lib/store/selection.ts ab (F-11) — die Regel, was hervorgehoben wird, ist bereits
	dort entschieden; hier wird nur gezeichnet.

	F-24 · Hervorhebung: Abdunkeln oder Ausblenden (features/F-24-hervorhebung-sichtbarkeit.md,
	Abschnitt „Umfang"; PRD FR-43, FR-47): Zusätzlich zu `highlight` wird `highlightVisibility`
	aus src/lib/store/selection.ts geprüft. Bei `'hide'` erhalten nicht beteiligte Signaturpunkte
	und ihre Trefferflächen das native Attribut `hidden` statt (nur) der Klasse `.dim` — vollständig
	aus der Darstellung entfernt, ohne Trefferfläche, nicht per Tab erreichbar (PRD, Abschnitt 5.6
	„Visuelle Kodierung", Zeile „Ausgeblendetes Element"). Bei `'dim'` (Standard) bleibt das
	Verhalten aus F-11 unverändert.

	F-25 · Datenzoom (features/F-25-datenzoom.md, Abschnitt „Umfang", „Verhalten"): ersetzt die
	F-12-Zoom-Mechanik vollständig. Ein Zug, der auf einem Feature beginnt, verschiebt den
	Ausschnitt nicht, sondern selektiert (dort gilt der Klick der Selektion) — Maus- und
	Touch-Beginn stoppen ihre Ausbreitung deshalb hier, bevor MapCanvas.svelte sie als Ziehen auf
	freier Fläche werten könnte. Anders als in F-12 bleiben Punktradius und Schriftgrößen bei
	jedem Zoomstand bildschirmkonstant (kein Herunter-/Hochrechnen mehr gegen einen Maßstab) —
	effortMin/effortMax/impactMin/impactMax (aus src/lib/store/viewport.ts, über MapCanvas.svelte)
	bestimmen nur noch die *Position* der Signaturen im sichtbaren Fenster, über
	src/lib/layout/jitter.ts.

	F-16 · Kontextmenü und Verbindungsvorgang (features/F-16-verbindungsvorgang.md, Abschnitt
	„Ablauf" Schritt 1): Jeder Signaturpunkt trägt `data-feature-id`, über das
	MapCanvas.svelte einen Rechtsklick anywhere im SVG dem richtigen Feature zuordnet (dortiger
	Kommentar erklärt, warum das `contextmenu`-Abfangen selbst dort und nicht hier sitzt: die
	native Menüunterdrückung muss früher greifen, als ein hier gesetzter Listener es könnte).
	Long-Press (UI-12, etwa 500 ms) bildet über `onLongPress` denselben Aufruf über Touch nach —
	kein echtes `contextmenu`-Ereignis steht dahinter, deshalb ein eigener Kanal, direkt an
	dieser Komponente. Der gesetzte Startpunkt eines laufenden Verbindungsvorgangs
	(`connectSource`, src/lib/store/selection.ts) bleibt dauerhaft markiert, solange der Vorgang
	läuft (FR-14): eine gestrichelte Kontur in --magenta um den Signaturpunkt.

	F-22 · Responsives Verhalten und Touch (features/F-22-responsiv.md, Abschnitt
	„Trefferflächen"): Jede Feature-Signatur trägt zusätzlich einen unsichtbaren Trefferkreis
	(`feature-hitarea-<id>`, Kind derselben `<g class="node">`, deshalb ohne eigene
	Ereignisbehandlung an denselben Klick-/Touch-Zielen der Gruppe beteiligt) mit einem Radius aus
	`hitAreaRadiusForScale()` (src/lib/interaction/hitArea.ts), zusätzlich durch `pxPerUnit`
	(MapCanvas.svelte, gemessene Bildschirmgröße je Inhaltseinheit) auf die tatsächlich
	gerenderte Größe der äußeren `<svg>` umgerechnet, damit er bei jedem Breakpoint und jedem
	Maßstab mindestens 44 px Bildschirmgröße erreicht (UI-16) — ein kleiner Sicherheitsaufschlag
	fängt Rundungsfehler der CTM-Messung ab. Bewegt sich ein laufender Long-Press-Druck um mehr
	als `LONG_PRESS_DRAG_THRESHOLD_PX` (`exceedsLongPressDragThreshold()`,
	src/lib/interaction/longPress.ts), bricht der Timer ab und die Bewegung verschiebt
	stattdessen den Ausschnitt (`centerOn`, src/lib/store/viewport.ts, über
	src/lib/interaction/pan.ts — F-25, Abschnitt „Umfang": „kein gesondertes panBy() mehr") —
	über dieselbe Bildschirm-zu-Inhaltsraum-Umrechnung (`toContentPoint`, als Prop von
	MapCanvas.svelte durchgereicht) und dieselbe Wertebereichs-Umrechnung (effortAtX/impactAtY,
	src/lib/layout/scales.ts), die MapCanvas.svelte für sein eigenes Ziehen auf freier Fläche
	verwendet, kein zweiter Mechanismus (features/README.md, Leitplanke 3). Bleibt die Bewegung
	unter der Schwelle, läuft der Long-Press-Timer unverändert weiter (Zittern ist kein Drag).
-->
<script lang="ts">
	import { placeFeatures, type Placement } from '../../layout/jitter';
	import { PLOT, effortAtX, impactAtY } from '../../layout/scales';
	import type { Feature, FeatureId, FeatureMap } from '../../model/types';
	import { highlight } from '../../store/highlight';
	import { connectSource, highlightVisibility, selectedId } from '../../store/selection';
	import { centerOn, viewport } from '../../store/viewport';
	import { hitAreaRadiusForScale } from '../../interaction/hitArea';
	import { exceedsLongPressDragThreshold } from '../../interaction/longPress';
	import { panTarget } from '../../interaction/pan';

	/** Radius des Halo-Kreises um das selektierte Feature (F-11, Abschnitt „Darstellung"). */
	const HALO_RADIUS = 15;

	/** Radius der gestrichelten Startmarkierung — eine Stufe größer als der Halo, damit beide
	 * gleichzeitig sichtbar bleiben, wenn Selektion und Verbindungsstart dasselbe Feature
	 * betreffen (F-16, Ablauf Schritt 2, FR-14). */
	const CONNECT_START_RADIUS = 19;

	/** Dauer eines Long-Press bis zum Öffnen des Kontextmenüs (F-16, Ablauf Schritt 1: "auf
	 * Mobilgeräten Long-Press, etwa 500 ms"; PRD UI-12). */
	const LONG_PRESS_MS = 500;

	let {
		map,
		domainMax,
		effortMin,
		effortMax,
		impactMin,
		impactMax,
		pxPerUnit = 1,
		toContentPoint,
		onLongPress
	}: {
		map: FeatureMap;
		domainMax: number;
		/** Sichtbares Fenster je Achse (F-25 · features/F-25-datenzoom.md, Abschnitt „Umfang"),
		 * aus src/lib/store/viewport.ts über MapCanvas.svelte — bestimmt die Position, nicht die
		 * Größe, der Signaturen (siehe Modulkommentar). */
		effortMin: number;
		effortMax: number;
		impactMin: number;
		impactMax: number;
		/** CSS-Pixel je Karten-Inhaltseinheit (MapCanvas.svelte, gemessen über
		 * `getScreenCTM()` der äußeren `<svg>`) — F-22, Grundlage der tatsächlichen
		 * Bildschirmgröße der Trefferfläche. */
		pxPerUnit?: number;
		/** Rechnet eine Bildschirmposition in den unskalierten Inhaltsraum von VIEWBOX/PLOT um
		 * (dieselbe Funktion wie in MapCanvas.svelte) — F-22: Grundlage für das Verschieben der
		 * Karte, wenn ein Long-Press-Druck die 10-px-Schwelle überschreitet. */
		toContentPoint: (clientX: number, clientY: number) => { x: number; y: number };
		/** Long-Press auf einem Touchgerät (F-16, Ablauf Schritt 1; PRD UI-12) — meldet
		 * Bildschirmposition und Kennung wie ein Rechtsklick, den MapCanvas.svelte für einen
		 * Feature-Treffer über `onContextMenu` weitergibt. */
		onLongPress: (x: number, y: number, id: FeatureId) => void;
	} = $props();

	/** Trefferkreis-Radius in Karten-Inhaltseinheiten (F-22, Abschnitt „Trefferflächen"; UI-16):
	 * die reine Umrechnung bei Grundmaßstab (F-25 entfernt jede Bildskalierung, siehe
	 * Modulkommentar — hitAreaRadiusForScale() bekommt deshalb immer 1), zusätzlich durch
	 * `pxPerUnit` auf die tatsächlich gerenderte Größe der äußeren `<svg>` umgerechnet, mit einem
	 * kleinen Sicherheitsaufschlag gegen Rundungsfehler der CTM-Messung. */
	const HIT_AREA_SAFETY_MARGIN = 1.05;
	let hitAreaRadius = $derived(
		(hitAreaRadiusForScale(1) / Math.max(pxPerUnit, 0.0001)) * HIT_AREA_SAFETY_MARGIN
	);

	/** Radius des Signaturpunkts — bildschirmkonstant bei jedem Zoomstand (F-25, Abschnitt
	 * „Verhalten"; F-09, Abschnitt „Darstellung"). */
	const NODE_RADIUS = 8;

	/** Schriftgröße des Feature-Namens — bildschirmkonstant (F-25, Abschnitt „Verhalten"; F-09,
	 * Abschnitt „Darstellung"). */
	const LABEL_FONT_SIZE = 13;
	/** Schriftgröße der Lotung — bildschirmkonstant (F-25, Abschnitt „Verhalten"). */
	const LOTUNG_FONT_SIZE = 10.5;

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

	let placements = $derived(
		placeFeatures(map, domainMax, effortMin, effortMax, impactMin, impactMax)
	);

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
	 * Fläche wertet (F-11, Abschnitt „Interaktion"). Ein Klick, der unmittelbar auf einen
	 * erfolgreichen Long-Press folgt (derselbe Touch, F-16), selektiert nicht zusätzlich — das
	 * Kontextmenü ist bereits die Antwort auf diese Berührung. */
	function selectFeature(event: MouseEvent, id: FeatureId): void {
		event.stopPropagation();
		if (longPressFired) {
			longPressFired = false;
			return;
		}
		if (dragging) {
			dragging = false;
			return;
		}
		selectedId.set(id);
	}

	/** Stoppt Maus-Beginn auf einem Feature, damit MapCanvas.svelte daraus kein Ziehen
	 * auf freier Fläche macht (F-12, Abschnitt „Verhalten": „Ein Ziehen, das auf einem Feature
	 * beginnt, verschiebt die Karte nicht"). Der Klick selbst (Selektion) läuft unbeeinflusst
	 * über selectFeature() weiter. */
	function stopDragStart(event: MouseEvent): void {
		event.stopPropagation();
	}

	/** Laufender Long-Press-Timer, oder undefined ohne laufenden Druck (F-16, Ablauf Schritt 1;
	 * PRD UI-12). Je ein Timer über alle Features hinweg genügt — ein Touchgerät führt ohnehin
	 * nur einen Druck gleichzeitig aus. */
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;

	/** True unmittelbar nachdem ein Long-Press das Kontextmenü geöffnet hat, bis zum nächsten
	 * Klick auf demselben Feature (siehe selectFeature()) — verhindert, dass derselbe Touch das
	 * Feature zusätzlich über den anschließenden synthetischen Klick selektiert. */
	let longPressFired = false;

	/** Bildschirmposition, an der der laufende Touch begonnen hat, oder null ohne laufenden Druck
	 * (F-22, Abschnitt „Trefferflächen") — Grundlage der 10-px-Schwelle zwischen Long-Press und
	 * Drag. */
	let touchStartPoint: { x: number; y: number } | null = null;

	/** Wertepunkt (effort/impact), der beim Überschreiten der 10-px-Schwelle unter dem Finger lag
	 * und für die Dauer des Zugs unverändert bleibt (F-25, Abschnitt „Umfang": centerOn() statt
	 * eines gesonderten panBy(), siehe src/lib/interaction/pan.ts) — dasselbe Verfahren wie
	 * MapCanvas.svelte's eigenes Ziehen auf freier Fläche (F-22). */
	let dragOrigin: { effort: number; impact: number } | null = null;

	/** Wandelt eine Bildschirmposition über toContentPoint() (PLOT-Pixelraum) in den Wertebereich
	 * des aktuell sichtbaren Fensters um (F-25) — dieselbe Umrechnung wie in MapCanvas.svelte. */
	function toValuePoint(clientX: number, clientY: number): { effort: number; impact: number } {
		const { x, y } = toContentPoint(clientX, clientY);
		return {
			effort: effortAtX(x, effortMin, effortMax),
			impact: impactAtY(y, impactMin, impactMax)
		};
	}

	/** True, sobald eine laufende Berührung als Drag statt als Long-Press gilt (F-22, Abschnitt
	 * „Trefferflächen": „Bewegt sich der Finger … um mehr als 10 px, gilt es als Drag") —
	 * verhindert danach zusätzlich die Selektion durch den abschließenden synthetischen Klick,
	 * wie longPressFired es bereits für einen erfolgreichen Long-Press tut. */
	let dragging = false;

	function stopTouchDragStart(event: TouchEvent, id: FeatureId): void {
		event.stopPropagation();
		const touch = event.touches[0];
		if (!touch) return;
		const point = { x: touch.clientX, y: touch.clientY };
		touchStartPoint = point;
		dragOrigin = null;
		dragging = false;
		longPressTimer = setTimeout(() => {
			longPressTimer = undefined;
			longPressFired = true;
			onLongPress(point.x, point.y, id);
		}, LONG_PRESS_MS);
	}

	/** Bricht einen laufenden Long-Press-Timer ab — Loslassen oder Abbrechen der Berührung vor
	 * Ablauf der Frist zählt nicht als Long-Press (F-16, Ablauf Schritt 1). Eine Bewegung bricht
	 * ihn nur noch ab, wenn sie die 10-px-Schwelle überschreitet (F-22, siehe
	 * handleTouchMove()) — kleine Bewegungen (Zittern) lassen den Timer unangetastet weiterlaufen. */
	function cancelLongPress(): void {
		if (longPressTimer === undefined) return;
		clearTimeout(longPressTimer);
		longPressTimer = undefined;
	}

	/** F-22, Abschnitt „Trefferflächen": Bewegt sich der Finger während eines laufenden
	 * Long-Press-Drucks um mehr als `LONG_PRESS_DRAG_THRESHOLD_PX`, gilt es als Drag statt als
	 * Long-Press — der Timer bricht ab, und die Bewegung verschiebt stattdessen die Karte, über
	 * dieselbe Bildschirm-zu-Inhaltsraum-Umrechnung, die MapCanvas.svelte für sein eigenes Ziehen
	 * auf freier Fläche verwendet (kein zweiter Mechanismus, features/README.md, Leitplanke 3).
	 * Bleibt die Bewegung unter der Schwelle, bleibt der Long-Press-Timer unverändert bestehen. */
	function handleTouchMove(event: TouchEvent): void {
		const touch = event.touches[0];
		if (!touch || !touchStartPoint) return;

		if (!dragging) {
			const dx = touch.clientX - touchStartPoint.x;
			const dy = touch.clientY - touchStartPoint.y;
			if (!exceedsLongPressDragThreshold(dx, dy)) return;
			dragging = true;
			cancelLongPress();
			dragOrigin = toValuePoint(touchStartPoint.x, touchStartPoint.y);
		}

		event.stopPropagation();
		event.preventDefault();
		if (dragOrigin) {
			const point = toValuePoint(touch.clientX, touch.clientY);
			const next = panTarget(dragOrigin, point, $viewport);
			centerOn(next.centerEffort, next.centerImpact);
		}
	}

	/** Beendet einen laufenden Touch (Loslassen oder Abbrechen) — setzt sowohl den Long-Press- als
	 * auch den Drag-Zustand zurück (F-22). */
	function handleTouchEnd(): void {
		cancelLongPress();
		touchStartPoint = null;
		dragOrigin = null;
	}
</script>

<!-- F-22, Abschnitt „Trefferflächen"; UI-16: unsichtbare Trefferkreise, mindestens 44 px
	Bildschirmgröße unabhängig von Breakpoint und Maßstab (siehe hitAreaRadius oben) — in einer
	eigenen, vor den sichtbaren Signaturen gezeichneten Gruppe, statt als Kind von `<g class="node">`
	(so noch in einer früheren Fassung dieser Datei): Bei eng benachbarten oder sich deckenden
	Signaturen (F-09, Jitter) überlappen sich die vergrößerten Trefferkreise benachbarter Features
	unvermeidlich; läge der Trefferkreis eines Features im selben Element wie seine sichtbare
	Signatur, könnte der Trefferkreis eines später gezeichneten Nachbarn die sichtbare Signatur
	eines früheren Features optisch überdecken und dessen eigenen Klick abfangen. Da alle
	sichtbaren Signaturen unten unverändert danach gezeichnet werden, liegt an jeder sichtbaren
	Signatur stets sie selbst obenauf; die Trefferkreise vergrößern lediglich die Fläche daneben.
	Dieselben Ereignisbehandlungen wie an `<g class="node">` (unten), weil ein Treffer auf einen
	reinen Trefferkreis (außerhalb jeder sichtbaren Signatur) genauso zu behandeln ist. -->
<g class="hitareas">
	{#each placements as placement (placement.id)}
		{@const isDimmed = $highlight !== null && !$highlight.features.has(placement.id)}
		{@const isHidden = isDimmed && $highlightVisibility === 'hide'}
		<circle
			class="hitarea"
			data-testid="feature-hitarea-{placement.id}"
			cx={placement.x}
			cy={placement.y}
			r={hitAreaRadius}
			pointer-events="all"
			hidden={isHidden ? true : undefined}
			onclick={(event) => selectFeature(event, placement.id)}
			onmousedown={stopDragStart}
			ontouchstart={(event) => stopTouchDragStart(event, placement.id)}
			ontouchend={handleTouchEnd}
			ontouchmove={handleTouchMove}
			ontouchcancel={handleTouchEnd}
		/>
	{/each}
</g>

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
		{@const isHidden = isDimmed && $highlightVisibility === 'hide'}
		{@const isConnectStart = placement.id === $connectSource}
		<g
			class="node"
			class:sel={isSelected}
			class:dim={isDimmed && !isHidden}
			data-feature-id={placement.id}
			hidden={isHidden ? true : undefined}
			onclick={(event) => selectFeature(event, placement.id)}
			onmousedown={stopDragStart}
			ontouchstart={(event) => stopTouchDragStart(event, placement.id)}
			ontouchend={handleTouchEnd}
			ontouchmove={handleTouchMove}
			ontouchcancel={handleTouchEnd}
		>
			{#if isSelected}
				<circle
					class="halo"
					data-testid="feature-halo-{placement.id}"
					cx={placement.x}
					cy={placement.y}
					r={HALO_RADIUS}
				/>
			{/if}
			{#if isConnectStart}
				<!-- F-16, Ablauf Schritt 2, FR-14: gestrichelte Kontur in --magenta um den
					Startpunkt eines laufenden Verbindungsvorgangs, solange dieser läuft. -->
				<circle
					class="connect-start"
					data-testid="connect-start-{placement.id}"
					cx={placement.x}
					cy={placement.y}
					r={CONNECT_START_RADIUS}
				/>
			{/if}
			<circle
				data-testid="feature-node-{placement.id}"
				class:dim={isDimmed && !isHidden}
				cx={placement.x}
				cy={placement.y}
				r={NODE_RADIUS}
			/>
			<text
				data-testid="feature-label-{placement.id}"
				x={placement.x + (flipLeft ? -LABEL_OFFSET_X : LABEL_OFFSET_X)}
				y={placement.y + LABEL_OFFSET_Y}
				text-anchor={flipLeft ? 'end' : 'start'}
				style:font-size="{LABEL_FONT_SIZE}px"
			>
				{labelOf(feature)}
			</text>
			<text
				class="snd"
				data-testid="feature-lotung-{placement.id}"
				x={placement.x + LABEL_OFFSET_X}
				y={placement.y + LOTUNG_OFFSET_Y}
				style:font-size="{LOTUNG_FONT_SIZE}px"
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
	/* F-22, Abschnitt „Trefferflächen": unsichtbare Trefferkreise, jetzt in einer eigenen Gruppe
	   vor „.nodes" (siehe Markup-Kommentar dort), deshalb kein „.node circle"-Grundstil zu
	   überschreiben. */
	.hitareas circle.hitarea {
		fill: transparent;
		stroke: none;
		cursor: pointer;
	}
	/* Halo-Kreis um das selektierte Feature (F-11, Abschnitt „Darstellung"). Selektor eine Stufe
	   spezifischer als „.node circle", damit dessen Grundfarben (Tinte/Papier) hier nicht
	   greifen — der Halo ist selbst ein Kreis innerhalb von .node. */
	.node circle.halo {
		fill: none;
		stroke: var(--magenta);
		stroke-width: 1.2;
	}
	/* Startmarkierung eines laufenden Verbindungsvorgangs (F-16, Ablauf Schritt 2, FR-14):
	   gestrichelte Kontur in --magenta, unabhängig von Selektion/Halo. */
	.node circle.connect-start {
		fill: none;
		stroke: var(--magenta);
		stroke-width: 1.4;
		stroke-dasharray: 4 4;
	}
	/* Abgedunkelte Features bleiben sichtbar, treten aber deutlich zurück (FR-43). */
	.node.dim {
		opacity: var(--dim-opacity);
	}
	/* F-24, Abschnitt „Darstellung": bei highlightVisibility "hide" tragen nicht beteiligte
	   Signaturpunkte und Trefferflächen das native Attribut `hidden` — Chromiums Standard-Stylblatt
	   setzt `[hidden] { display: none }` nur für Elemente im HTML-Namensraum, nicht für SVG
	   (geprüft: ein bloßes `hidden` auf `<g>`/`<circle>` bleibt ohne diese Regel sichtbar), deshalb
	   hier ausdrücklich nachgezogen. */
	[hidden] {
		display: none;
	}
	.anchor {
		stroke: var(--ink-soft);
		stroke-width: 1;
	}
</style>
