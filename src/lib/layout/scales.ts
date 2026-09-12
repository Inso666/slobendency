// Kartengerüst: Skalen (F-08 · features/F-08-kartengeruest.md, Abschnitt „Umfang").
//
// Reine Rechenfunktionen ohne Svelte- oder DOM-Bezug (F-08, Abschnitt „DDD-Einordnung"),
// damit sie für sich getestet werden können und der spätere Bildexport (NFR-43) dieselbe
// Struktur wiederverwenden kann.
//
// Signatur ist vom Test-Agenten vorgegeben. Rümpfe sind Aufgabe des Feature-Agenten.
// VIEWBOX und PLOT stehen bereits als konkrete Werte in features/F-08-kartengeruest.md und
// sind hier wortgleich übernommen, keine zu implementierende Logik.

import { FIBONACCI } from '../model/types';
import type { FeatureMap, Quadrant } from '../model/types';
import { DEFAULT_ESTIMATION_MODE, DEFAULT_ESTIMATION_RANGE } from '../store/settings';
import type { EstimationMode, EstimationRange } from '../store/settings';

/** Größe des SVG-Koordinatensystems (F-08, Abschnitt „Umfang"). */
export const VIEWBOX = { width: 1000, height: 700 } as const;

/** Rand der Plotfläche innerhalb von VIEWBOX (F-08, Abschnitt „Umfang"). */
export const PLOT = { left: 80, right: 960, top: 40, bottom: 620 } as const;

/**
 * Obergrenze des dargestellten Wertebereichs: mindestens 22 (FR-26, ein Wert über der
 * Schätzreihe bis 21), sonst eins über dem größten in der Karte vorkommenden impact- oder
 * effort-Wert.
 *
 * F-26 · features/F-26-schaetzmodus.md, Abschnitt „Umfang": „domainMaxOf verwendet im Modus
 * free das eingestellte estimationRange.max statt der festen 21 als Untergrenze (FR-26)" — die
 * zusätzlichen Parameter `mode`/`range` sind additiv (Default DEFAULT_ESTIMATION_MODE/
 * DEFAULT_ESTIMATION_RANGE aus src/lib/store/settings.ts), damit jeder bestehende Aufruf mit
 * nur `map` unverändert das bisherige F-08/F-25-Verhalten (Untergrenze 21) liefert. Ihre
 * Auswertung im Modus 'free' ist Aufgabe des Feature-Agenten (Test-Agenten-Regel „keine
 * Logik" — Rumpf bleibt unverändert bei der F-08/F-25-Fassung).
 */
export function domainMaxOf(
	map: FeatureMap,
	mode: EstimationMode = DEFAULT_ESTIMATION_MODE,
	range: EstimationRange = DEFAULT_ESTIMATION_RANGE
): number {
	let largest = mode === 'free' ? range.max : 21;
	for (const feature of map.features) {
		largest = Math.max(largest, feature.impact, feature.effort);
	}
	return largest + 1;
}

/**
 * Rechnet einen Aufwandswert in eine x-Koordinate der Plotfläche um (FR-20), bezogen auf das
 * sichtbare Fenster [windowMin, windowMax] statt eines festen [0, domainMax] (F-25 ·
 * features/F-25-datenzoom.md, Abschnitt „Umfang": „scales.ts erhält ein Fenster statt eines
 * festen domainMax"). windowMin=0, windowMax=domainMax ergibt denselben Randfall wie die
 * bisherige, von F-25 abgelöste Zweiparameter-Signatur aus F-08.
 */
export function xOf(effort: number, windowMin: number, windowMax: number): number {
	return (
		PLOT.left + ((effort - windowMin) / (windowMax - windowMin)) * (PLOT.right - PLOT.left)
	);
}

/**
 * Rechnet einen Nutzenwert in eine y-Koordinate der Plotfläche um (FR-20, FR-21: oben = hoch),
 * bezogen auf das sichtbare Fenster [windowMin, windowMax] (F-25, Abschnitt „Umfang", siehe
 * xOf()).
 */
export function yOf(impact: number, windowMin: number, windowMax: number): number {
	return (
		PLOT.bottom - ((impact - windowMin) / (windowMax - windowMin)) * (PLOT.bottom - PLOT.top)
	);
}

/**
 * Rechnet eine x-Koordinate der Plotfläche zurück in einen Aufwandswert innerhalb des
 * sichtbaren Fensters [windowMin, windowMax] — die algebraische Umkehrung von xOf(), gebraucht
 * um eine Bildschirmposition (Mausrad-Zeiger, Zeigefinger) in den Wertebereich umzurechnen, in
 * dem viewport.ts rechnet (F-25 · features/F-25-datenzoom.md, Abschnitt „Verhalten": „Zoom auf
 * den Zeiger zentriert").
 */
export function effortAtX(x: number, windowMin: number, windowMax: number): number {
	return windowMin + ((x - PLOT.left) / (PLOT.right - PLOT.left)) * (windowMax - windowMin);
}

