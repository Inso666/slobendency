// F-04 · Persistenz im LocalStorage — E2E-Tests.
// Quellen: features/F-04-persistenz.md (Akzeptanzkriterien, Abschnitt „Tests": „E2E: Feature
// anlegen, Seite neu laden, Feature ist da (AK-02)."), PRD.md AK-02, FR-70, FR-74.
//
// F-04 bringt keine eigene Komponente mit ("Nicht Teil dieses Features": Anzeige der
// Hinweise), und ein Formular zum Anlegen eines Features existiert erst ab F-13. Das „Feature
// anlegen" aus der Tests-Vorgabe lässt sich deshalb auf dieser Stufe nicht über Klicks
// nachbilden. Beide Tests prüfen stattdessen den tatsächlichen Speicherzugriff der laufenden
// Anwendung über den LocalStorage-Schlüssel — und zwar so, dass eine unveränderte Umgebung
// (kein Schreibzugriff, weil `initPersistence` nirgends aufgerufen wird) zuverlässig
// durchfällt: Jede Zusicherung verlangt, dass der gespeicherte Wert sich gegenüber dem
// Ausgangszustand verändert (erscheint oder wird umgeschrieben), nicht bloß, dass er
// unangetastet bleibt — sonst wäre ein Test, der nichts tut, ebenfalls "grün".

import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'featuremap.map';

async function gespeicherterWert(page: import('@playwright/test').Page): Promise<string | null> {
	return page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
}

test.describe('F-04 · Persistenz im LocalStorage', () => {
	// FR-70/FR-71 (Grundlage von AK-02): „Der komplette Datenbestand wird automatisch
	// gespeichert." Ohne vorherigen Bestand muss die Anwendung von sich aus einen gültigen,
	// leeren Bestand ablegen — das ist nur möglich, wenn initPersistence tatsächlich läuft.
	// Im Anschluss: AK-02 selbst — ein Bestand aus einer vorherigen Sitzung übersteht `F5`
	// unverändert.
	test('speichert den Bestand automatisch und übersteht ein Neuladen unverändert (AK-02)', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.getByRole('main')).toBeVisible();

		// Ohne Umsetzung bleibt der Schlüssel für immer leer — dieser Poll fällt dann auf
		// Timeout durch, nicht auf einen Tippfehler.
		await expect
			.poll(async () => gespeicherterWert(page), { timeout: 3000 })
			.not.toBeNull();

		const automatisch = JSON.parse((await gespeicherterWert(page)) as string);
		expect(automatisch).toEqual({ schemaVersion: 1, features: [], relations: [] });

		// Stand einer vorherigen Sitzung nachbilden (siehe Kommentar oben: kein Formular
		// verfügbar) und die Seite neu laden.
		const vorherigeSitzung = {
			schemaVersion: 1,
			features: [
				{ id: 'checkout', label: 'Checkout überarbeiten', impact: 8, effort: 5 },
				{ id: 'sso', label: 'Single Sign-On', impact: 5, effort: 13 }
			],
			relations: [{ from: 'checkout', to: 'sso', type: 'requires' }]
		};
		await page.evaluate(
			({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)),
			{ key: STORAGE_KEY, value: vorherigeSitzung }
		);

		await page.reload();
		await expect(page.getByRole('main')).toBeVisible();

		// Bliebe die Wiederherstellung aus, würde der bereits nachgewiesene automatische
		// Schreibvorgang (oben) den Bestand mit einer leeren Karte überschreiben — der
		// Vergleich mit dem vollständigen, vorherigen Bestand deckt das auf.
		await expect
			.poll(
				async () => {
					const raw = await gespeicherterWert(page);
					return raw !== null ? JSON.parse(raw) : null;
				},
				{ timeout: 3000 }
			)
			.toEqual(vorherigeSitzung);
	});

	// FR-74: ein beschädigter Speicherwert führt zu einer leeren Karte statt zum
	// Fehlerabbruch. Beobachtbar daran, dass (a) kein Skriptfehler auftritt, das Grundgerüst
	// aus F-01 also stehen bleibt, und (b) der beschädigte Rohwert durch einen gültigen,
	// leeren Bestand ersetzt wird (FR-70: der aktuelle — nun leere — Bestand wird
	// automatisch gespeichert).
	test('ersetzt einen beschädigten Speicherwert durch eine leere Karte, ohne Fehlerabbruch', async ({
		page
	}) => {
		const seitenfehler: Error[] = [];
		page.on('pageerror', (error) => seitenfehler.push(error));

		await page.addInitScript(
			(key) => window.localStorage.setItem(key, '{kaputt'),
			STORAGE_KEY
		);

		const response = await page.goto('/');
		expect(response?.ok()).toBe(true);

		await expect(page.getByRole('banner')).toBeVisible();
		await expect(page.getByRole('main')).toBeVisible();
		await expect(page.getByRole('contentinfo')).toBeVisible();

		// Ohne Umsetzung bleibt der Rohwert für immer die kaputte Zeichenkette — dieser Poll
		// fällt dann auf Timeout durch, weil niemals gültiges JSON entsteht.
		await expect
			.poll(
				async () => {
					const raw = await gespeicherterWert(page);
					try {
						return raw !== null ? JSON.parse(raw) : null;
					} catch {
						return 'noch kein gültiges JSON';
					}
				},
				{ timeout: 3000 }
			)
			.toEqual({ schemaVersion: 1, features: [], relations: [] });

		expect(seitenfehler).toEqual([]);
	});
});
