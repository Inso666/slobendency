// F-25 · Datenzoom — Unit-Tests für src/lib/store/viewport.ts.
// Quellen: features/F-25-datenzoom.md (Abschnitte „Umfang", „Verhalten", „Fachregeln",
// „Akzeptanzkriterien", „Tests"), PRD.md (FR-25 geändert, FR-26, 7.3 „Datenzoom (FR-25)").
//
// Eigene Datei statt einer Überarbeitung von src/lib/store/viewport.test.ts: Jene Datei prüft
// die von F-25 abgelöste F-12-Struktur ({ x, y, scale }, MIN_SCALE/MAX_SCALE, panBy) und wird
// durch das Ersetzen von viewport.ts zwangsläufig rot (Import-Fehler auf nicht mehr
// existierende Exporte) — nach ausdrücklicher Weisung des Orchestrators wird sie vom
// Test-Agenten weder geändert noch gelöscht, das entscheidet der Orchestrator. Diese Datei
// deckt ausschließlich die neue, von F-25 vorgegebene Struktur ab.

import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { centerOn, resetViewport, viewport, zoomAt } from './viewport';

// Bewusst fern vom Default-domainMax (22) der leeren Karte aus F-08 gewählt, um zu zeigen, dass
// die Formel für ein beliebiges domainMax gilt (F-25 nennt keinen bestimmten Wert).
const DOMAIN_MAX = 100;