/** Umkehrung von yOf() — siehe effortAtX(). */
export function impactAtY(y: number, windowMin: number, windowMax: number): number {
	return windowMin + ((PLOT.bottom - y) / (PLOT.bottom - PLOT.top)) * (windowMax - windowMin);
}

/**
 * Prüft, ob ein Aufwands- oder Nutzenwert innerhalb des sichtbaren Fensters
 * [windowMin, windowMax] liegt (Bug A · Zoom-Clipping,
 * https://github.com/Inso666/slobendency/issues/3, Abschnitt „Ursache"): xOf()/yOf() rechnen
 * Werte linear und ungeklemmt in Bildschirmkoordinaten um, unabhängig davon, ob der Wert
 * innerhalb des aktuell sichtbaren Fensters liegt — bislang fehlt an jeder Aufrufstelle
 * (FeatureNodes.svelte, Edges.svelte) eine Sichtbarkeitsprüfung, die verhindert, dass ein
 * Feature außerhalb des Fensters trotzdem über den Rand der Plotfläche hinausgeschoben
 * dargestellt wird. Die Intervallgrenzen selbst zählen als sichtbar (Bug-Report, Grenzfall
 * „Feature genau auf der Fensterkante bleibt sichtbar").
 */
export function isValueVisible(value: number, windowMin: number, windowMax: number): boolean {
	return value >= windowMin && value <= windowMax;
}

/**
 * Prüft, ob eine bereits berechnete Plotflächen-Position — insbesondere ein unversetzter
 * Ankerpunkt aus src/lib/layout/jitter.ts (Placement.anchorX/anchorY) — innerhalb der sichtbaren
 * Plotfläche liegt (Bug A · Zoom-Clipping, https://github.com/Inso666/slobendency/issues/3).
 *
 * Baut auf isValueVisible() auf, prüft aber gegen die Plotflächenränder (PLOT) statt gegen das
 * Fenster [windowMin, windowMax] selbst: xOf()/yOf() bilden das Fenster linear und injektiv auf
 * [PLOT.left, PLOT.right] beziehungsweise [PLOT.top, PLOT.bottom] ab, ein Wert liegt also genau
 * dann im Fenster, wenn seine daraus berechnete Position innerhalb dieser Ränder liegt (Beweis:
 * xOf/yOf sind streng monoton und bilden die Fenstergrenzen exakt auf die Plotflächenränder ab).
 * FeatureNodes.svelte und Edges.svelte kennen dadurch weder effortMin/effortMax/impactMin/
 * impactMax noch die ursprünglichen impact-/effort-Werte erneut — beide verwenden stattdessen
 * denselben, ohnehin bereits vorhandenen Ankerpunkt aus jitter.ts, wodurch die Fachregel „ist ein
 * Feature sichtbar" nur einmal steht (features/README.md, Leitplanke 3), nicht je Komponente
 * erneut aus den Rohwerten hergeleitet.
 */
export function isPositionVisible(x: number, y: number): boolean {
	return isValueVisible(x, PLOT.left, PLOT.right) && isValueVisible(y, PLOT.top, PLOT.bottom);
}

/**
 * Liefert „schöne" Teilstrichwerte innerhalb des sichtbaren Fensters [windowMin, windowMax]
 * (F-25, Abschnitt „Umfang"). Der bisherige Fibonacci-Pfad aus F-08 (FIBONACCI-Werte ≤
 * windowMax, ergänzt um windowMax - 1 oberhalb von 22) bleibt für das volle Fenster
 * (windowMin = 0, windowMax = domainMax) als eigener Pfad erhalten (F-25, Abschnitt „Umfang":
 * „wird nur aufgerufen, wenn visibleRange = domainMax … in jedem anderen Fall … liefert ticksOf
 * runde, gleichmäßig verteilte Werte im übergebenen Fenster"); den zweiten Teil der Bedingung
 * (Schätzmodus Fibonacci) entscheidet erst F-26 (F-25, Abschnitt „Nicht Teil dieses Features").
 *
 * F-26 · features/F-26-schaetzmodus.md, Abschnitt „Umfang": „ticksOf bei visibleRange =
 * domainMax erzeugt im Modus free dieselben runden, gleichmäßig verteilten Teilstriche wie
 * beim Hineinzoomen aus F-25, statt der Fibonacci-Reihe" — die zusätzlichen Parameter
 * `mode`/`range` sind additiv (Default DEFAULT_ESTIMATION_MODE/DEFAULT_ESTIMATION_RANGE aus
 * src/lib/store/settings.ts), damit jeder bestehende Aufruf mit nur (windowMin, windowMax)
 * unverändert das bisherige F-08/F-25-Verhalten liefert. Ob beim vollen Fenster
 * (windowMin = 0) trotzdem der Fibonacci-Pfad läuft oder — im Modus 'free' — der Pfad für
 * runde, gleichmäßig verteilte Werte, ist Aufgabe des Feature-Agenten (Test-Agenten-Regel
 * „keine Logik" — Rumpf bleibt unverändert bei der F-08/F-25-Fassung).
 */
