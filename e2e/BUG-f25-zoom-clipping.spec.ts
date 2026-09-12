// Bug A · Zoom-Clipping — E2E-Tests.
// Bug-Report: https://github.com/Inso666/slobendency/issues/3 (Abschnitte „Bug-Report",
// „Ursache", „Erwartetes Verhalten"). Zusätzliche Quellen: features/F-25-datenzoom.md
// (Abschnitte „Umfang", „Verhalten" — effortMin/effortMax/impactMin/impactMax als sichtbares
// Fenster), PRD.md (FR-25 geändert, FR-65 unverändert — der Bildexport ist NICHT Teil dieses
// Bugfixes, siehe unten), features/F-08-kartengeruest.md (PLOT/VIEWBOX-Geometrie, domainMax =
// max(21, größter Wert) + 1), src/lib/model/validation.ts (INT-07: impact/effort sind
// nicht-negative Ganzzahlen), e2e/F-25-datenzoom.spec.ts (Vorbild für Mausrad-/Reset-Helfer,
// wiederverwendete Zoomformel), e2e/F-24-hervorhebung-sichtbarkeit.spec.ts (Vorbild für die
// toBeHidden()/toBeVisible()-Prüfung eines vollständig aus der Darstellung entfernten Elements —
// dieselbe Art Sichtbarkeitsprüfung wird hier für einen zweiten Grund verwendet: nicht
// Hervorhebung, sondern Zoom-Fenster).
//
// Bug-Report, Abschnitt „Erwartetes Verhalten": „Ein Feature, dessen Nutzen- oder Aufwandswert
// außerhalb des aktuell sichtbaren Fensters … liegt, wird nicht innerhalb der Plotfläche
// dargestellt — weder seine Signatur noch, falls beide Endpunkte betroffen, die zugehörige
// Kante." Keine neuen data-testid nötig: Alles über die bereits vergebenen Kennzeichen aus
// F-09/F-10 ansprechbar (feature-node-<id>, feature-hitarea-<id>, feature-label-<id>,
// edge-<from>-<to>-<type>) sowie über Rolle/Text (Knöpfe „Ansicht"/„Ganze Karte zeigen").
//
// Designentscheidungen des Test-Agenten (in den Quellen nicht mit einer Formel/einem Wert
// festgelegt):
// 1. Sichtbarkeitsprüfung über Playwrights toBeHidden()/toBeVisible() statt über die reine
//    Bildschirmposition: dieselbe Prüfmethode wie e2e/F-24-hervorhebung-sichtbarkeit.spec.ts für
//    denselben Begriff „vollständig aus der Darstellung entfernt" (features/README.md,
//    Leitplanke 3 verlangt ohnehin denselben Mechanismus für „ausblenden" wie F-24, nicht einen
//    zweiten) — nicht die einzige laut Auftrag zulässige Beobachtungsart (Position ginge auch),
//    aber die in diesem Repository bereits etablierte.
// 2. Zoomziel auf den Kartenmittelpunkt (Feature „center", (11, 11) bei domainMax = 22): Zeiger
//    und Zentrum sind hier identisch, wodurch centerEffort/centerImpact laut der verbindlichen
//    Formel (F-25, Abschnitt „Verhalten"; PRD 7.3) unverändert bleiben (Differenz zum Zeiger ist
//    0) — das ergibt ein symmetrisches, leicht vorhersagbares Fenster [8,25 … 13,75] auf beiden
//    Achsen, mit reichlich Abstand (≥ 6,25 Werteinheiten) zu den außerhalb platzierten Features,
//    robust gegenüber der unvermeidlichen Rundungsungenauigkeit einer über echte
//    Maus-/Bildschirmereignisse simulierten Zoombewegung.
// 3. Grenzfall „Feature genau auf der Fensterkante bleibt sichtbar" bewusst NICHT an einem
//    gezoomten (rechnerisch nur gebrochenzahligen, z. B. 8,25) Fenster geprüft: INT-07 verlangt
//    ganzzahlige impact-/effort-Werte, ein Feature könnte eine solche Grenze also nie exakt
//    treffen, und ein über Bildschirmpixel/CTM-Rundung an genau dieser Grenze ausgerichteter
//    Zeiger wäre unvermeidlich mit genau der Fließkomma-Unschärfe behaftet, die ein exakter
//    Grenzfalltest ausschließen soll. Stattdessen wird die Vollansicht genutzt: ihr Fenster ist
//    laut resetViewport() (src/lib/store/viewport.ts) exakt [0, domainMax] — reine
//    Ganzzahlarithmetik ohne jede Bildschirm-/Rundungsabhängigkeit —, und effort = 0 (Feature
//    „zero") liegt dort exakt auf der Untergrenze. Damit dieser Nachweis nicht ohne jede
//    Umsetzung trivial erfüllt wäre (in der Vollansicht ist ohnehin nichts ausgeblendet), steht
//    er im selben Testlauf wie die Rückkehr aus einem Zoomzustand, in dem „far" nachweislich
//    ausgeblendet war (siehe Testkommentar unten).
// 4. 60 Radschritte je Zoom-Sequenz, wie bereits in e2e/F-25-datenzoom.spec.ts verwendet: sicher
//    jenseits der wenigen Schritte, die zum Erreichen von visibleRange = domainMax / 4 nötig
//    sind (siehe dortiger Test „lässt sich per Mausrad nicht über den Faktor 4 hinaus
//    hineinzoomen").