describe('viewport store (F-25 · Datenzoom)', () => {
	beforeEach(() => {
		// Neutraler Ausgangszustand; jeder Test setzt seine eigene Vorbedingung explizit über
		// viewport.set(), bevor er die zu prüfende Funktion aufruft.
		viewport.set({ centerEffort: 0, centerImpact: 0, visibleRange: 1 });
	});

	describe('resetViewport(domainMax) — Vollansicht (F-25, Abschnitt „Umfang", Kommentar über resetViewport())', () => {
		// F-25-AK: „*Ganze Karte zeigen* stellt visibleRange = domainMax und die zentrierte
		// Ansicht wieder her."
		it('setzt centerEffort/centerImpact auf domainMax / 2 und visibleRange auf domainMax', () => {
			viewport.set({ centerEffort: 5, centerImpact: -20, visibleRange: 12 });

			resetViewport(DOMAIN_MAX);

			expect(get(viewport)).toEqual({ centerEffort: 50, centerImpact: 50, visibleRange: 100 });
		});

		it('stellt die Vollansicht unabhängig vom vorherigen Zustand wieder her, auch nach starkem Zoom', () => {
			viewport.set({ centerEffort: 99, centerImpact: 1, visibleRange: 25 });

			resetViewport(DOMAIN_MAX);

			expect(get(viewport)).toEqual({ centerEffort: 50, centerImpact: 50, visibleRange: 100 });
		});

		it('rechnet domainMax / 2 auch für ein domainMax der leeren Karte (22) korrekt', () => {
			resetViewport(22);

			expect(get(viewport)).toEqual({ centerEffort: 11, centerImpact: 11, visibleRange: 22 });
		});
	});

	describe('zoomAt() — Zoom um einen Wertepunkt (verbindliche Formel, F-25 Abschnitt „Verhalten"/PRD 7.3)', () => {
		// AK-18 / F-25-AK: „Mausrad über der Karte verkleinert visibleRange; der Wertepunkt
		// unter dem Zeiger bleibt unter dem Zeiger (Datenkoordinate, nicht nur Bildposition)."
		// Geprüft wird die relative Fensterposition (Wert − center) / visibleRange, die exakt
		// dann unverändert bleibt, wenn der Wertepunkt unter dem Zeiger visuell fixiert bleibt
		// (dieselbe algebraische Fixpunkteigenschaft wie beim F-12-Vorgänger, hier auf den
		// Wertebereich statt auf Bildschirm-Pixel bezogen).
		it('hält die relative Fensterposition des Zeiger-Wertepunkts, wenn hineingezoomt wird', () => {
			viewport.set({ centerEffort: 50, centerImpact: 50, visibleRange: 100 });
			const pointerEffort = 70;
			const pointerImpact = 40;
			const before = get(viewport);
			const relBefore = {
				effort: (pointerEffort - before.centerEffort) / before.visibleRange,
				impact: (pointerImpact - before.centerImpact) / before.visibleRange
			};

			zoomAt(0.5, pointerEffort, pointerImpact, DOMAIN_MAX);

			const after = get(viewport);
			expect(after.visibleRange).toBeCloseTo(50, 10);
			expect((pointerEffort - after.centerEffort) / after.visibleRange).toBeCloseTo(relBefore.effort, 6);
			expect((pointerImpact - after.centerImpact) / after.visibleRange).toBeCloseTo(relBefore.impact, 6);
		});

		it('hält die relative Fensterposition des Zeiger-Wertepunkts auch beim Herauszoomen (innerhalb der Grenzen)', () => {
			viewport.set({ centerEffort: 40, centerImpact: 60, visibleRange: 40 });
			const pointerEffort = 45;
			const pointerImpact = 55;
			const before = get(viewport);
			const relBefore = {
				effort: (pointerEffort - before.centerEffort) / before.visibleRange,
				impact: (pointerImpact - before.centerImpact) / before.visibleRange
			};

			zoomAt(1.5, pointerEffort, pointerImpact, DOMAIN_MAX);

			const after = get(viewport);
			expect(after.visibleRange).toBeCloseTo(60, 10);
			expect((pointerEffort - after.centerEffort) / after.visibleRange).toBeCloseTo(relBefore.effort, 6);
			expect((pointerImpact - after.centerImpact) / after.visibleRange).toBeCloseTo(relBefore.impact, 6);
		});

		// F-25-AK: „visibleRange lässt sich nicht unter domainMax / 4 … treiben." Formel:
		// „visibleRange ∈ [domainMax / 4, domainMax] // 4x maximal hineingezoomt".
		it('begrenzt visibleRange nach unten auf domainMax / 4', () => {
			viewport.set({ centerEffort: 50, centerImpact: 50, visibleRange: 100 });

			zoomAt(0.01, 50, 50, DOMAIN_MAX);

			expect(get(viewport).visibleRange).toBeCloseTo(25, 10);
		});

		it('bleibt bei wiederholtem Hineinzoomen exakt bei domainMax / 4 stehen, statt weiter zu sinken', () => {
			viewport.set({ centerEffort: 50, centerImpact: 50, visibleRange: 25 });

			zoomAt(0.5, 50, 50, DOMAIN_MAX);

			expect(get(viewport).visibleRange).toBeCloseTo(25, 10);
		});

		// F-25-AK: „… und nicht über domainMax treiben." Formel-Kommentar: „1x = volle Ansicht,
		// kein Herauszoomen darüber hinaus."
		it('begrenzt visibleRange nach oben auf domainMax (kein Herauszoomen über die Vollansicht hinaus)', () => {
			viewport.set({ centerEffort: 50, centerImpact: 50, visibleRange: 100 });

			zoomAt(3, 50, 50, DOMAIN_MAX);

			expect(get(viewport).visibleRange).toBeCloseTo(100, 10);
		});

		it('bleibt bei wiederholtem Herauszoomen aus einer bereits verkleinerten Ansicht exakt bei domainMax stehen', () => {
			viewport.set({ centerEffort: 50, centerImpact: 50, visibleRange: 80 });

			zoomAt(5, 50, 50, DOMAIN_MAX);

			expect(get(viewport).visibleRange).toBeCloseTo(100, 10);
		});

		// Formel-Kommentar (F-25, Abschnitt „Verhalten" / PRD 7.3): „centerEffort/centerImpact
		// anschließend je Achse so klemmen, dass [center ± visibleRange/2] innerhalb
		// [0, domainMax] bleibt." Fenster [0, 10] bei visibleRange = 10 um center = 5: der
		// unverklemmte neue Mittelpunkt bliebe (Zeiger = Zentrum) bei 5, was bei
		// visibleRange = 30 ein Fenster [-10, 20] ergäbe — teilweise unterhalb von 0.
		it('klemmt centerEffort/centerImpact, wenn das unverklemmte Fenster unterhalb von 0 läge', () => {
			viewport.set({ centerEffort: 5, centerImpact: 5, visibleRange: 10 });

			zoomAt(3, 5, 5, DOMAIN_MAX);

			const after = get(viewport);
			expect(after.visibleRange).toBeCloseTo(30, 10);
			expect(after.centerEffort).toBeCloseTo(15, 10);
			expect(after.centerImpact).toBeCloseTo(15, 10);
			expect(after.centerEffort - after.visibleRange / 2).toBeGreaterThanOrEqual(-1e-6);
			expect(after.centerImpact - after.visibleRange / 2).toBeGreaterThanOrEqual(-1e-6);
		});

		// Fenster [90, 100] bei visibleRange = 10 um center = 95, ganz herausgezoomt: der
		// unverklemmte neue Mittelpunkt bliebe (Zeiger = Zentrum) bei 95, was bei
		// visibleRange = domainMax (100) nur mit center = 50 ein gültiges Fenster [0, 100]
		// ergibt — 95 muss also nach unten geklemmt werden.
		it('klemmt centerEffort/centerImpact auf domainMax / 2, wenn vollständig herausgezoomt wird', () => {
			viewport.set({ centerEffort: 95, centerImpact: 95, visibleRange: 10 });

			zoomAt(20, 95, 95, DOMAIN_MAX);

			const after = get(viewport);
			expect(after.visibleRange).toBeCloseTo(100, 10);
			expect(after.centerEffort).toBeCloseTo(50, 10);
			expect(after.centerImpact).toBeCloseTo(50, 10);
		});
	});

	describe('centerOn() — Zentrieren, hält visibleRange (F-25, Abschnitt „Umfang": „für F-14, hält visibleRange")', () => {
		it('setzt centerEffort/centerImpact auf die übergebenen Werte, ohne visibleRange zu ändern', () => {
			viewport.set({ centerEffort: 10, centerImpact: 90, visibleRange: 33 });

			centerOn(48, 12);

			expect(get(viewport)).toEqual({ centerEffort: 48, centerImpact: 12, visibleRange: 33 });
		});

		it('lässt visibleRange auch bei einem bereits maximal hineingezoomten Ausschnitt unverändert', () => {
			viewport.set({ centerEffort: 5, centerImpact: 5, visibleRange: 25 });

			centerOn(60, 61);

			expect(get(viewport)).toEqual({ centerEffort: 60, centerImpact: 61, visibleRange: 25 });
		});

		// centerOn dient laut F-25, Abschnitt „Umfang", sowohl F-14 (Zentrieren beim Klick im
		// Verzeichnis) als auch dem Verschieben (Pan) auf freier Fläche (kein gesondertes
		// panBy() mehr im Umfang) — eine einzelne Verschiebung um (dx, dy) im Wertebereich muss
		// sich daher als zwei aufeinanderfolgende centerOn()-Aufrufe nachvollziehen lassen.
		it('lässt sich für ein Verschieben (Pan) um einen Wertebetrag nutzen, ohne visibleRange zu beeinflussen', () => {
			viewport.set({ centerEffort: 20, centerImpact: 30, visibleRange: 50 });
			const before = get(viewport);

			centerOn(before.centerEffort + 4, before.centerImpact - 7);

			const after = get(viewport);
			expect(after.centerEffort).toBeCloseTo(24, 10);
			expect(after.centerImpact).toBeCloseTo(23, 10);
			expect(after.visibleRange).toBe(before.visibleRange);
		});
	});
});