export function ticksOf(
	windowMin: number,
	windowMax: number,
	mode: EstimationMode = DEFAULT_ESTIMATION_MODE,
	range: EstimationRange = DEFAULT_ESTIMATION_RANGE
): number[] {
	// Volles Fenster (windowMin = 0, windowMax = domainMax, siehe resetViewport() aus
	// src/lib/store/viewport.ts: bei visibleRange = domainMax ist centerEffort/centerImpact
	// zwangsläufig domainMax / 2, das Fenster also immer [0, domainMax]) im Schätzmodus Fibonacci:
	// Fibonacci-Pfad aus F-08 bleibt erhalten (F-25, Abschnitt „Umfang"). Im Modus 'free' liefert
	// dasselbe volle Fenster stattdessen dieselben runden, gleichmäßig verteilten Teilstriche wie
	// der gezoomte Pfad unten (F-26, Abschnitt „Umfang").
	if (windowMin === 0 && mode === 'fibonacci') {
		const domainMax = windowMax;
		const ticks = FIBONACCI.filter((value) => value <= domainMax) as number[];
		if (domainMax > 22) {
			ticks.push(domainMax - 1);
		}
		return ticks;
	}

	// Gezoomtes Fenster: runde, gleichmäßig verteilte Werte statt Fibonacci (F-25, Abschnitt
	// „Umfang"), nach demselben "nice numbers"-Verfahren wie d3-scale (PRD 7.1: "ggf. d3-scale
	// … nur Skalen"), hier ohne die Abhängigkeit selbst einzubinden — die Formel ist frei von
	// Fachregeln, reine Rundungsmathematik.
	const targetCount = 5;
	const span = windowMax - windowMin;
	const rawStep = span / targetCount;
	const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
	const normalized = rawStep / magnitude;
	let step: number;
	if (normalized >= Math.sqrt(50)) {
		step = 10 * magnitude;
	} else if (normalized >= Math.sqrt(10)) {
		step = 5 * magnitude;
	} else if (normalized >= Math.sqrt(2)) {
		step = 2 * magnitude;
	} else {
		step = magnitude;
	}

	const ticks: number[] = [];
	const first = Math.ceil(windowMin / step) * step;
	for (let value = first; value <= windowMax + step * 1e-9; value += step) {
		// Rundet Fließkomma-Rauschen aus mehrfachen Additionen/Divisionen weg (z. B. 8.999999999999998
		// statt 9), ohne die geforderte Genauigkeit ("gleichmäßig verteilt") zu beeinträchtigen.
		ticks.push(Number((Math.round(value / step) * step).toFixed(10)));
	}
	return ticks;
}

/**
 * Liefert die vier Reviere als Rechtecke innerhalb der Plotfläche, geteilt an domainMax / 2
 * auf beiden Achsen (features/README.md, Abschnitt „Zwei Präzisierungen…", Revier-Grenze). Die
 * Reviergrenze selbst ist ein Datenwert (domainMax / 2) und bleibt unabhängig vom Zoom-Ausschnitt
 * (F-25, Abschnitt „Nicht Teil dieses Features" nennt regionRects() nicht); effortMin/effortMax
 * und impactMin/impactMax projizieren diese Grenze wie jeden anderen Wert optional auf das
 * aktuell sichtbare Fenster je Achse (F-25, Abschnitt „Umfang": Regions.svelte „liest künftig das
 * sichtbare Fenster aus viewport") — getrennt, weil `centerEffort`/`centerImpact` unabhängig
 * voneinander verschoben sein können (src/lib/store/viewport.ts), ohne die bestehende, von F-25
 * unveränderte Einparameter-Aufrufform zu brechen: ohne diese Argumente verhält sich die
 * Funktion exakt wie vor F-25 (volles Fenster [0, domainMax] auf beiden Achsen).
 */
export function regionRects(
	domainMax: number,
	effortMin: number = 0,
	effortMax: number = domainMax,
	impactMin: number = 0,
	impactMax: number = domainMax
): Array<{ quadrant: Quadrant; x: number; y: number; width: number; height: number }> {
	const boundaryX = xOf(domainMax / 2, effortMin, effortMax);
	const boundaryY = yOf(domainMax / 2, impactMin, impactMax);

	return [
		{
			quadrant: 'quickWins',
			x: PLOT.left,
			y: PLOT.top,
			width: boundaryX - PLOT.left,
			height: boundaryY - PLOT.top
		},
		{
			quadrant: 'grosseVorhaben',
			x: boundaryX,
			y: PLOT.top,
			width: PLOT.right - boundaryX,
			height: boundaryY - PLOT.top
		},
		{
			quadrant: 'nebenbei',
			x: PLOT.left,
			y: boundaryY,
			width: boundaryX - PLOT.left,
			height: PLOT.bottom - boundaryY
		},
		{
			quadrant: 'vermeiden',
			x: boundaryX,
			y: boundaryY,
			width: PLOT.right - boundaryX,
			height: PLOT.bottom - boundaryY
		}
	];
}