import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'featuremap.map';

type SeedFeature = { id: string; label?: string; impact: number; effort: number };
type SeedRelation = {
	from: string;
	to: string;
	type: 'requires' | 'relates' | 'excludes';
	label?: string;
};

/** Belegt den LocalStorage der Seite mit einer Karte, bevor die Anwendung sie lädt (F-04). */
async function seedMap(page: Page, features: SeedFeature[], relations: SeedRelation[] = []) {
	await page.addInitScript(
		({ key, value }) => {
			window.localStorage.setItem(key, value);
		},
		{
			key: STORAGE_KEY,
			value: JSON.stringify({ schemaVersion: 1, features, relations })
		}
	);
}

type Box = { x: number; y: number; width: number; height: number };

function centerOf(box: Box): { x: number; y: number } {
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function centerOfTestId(page: Page, testId: string): Promise<{ x: number; y: number }> {
	const box = await page.getByTestId(testId).boundingBox();
	expect(box, `${testId} sollte eine sichtbare Bounding Box haben`).not.toBeNull();
	return centerOf(box!);
}

/** Bewegt die Maus an `point` und zoomt dort per Mausrad hinein (dieselbe Konvention wie
 * e2e/F-25-datenzoom.spec.ts: deltaY < 0 verkleinert visibleRange). */
async function wheelInAt(page: Page, point: { x: number; y: number }, times: number): Promise<void> {
	await page.mouse.move(point.x, point.y);
	for (let i = 0; i < times; i++) {
		await page.mouse.wheel(0, -240);
	}
}

/** Öffnet das Menü „Ansicht" und klickt „Ganze Karte zeigen" (F-25, Abschnitt „Verhalten"). */
async function resetViewFromToolbar(page: Page): Promise<void> {
	await page.getByRole('button', { name: 'Ansicht' }).click();
	await page.getByRole('button', { name: 'Ganze Karte zeigen' }).click();
}

// „center" liegt auf dem Kartenmittelpunkt (11, 11 bei domainMax = 22) — Zoomen darauf hält das
// Fenster exakt symmetrisch bei [8,25 … 13,75] auf beiden Achsen (Designentscheidung 2).
// „xOut"/„yOut" liegen je auf genau einer Achse außerhalb dieses Fensters, auf der jeweils
// anderen Achse innerhalb (mit Sicherheitsabstand zur Fenstergrenze, nicht mit dem gleichen Wert
// wie „center" — sonst verliefe eine Kante zwischen zwei Features exakt waagerecht/senkrecht und
// hätte eine entartete, null Pixel hohe/breite Bounding Box, siehe Kantentest unten) — testet die
// Achsen einzeln. „inside" bleibt auf beiden Achsen innerhalb (Gegenprobe: nicht einfach jedes
// Feature verschwindet).
const ACHSEN_FEATURES: SeedFeature[] = [
	{ id: 'center', label: 'Center', impact: 11, effort: 11 },
	{ id: 'xOut', label: 'XOut', impact: 12, effort: 20 },
	{ id: 'yOut', label: 'YOut', impact: 20, effort: 13 },
	{ id: 'inside', label: 'Inside', impact: 9, effort: 12 }
];

// „far" liegt bei (20, 20) — nach dem Zoom auf „center" auf beiden Achsen weit außerhalb von
// [8,25 … 13,75]. „zero" (effort = 0, impact = 0) liegt exakt auf der Untergrenze der
// Vollansicht [0, domainMax] (Designentscheidung 3, Grenzfall).
const RESET_FEATURES: SeedFeature[] = [
	{ id: 'center', label: 'Center', impact: 11, effort: 11 },
	{ id: 'far', label: 'Far', impact: 20, effort: 20 },
	{ id: 'zero', label: 'Zero', impact: 0, effort: 0 }
];

test.describe('Bug A · Zoom-Clipping (Issue #3)', () => {
	// Bug-Report-Fälle: „Feature komplett außerhalb des Fensters (X- und Y-Richtung)" sowie
	// „Feature das während des Zoomens das Fenster verlässt" — vorher (Vollansicht) sichtbar,
	// nachher (hineingezoomt) auf beiden Achsen außerhalb und deshalb ausgeblendet.
	test('blendet ein auf beiden Achsen weit außerhalb liegendes Feature beim Hineinzoomen aus', async ({
		page
	}) => {
		await seedMap(page, RESET_FEATURES);
		await page.goto('/');

		// Vor dem Zoom (Vollansicht) ist „far" sichtbar.
		await expect(page.getByTestId('feature-node-far')).toBeVisible();

		const centerPos = await centerOfTestId(page, 'feature-node-center');
		await wheelInAt(page, centerPos, 60);

		// „far" (20, 20) verlässt das auf [8,25 … 13,75] geschrumpfte Fenster auf beiden Achsen
		// und muss vollständig aus der Darstellung verschwinden — Signatur, Beschriftung UND
		// Trefferfläche (dieselbe Art „vollständig ausgeblendet" wie F-24, Leitplanke 3).
		await expect(page.getByTestId('feature-node-far')).toBeHidden();
		await expect(page.getByTestId('feature-hitarea-far')).toBeHidden();
		await expect(page.getByTestId('feature-label-far')).toBeHidden();

		// Gegenprobe: „center" bleibt im eigenen Zoomzentrum sichtbar.
		await expect(page.getByTestId('feature-node-center')).toBeVisible();
	});

	// Bug-Report-Fall: „Feature komplett außerhalb des Fensters (X- … Richtung)" und „(… Y-
	// Richtung)" einzeln — ein Feature darf schon verschwinden, wenn NUR eine der beiden Achsen
	// außerhalb liegt, nicht erst wenn beide es sind.
	test('blendet ein Feature bereits aus, wenn nur eine Achse außerhalb des Fensters liegt', async ({
		page
	}) => {
		await seedMap(page, ACHSEN_FEATURES);
		await page.goto('/');

		const centerPos = await centerOfTestId(page, 'feature-node-center');
		await wheelInAt(page, centerPos, 60);

		// effort = 20 liegt außerhalb des Fensters [8,25 … 13,75], impact = 12 liegt innerhalb —
		// trotzdem muss das Feature vollständig verschwinden (eine Achse genügt).
		await expect(page.getByTestId('feature-node-xOut')).toBeHidden();
		// impact = 20 liegt außerhalb, effort = 13 liegt innerhalb — ebenso.
		await expect(page.getByTestId('feature-node-yOut')).toBeHidden();
		// Gegenprobe: ein Feature, das auf BEIDEN Achsen innerhalb liegt, bleibt sichtbar — sonst
		// wäre „alles ausblenden" auch ohne echte Fensterprüfung trivial erfüllt.
		await expect(page.getByTestId('feature-node-inside')).toBeVisible();
		await expect(page.getByTestId('feature-node-center')).toBeVisible();
	});

	// Bug-Report-Fall: „Kante mit einem oder beiden Endpunkten außerhalb."
	test('blendet eine Kante aus, sobald einer ihrer beiden Endpunkte außerhalb des Fensters liegt', async ({
		page
	}) => {
		await seedMap(page, ACHSEN_FEATURES, [
			// Ein Endpunkt außerhalb (center innerhalb, xOut außerhalb).
			{ from: 'center', to: 'xOut', type: 'requires' },
			// Beide Endpunkte außerhalb (xOut und yOut).
			{ from: 'xOut', to: 'yOut', type: 'relates' }
		]);
		await page.goto('/');

		// Vor dem Zoom sind beide Kanten sichtbar (Vollansicht zeigt alle Features).
		await expect(page.getByTestId('edge-center-xOut-requires')).toBeVisible();
		await expect(page.getByTestId('edge-xOut-yOut-relates')).toBeVisible();

		const centerPos = await centerOfTestId(page, 'feature-node-center');
		await wheelInAt(page, centerPos, 60);

		await expect(page.getByTestId('edge-center-xOut-requires')).toBeHidden();
		await expect(page.getByTestId('edge-xOut-yOut-relates')).toBeHidden();
	});

	// Bug-Report-Fall: „Feature das nach Herauszoomen/Zurücksetzen wieder erscheint" sowie der
	// Grenzfall „Feature genau auf der Fensterkante bleibt sichtbar" (Designentscheidung 3) — im
	// selben Ablauf, weil der Grenzfall in der Vollansicht sonst ohne jede Umsetzung trivial
	// erfüllt wäre.
	test('lässt ein ausgeblendetes Feature nach „Ganze Karte zeigen" wieder erscheinen, mit einem Feature exakt auf der Fensterkante', async ({
		page
	}) => {
		await seedMap(page, RESET_FEATURES);
		await page.goto('/');

		// „zero" (effort = impact = 0) liegt schon in der Vollansicht exakt auf der Untergrenze
		// des Fensters [0, domainMax] und muss sichtbar sein — hier noch ohne Aussagekraft (siehe
		// Designentscheidung 3), aber Ausgangspunkt für den Vergleich nach dem Reset unten.
		await expect(page.getByTestId('feature-node-zero')).toBeVisible();

		const centerPos = await centerOfTestId(page, 'feature-node-center');
		await wheelInAt(page, centerPos, 60);

		// Nachweis, dass „far" durch das Hineinzoomen tatsächlich ausgeblendet wurde — sonst wäre
		// das anschließende „wieder sichtbar" nach dem Reset trivial erfüllt.
		await expect(page.getByTestId('feature-node-far')).toBeHidden();

		await resetViewFromToolbar(page);

		await expect(page.getByTestId('feature-node-far')).toBeVisible();
		await expect(page.getByTestId('feature-hitarea-far')).toBeVisible();
		// Grenzfall (Designentscheidung 3): nach dem Reset ist das Fenster wieder exakt
		// [0, domainMax] (reine Ganzzahlarithmetik, resetViewport()) — „zero" (effort = impact =
		// 0) liegt exakt auf beiden Untergrenzen und bleibt sichtbar.
		await expect(page.getByTestId('feature-node-zero')).toBeVisible();
	});
});

// Nicht Teil dieses Bugfixes (Bug-Report, Abschnitt „Nicht Teil dieses Bugfixes"; PRD FR-65):
// der Bildexport zeigt unabhängig vom Zoom-Ausschnitt immer die vollständige Karte, unverändert
// gegenüber F-20/F-21 (src/lib/export/svg.ts) — dafür gibt es hier bewusst keinen weiteren Test.
