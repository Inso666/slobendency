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
<script lang="ts">
	import { storageState } from '../../store/persistence';
	import type { StorageState } from '../../store/persistence';

	/** Zustände, die einen Hinweis nahelegen (F-23, Abschnitt „Umfang"): FR-74, NFR-32, NFR-31.
	 * „ready" braucht keinen Hinweis. */
	const NOTICE_STATES: ReadonlySet<StorageState> = new Set(['recovered', 'unavailable', 'quotaExceeded']);

	/** Vom Nutzer geschlossen, seit dem letzten Wertwechsel von `storageState` (Kopfkommentar
	 * dieser Datei: „erneutes Auftreten" heißt ein tatsächlicher Wertwechsel, auch über
	 * zwischenzeitlich „ready" hinweg). */
	let closed = $state(false);
	let previousState: StorageState | undefined;

	$effect(() => {
		const current = $storageState;
		if (previousState !== undefined && current !== previousState) {
			closed = false;
		}
		previousState = current;
	});

	let visible = $derived(!closed && NOTICE_STATES.has($storageState));

	const MESSAGES: Record<'recovered' | 'unavailable' | 'quotaExceeded', string> = {
		recovered:
			'Der gespeicherte Bestand war beschädigt und wurde durch eine leere Karte ersetzt.',
		unavailable:
			'Der Speicher ist nicht erreichbar — die Anwendung läuft im Sitzungsmodus. Änderungen werden nicht dauerhaft gespeichert.',
		quotaExceeded:
			'Der Speicher ist voll. Sichern Sie den Bestand über Exportieren, bevor weitere Änderungen verloren gehen.'
	};

	let message = $derived(
		$storageState === 'recovered' || $storageState === 'unavailable' || $storageState === 'quotaExceeded'
			? MESSAGES[$storageState]
			: ''
	);

	function close(): void {
		closed = true;
	}
</script>

{#if visible}
	<div class="notice cartouche" data-testid="notice-bar" role="status">
		<p>{message}</p>
		<button type="button" onclick={close}>Hinweis schließen</button>
	</div>
{/if}

<style>
	/* Kein Vorbild in design/03-seekarte.html (Kopfkommentar) — dieselbe Kartuschen-Optik wie das
	   Hinweisband aus F-16 (.connect-banner, src/routes/+page.svelte), oben mittig über der
	   Kartenfläche. */
	.notice {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 7;
		display: flex;
		align-items: center;
		gap: 12px;
		max-width: min(90vw, 560px);
		padding: 9px 10px 9px 16px;
		font-size: 13px;
		color: var(--ink);
	}
	.notice p {
		margin: 0;
	}
	.notice button {
		flex: none;
		background: transparent;
		border: 1px solid var(--hair);
		color: var(--ink);
		padding: 6px 11px;
		font-size: 12.5px;
		cursor: pointer;
	}
	.notice button:hover {
		border-color: var(--ink);
	}
</style>
