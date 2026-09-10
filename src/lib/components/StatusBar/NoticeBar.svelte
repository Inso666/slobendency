<!--
	NoticeBar (F-23 · features/F-23-statuszeile.md, Abschnitt "Umfang").

	Hinweisband über der Karte (kein Vorbild in design/03-seekarte.html — design/README.md:
	"Modal ... und Import-Vorschau sind noch zu entwerfen; die Bausteine dafür — Rahmen,
	Kartusche, Panel — stehen ... bereits fest", sinngemäß auch hier, wie schon der
	`.connect-banner` aus F-16, src/routes/+page.svelte). Zeigt einen Hinweis für genau die drei
	Zustände von `storageState` (src/lib/store/persistence.ts, F-04), die eine Handlung
	nahelegen: "recovered" (FR-74, wiederhergestellte leere Karte nach beschädigtem Speicher),
	"unavailable" (NFR-32, fehlende Persistenz) und "quotaExceeded" (NFR-31, voller Speicher mit
	Aufforderung zu exportieren). Bei storageState "ready" ist kein Hinweis nötig — nicht
	sichtbar. Liest `storageState` direkt (kein Prop, wie StatusBar.svelte, F-23, Abschnitt
	"DDD-Einordnung": "Die Fußleiste liest ausschließlich vorhandene Stores").

	Schließbar; kehrt erst bei einem erneuten Auftreten zurück (F-23, Abschnitt "Umfang": "Es
	ist schließbar und kehrt erst bei erneutem Auftreten zurück") — Entscheidung dieses
	Test-Agenten zur Umsetzung dieses Satzes (in den Quellen ohne Algorithmus, siehe
	e2e/F-23-statuszeile.spec.ts, Kommentar am Dateianfang): "erneutes Auftreten" heißt,
	`storageState` hat sich seit dem letzten Schließen mindestens einmal verändert — auch wenn
	er zwischendurch auf "ready" oder einen anderen hinweispflichtigen Wert wechselte und dann
	erneut denselben Wert annimmt —, nicht bloß ein erneutes Rendern bei unverändertem Zustand.
	Ein einfacher interner Zustand ("seit dem letzten Wertwechsel geschlossen?", zurückgesetzt
	bei jeder Änderung von `storageState`) genügt dafür; ein wiederholter Schreibfehlschlag, der
	`storageState` ununterbrochen auf demselben Wert hält, löst ohnehin kein neues
	Store-Ereignis aus (Svelte-`writable`-Stores benachrichtigen bei unverändertem Wert nicht
	erneut), sodass "erneutes Auftreten" sich allein aus einem tatsächlichen Wertwechsel ergibt.

	Wortlaut der drei Hinweise ist eine Festlegung dieses Test-Agenten (in den Quellen nicht
	vorgegeben) — muss die dort geprüften Kernaussagen enthalten (beschädigt/ersetzt,
	Sitzungsmodus, voll/exportieren), der übrige Wortlaut ist frei.

	Data-testid: `notice-bar` (Behälter). Der Schließen-Knopf ist über Rolle/Text erreichbar:
	`getByRole('button', { name: 'Hinweis schließen' })`.

	Rumpf ist Aufgabe des Feature-Agenten. Die Komponente selbst nimmt keine Props entgegen.
-->
<script lang="ts"></script>
