// F-22 · Responsives Verhalten und Touch — Unit-Tests für src/lib/interaction/hitArea.ts.
// Quelle: features/F-22-responsiv.md, Abschnitt „Trefferflächen", erster Absatz: „Jede
// Feature-Signatur bekommt einen unsichtbaren Kreis von mindestens 44 px Bildschirmgröße; da
// die Karte skaliert, wird dieser Radius aus dem aktuellen Maßstab gerechnet." PRD UI-16.
//
// Geprüft wird ausschließlich die aus dem Wortlaut ableitbare Eigenschaft — der auf dem
// Bildschirm sichtbare Durchmesser (Radius × 2 × Maßstab, siehe Modulkommentar in hitArea.ts zur
// Umrechnungsbasis) unterschreitet nie 44 px —, nicht eine bestimmte Formel: mehrere
// Umsetzungen (z. B. mit einer zusätzlichen Untergrenze für sehr hohen Maßstab) erfüllen die
// Regel gleichermaßen (CLAUDE.md, Regeln für den Test-Agenten: „Tests prüfen beobachtbares
// Verhalten, nicht die innere Umsetzung").

import { describe, expect, it } from 'vitest';
import { hitAreaRadiusForScale, MIN_HIT_AREA_SCREEN_DIAMETER_PX } from './hitArea';

/** Bildschirmdurchmesser eines Trefferkreises mit Radius `radius` (Karten-Inhaltseinheiten) bei
 * gegebenem Maßstab, unter derselben Umrechnungsbasis wie hitArea.ts (eine Inhaltseinheit ≈ ein
 * Bildschirmpixel bei Maßstab 1). */
function screenDiameter(radius: number, scale: number): number {
	return radius * 2 * scale;
}

describe('hitAreaRadiusForScale', () => {
	it('exportiert den Mindestdurchmesser 44 (UI-16)', () => {
		expect(MIN_HIT_AREA_SCREEN_DIAMETER_PX).toBe(44);
	});

	// F-22, Abschnitt „Trefferflächen": bei Grundmaßstab (1) mindestens 44 px Bildschirmgröße.
	it('liefert bei Maßstab 1 einen Radius, dessen Bildschirmdurchmesser mindestens 44 px erreicht', () => {
		const radius = hitAreaRadiusForScale(1);
		expect(screenDiameter(radius, 1)).toBeGreaterThanOrEqual(MIN_HIT_AREA_SCREEN_DIAMETER_PX);
	});

	// F-12, Abschnitt „Verhalten": kleinster zulässiger Maßstab 0,5 — bei kleinerem Maßstab
	// schrumpft ein gleichbleibender Inhaltsradius auf dem Bildschirm, der Trefferradius muss
	// deshalb (in Inhaltseinheiten) entsprechend wachsen, um die 44 px zu halten.
	it('hält den Mindestdurchmesser auch beim kleinsten zulässigen Maßstab 0,5', () => {
		const radius = hitAreaRadiusForScale(0.5);
		expect(screenDiameter(radius, 0.5)).toBeGreaterThanOrEqual(MIN_HIT_AREA_SCREEN_DIAMETER_PX);
	});

	// F-12, Abschnitt „Verhalten": größter zulässiger Maßstab 4.
	it('hält den Mindestdurchmesser auch beim größten zulässigen Maßstab 4', () => {
		const radius = hitAreaRadiusForScale(4);
		expect(screenDiameter(radius, 4)).toBeGreaterThanOrEqual(MIN_HIT_AREA_SCREEN_DIAMETER_PX);
	});

	// Zwischenwert, um sicherzustellen, dass nicht nur die drei Randwerte behandelt werden.
	it('hält den Mindestdurchmesser bei einem Zwischenmaßstab von 2', () => {
		const radius = hitAreaRadiusForScale(2);
		expect(screenDiameter(radius, 2)).toBeGreaterThanOrEqual(MIN_HIT_AREA_SCREEN_DIAMETER_PX);
	});

	// Der Radius selbst ist niemals negativ oder null — sonst gäbe es gar keine Trefferfläche.
	it('liefert einen positiven Radius über den gesamten zulässigen Maßstabsbereich', () => {
		for (const scale of [0.5, 0.75, 1, 1.5, 2, 3, 4]) {
			expect(hitAreaRadiusForScale(scale)).toBeGreaterThan(0);
		}
	});
});
