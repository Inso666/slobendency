<!--
	ContextMenu (F-16 · features/F-16-verbindungsvorgang.md, Abschnitt "Umfang").

	Kontextmenü an der Zeigerposition (FR-10): Rechtsklick auf ein Feature bietet "Als Start
	verwenden", "Als Ziel verwenden", "Bearbeiten", "Löschen" (F-16, Abschnitt "Ablauf" Schritt 1;
	PRD FR-11, FR-40); Rechtsklick auf freie Fläche bietet "Ganze Karte zeigen" und "Feature
	anlegen" (F-16, Absatz nach "Fachregeln": "Das Kontextmenü ersetzt das Browser-Kontextmenü
	über der Karte; auf freier Fläche bietet es 'Ganze Karte zeigen' und 'Feature anlegen'").
	Ersetzt in beiden Fällen das native Browser-Kontextmenü (`event.preventDefault()` beim
	auslösenden `contextmenu`-Ereignis, Aufgabe des Aufrufers — diese Komponente bekommt bereits
	die fertige Zeigerposition `x`/`y` übergeben und weiß nichts vom auslösenden Ereignis selbst).

	Rolle `menu` mit Einträgen der Rolle `menuitem` (design/README.md nennt für das Kontextmenü
	noch keinen fertigen Entwurf — "noch zu entwerfen; die Bausteine dafür — Rahmen, Kartusche,
	Panel — stehen ... bereits fest" —, deshalb hier über Rolle/Text zugänglich statt über ein
	Mockup nachgebaut). Zugänglicher Name des Menüs "Feature-Menü" auf einem Feature, "Kartenmenü"
	auf freier Fläche (e2e/F-16-verbindungsvorgang.spec.ts). Schließt bei ESC, bei Klick daneben
	und beim Scrollen (F-16, derselbe Absatz); Einträge sind mit den Pfeiltasten erreichbar
	(Pfeil-Auf/-Ab wandert zwischen den Einträgen, mit Umbruch am Rand). Trefferflächen mindestens
	44 × 44 px (UI-16).

	Escape schließt hier ausschließlich das Menü selbst (`stopPropagation()`, analog zum
	Fokusfallen-Escape in FeatureModal.svelte, F-13): ohne das liefe derselbe Tastendruck zusätzlich
	beim globalen Escape-Listener der Karte auf (MapCanvas.svelte, handleEscape() aus
	src/lib/store/selection.ts) und bräche dabei einen möglicherweise laufenden
	Verbindungsvorgang ab, obwohl nur das gerade geöffnete Menü gemeint war (F-16-AK: der Startpunkt
	"bleibt es, bis der Vorgang endet" — auch über das Öffnen und Schließen eines weiteren Menüs
	hinweg, e2e/F-16-verbindungsvorgang.spec.ts, Testgruppe "Verbindungsstart").

	"Als Start verwenden" und "Als Ziel verwenden" setzen direkt connectSource bzw. connectTarget
	(src/lib/store/selection.ts) — genau wie der bereits bestehende Knopf "Als Start verwenden"
	in DetailCartouche.svelte (F-15) und "Beziehung anlegen" in FeatureList.svelte (F-14) es tun;
	diese Komponente führt hier keinen zweiten Mechanismus für dieselbe Aktion ein
	(features/README.md, Leitplanke 3). "Als Ziel verwenden" ist auf dem aktuell gesetzten
	Startfeature deaktiviert (INT-03, F-16-AK: "'Als Ziel verwenden' ist auf dem Startfeature
	nicht auswählbar"). "Löschen" ruft deleteFeature (src/lib/store/mapStore.ts) auf; besteht
	mindestens eine Beziehung, ist dieselbe Rückfrage zuständig, die bereits in
	DetailCartouche.svelte entschieden wurde (FR-05, features/STATUS.md, Entscheidung vom 06.09.
	zu FR-05) — kein zweites Bestätigungsmuster. Diese Komponente liest dafür `map` direkt aus
	src/lib/store/mapStore.ts (wie FeatureList.svelte, nicht als Prop — die Testagenten-Signatur
	sieht keine `map`-Prop vor).

	Data-testid: keins auf dieser Komponente selbst (Menü und Einträge sind über Rolle/Text
	eindeutig ansprechbar, e2e/F-16-verbindungsvorgang.spec.ts).

	F-17 · Beziehungen bearbeiten und löschen (features/F-17-beziehungen-pflegen.md, Abschnitt
	"Umfang": "Kontextmenü auf einer Kante mit denselben zwei Einträgen [Ändern, Entfernen]").
	Rechtsklick/Long-Press auf einer Kante liefert `target.kind === 'relation'`; das Menü trägt
	dann den zugänglichen Namen "Beziehungsmenü" (Designentscheidung des Test-Agenten,
	Kopfkommentar von e2e/F-17-beziehungen-pflegen.spec.ts, in derselben Musterlinie wie
	"Feature-Menü"/"Kartenmenü"). "Ändern" öffnet denselben RelationDialog im Modus "Ändern" wie
	die Detail-Kartusche — über `onEditRelation`, denselben Kanal, den DetailCartouche.svelte
	verwendet (kein zweiter Mechanismus, features/README.md, Leitplanke 3). "Entfernen" ruft
	deleteRelation (src/lib/store/mapStore.ts) unmittelbar auf, ohne Rückfrage (F-17, Abschnitt
	"Verhalten").
-->
<script module lang="ts">
	import type { FeatureId, Relation } from '../../model/types';

	/** Ziel des Menüs: ein bestimmtes Feature (Rechtsklick auf dessen Signatur), eine Beziehung
	 * (Rechtsklick auf ihre Kante, F-17) oder freie Fläche (Rechtsklick auf die Kartenfläche
	 * selbst, F-16, Abschnitt nach "Fachregeln"). */
	export type ContextMenuTarget =
		| { kind: 'feature'; id: FeatureId }
		| { kind: 'relation'; relation: Relation }
		| { kind: 'blank' };
</script>

<script lang="ts">
	import { relationsOf } from '../../model/validation';
	import { deleteFeature, deleteRelation, map } from '../../store/mapStore';
	import { connectSource, connectTarget, selectedId } from '../../store/selection';
	import { displayNameOf } from '../FeatureList/listing';

	let {
		x,
		y,
		target,
		onClose,
		onEdit,
		onEditRelation,
		onCreateFeature,
		onShowWholeMap
	}: {
		/** Bildschirmposition, an der das Menü erscheint (F-16, Ablauf Schritt 1: "an der
		 * Zeigerposition"). */
		x: number;
		y: number;
		target: ContextMenuTarget;
		/** Schließt das Menü: ESC, Klick daneben, Scrollen, nach jeder ausgeführten Aktion. */
		onClose: () => void;
		/** "Bearbeiten" auf einem Feature — öffnet das vorbefüllte Formular aus F-13 für dieses
		 * Feature (unabhängig davon, ob es zuvor bereits selektiert war). */
		onEdit: (id: FeatureId) => void;
		/** "Ändern" auf einer Beziehung (F-17) — öffnet RelationDialog.svelte im Modus "Ändern",
		 * vorbefüllt mit Art und Beschriftung dieser Beziehung. */
		onEditRelation: (relation: Relation) => void;
		/** "Feature anlegen" auf freier Fläche — öffnet dasselbe Formular aus F-13 im
		 * Anlegemodus wie der Kopfband-Knopf "+ Feature". */
		onCreateFeature: () => void;
		/** "Ganze Karte zeigen" auf freier Fläche — derselbe Vorgang wie im Menü "Ansicht"
		 * (F-12, resetViewport() aus src/lib/store/viewport.ts). */
		onShowWholeMap: () => void;
	} = $props();

	let menuEl: HTMLDivElement | undefined = $state();

	/** Position, nach dem Einhängen an die Fensterränder geklemmt (verhindert, dass das Menü
	 * nahe am Rand über den Bildschirm hinausragt, insbesondere bei 375 px Breite). */
	let posX = $state(x);
	let posY = $state(y);

	const MARGIN = 8;

	$effect(() => {
		if (!menuEl) return;
		const rect = menuEl.getBoundingClientRect();
		posX = Math.min(Math.max(x, MARGIN), Math.max(MARGIN, window.innerWidth - rect.width - MARGIN));
		posY = Math.min(
			Math.max(y, MARGIN),
			Math.max(MARGIN, window.innerHeight - rect.height - MARGIN)
		);
	});

	/** Fokus wandert beim Öffnen auf den ersten auswählbaren Eintrag (übliches Verhalten für
	 * `role="menu"`) — sonst bliebe der Fokus auf dem zuvor fokussierten Element (meist
	 * `<body>`), ein ESC-Tastendruck erreichte handleMenuKeydown() unten dann gar nicht, weil er
	 * dort ausgelöst statt hierher geleitet würde (F-16, Absatz nach „Fachregeln": „Es schließt
	 * bei ESC ...; die Einträge sind mit Pfeiltasten erreichbar"). */
	$effect(() => {
		if (!menuEl) return;
		const first = menuEl.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
		first?.focus();
	});

	/** Läuft ein Verbindungsvorgang für ein anderes Feature, ist "Als Ziel verwenden" auf dem
	 * Startfeature selbst nicht auswählbar (INT-03). Ohne laufenden Vorgang bleibt der Eintrag
	 * auswählbar — er setzt in diesem Fall lediglich connectTarget, ohne dass der Dialog dadurch
	 * bereits öffnet (der öffnet erst, sobald auch connectSource gesetzt ist). */
	function isSelfTarget(id: FeatureId): boolean {
		return id === $connectSource;
	}

	function startConnection(id: FeatureId): void {
		connectSource.set(id);
		onClose();
	}

	function chooseTarget(id: FeatureId): void {
		connectTarget.set(id);
		onClose();
	}

	function editFeature(id: FeatureId): void {
		selectedId.set(id);
		onEdit(id);
		onClose();
	}

	function createFeature(): void {
		onCreateFeature();
		onClose();
	}

	/** "Ändern" auf einer Beziehung (F-17, Abschnitt "Umfang"). */
	function changeRelation(relation: Relation): void {
		onEditRelation(relation);
		onClose();
	}

	/** "Entfernen" auf einer Beziehung — ohne Rückfrage (F-17, Abschnitt "Verhalten"). */
	function removeRelation(relation: Relation): void {
		deleteRelation(relation);
		onClose();
	}

	function showWholeMap(): void {
		onShowWholeMap();
		onClose();
	}

	// "Löschen" (FR-05): Rückfrage nur, wenn Beziehungen bestehen — sonst sofortiges Löschen. Die
	// Rückfrage ersetzt hier die Menüansicht in derselben Komponente, statt das Menü sofort zu
	// schließen (onClose() liefe sonst die ganze Komponente ab, bevor die Rückfrage überhaupt
	// erscheinen könnte).
	let pendingDeleteId = $state<FeatureId | null>(null);
	let pendingDeleteCount = $state(0);
	let confirmEl: HTMLDialogElement | undefined = $state();

	function requestDelete(id: FeatureId): void {
		const { outgoing, incoming } = relationsOf($map, id);
		const count = outgoing.length + incoming.length;
		if (count === 0) {
			deleteFeature(id);
			onClose();
			return;
		}
		pendingDeleteId = id;
		pendingDeleteCount = count;
	}

	$effect(() => {
		if (pendingDeleteId && confirmEl && !confirmEl.open) confirmEl.showModal();
	});

	function confirmDelete(): void {
		if (pendingDeleteId) deleteFeature(pendingDeleteId);
		pendingDeleteId = null;
		onClose();
	}

	function cancelDelete(): void {
		pendingDeleteId = null;
		onClose();
	}

	let pendingFeatureName = $derived(
		pendingDeleteId
			? displayNameOf($map.features.find((f) => f.id === pendingDeleteId) ?? { id: pendingDeleteId, impact: 0, effort: 0 })
			: ''
	);

	function handleMenuKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.stopPropagation();
			onClose();
			return;
		}
		if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
		if (!menuEl) return;
		event.preventDefault();

		const items = Array.from(
			menuEl.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])')
		);
		if (items.length === 0) return;

		const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
		let nextIndex: number;
		if (event.key === 'ArrowDown') {
			nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
		} else {
			nextIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
		}
		items[nextIndex].focus();
	}

	function handleConfirmKeydown(event: KeyboardEvent): void {
		// Wie in FeatureList.svelte/DetailCartouche.svelte (FR-05): Escape schließt hier nur die
		// Rückfrage, ohne zusätzlich den globalen Escape-Listener der Karte zu erreichen.
		if (event.key === 'Escape') event.stopPropagation();
	}

	function handleConfirmClose(): void {
		pendingDeleteId = null;
		onClose();
	}

	function handleOutsideClick(event: MouseEvent): void {
		if (pendingDeleteId) return;
		if (menuEl && !menuEl.contains(event.target as Node)) onClose();
	}

	function handleWheel(): void {
		if (pendingDeleteId) return;
		onClose();
	}

	$effect(() => {
		document.addEventListener('click', handleOutsideClick, true);
		window.addEventListener('wheel', handleWheel, { passive: true });
		return () => {
			document.removeEventListener('click', handleOutsideClick, true);
			window.removeEventListener('wheel', handleWheel);
		};
	});
</script>

{#if pendingDeleteId}
	<!--
		Rückfrage vor dem Löschen (FR-05, features/STATUS.md, Entscheidung vom 06.09.): dasselbe
		Muster wie in DetailCartouche.svelte und FeatureList.svelte — `role="alertdialog"`,
		zugänglicher Name "Feature löschen", als Kartusche über die Token aus src/app.css.
	-->
	<dialog
		bind:this={confirmEl}
		class="confirm-delete cartouche"
		role="alertdialog"
		aria-labelledby="context-menu-confirm-title"
		onclose={handleConfirmClose}
		onkeydown={handleConfirmKeydown}
	>
		<h3 id="context-menu-confirm-title">Feature löschen</h3>
		<p>
			„{pendingFeatureName}" hat {pendingDeleteCount}
			{pendingDeleteCount === 1 ? 'Beziehung' : 'Beziehungen'}. Sie werden mit gelöscht.
		</p>
		<div class="btns">
			<button type="button" onclick={cancelDelete}>Abbrechen</button>
			<button type="button" class="rm" onclick={confirmDelete}>Löschen</button>
		</div>
	</dialog>
{:else}
	<div
		bind:this={menuEl}
		class="context-menu cartouche"
		role="menu"
		aria-label={target.kind === 'feature'
			? 'Feature-Menü'
			: target.kind === 'relation'
				? 'Beziehungsmenü'
				: 'Kartenmenü'}
		style:left="{posX}px"
		style:top="{posY}px"
		onkeydown={handleMenuKeydown}
	>
		{#if target.kind === 'feature'}
			<button type="button" role="menuitem" onclick={() => startConnection(target.id)}>
				Als Start verwenden
			</button>
			<button
				type="button"
				role="menuitem"
				disabled={isSelfTarget(target.id)}
				onclick={() => chooseTarget(target.id)}
			>
				Als Ziel verwenden
			</button>
			<button type="button" role="menuitem" onclick={() => editFeature(target.id)}>
				Bearbeiten
			</button>
			<button type="button" role="menuitem" onclick={() => requestDelete(target.id)}>
				Löschen
			</button>
		{:else if target.kind === 'relation'}
			<button type="button" role="menuitem" onclick={() => changeRelation(target.relation)}>
				Ändern
			</button>
			<button type="button" role="menuitem" onclick={() => removeRelation(target.relation)}>
				Entfernen
			</button>
		{:else}
			<button type="button" role="menuitem" onclick={showWholeMap}> Ganze Karte zeigen </button>
			<button type="button" role="menuitem" onclick={createFeature}> Feature anlegen </button>
		{/if}
	</div>
{/if}

<style>
	.context-menu {
		position: fixed;
		z-index: 8;
		min-width: 200px;
		padding: 4px;
		display: flex;
		flex-direction: column;
	}
	.context-menu button {
		display: flex;
		align-items: center;
		min-height: 44px;
		width: 100%;
		text-align: left;
		background: transparent;
		border: 0;
		padding: 8px 12px;
		font-size: 13.5px;
		cursor: pointer;
	}
	.context-menu button:hover:not(:disabled) {
		background: var(--hover);
	}
	.context-menu button:disabled {
		color: var(--ink-soft);
		cursor: not-allowed;
	}

	/* Rückfrage vor dem Löschen — dieselbe Kartusche wie in DetailCartouche.svelte. */
	.confirm-delete {
		padding: 0;
		margin: auto;
		width: min(90vw, 360px);
		color: var(--ink);
	}
	.confirm-delete::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.confirm-delete h3 {
		margin: 0;
		padding: 16px 18px 0;
		font-family: 'Fraunces', serif;
		font-size: 17px;
		font-weight: 600;
	}
	.confirm-delete p {
		margin: 10px 0 0;
		padding: 0 18px;
		font-size: 13.5px;
		line-height: 1.5;
	}
	.confirm-delete .btns {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 16px 18px 18px;
	}
	.confirm-delete .btns button {
		border: 1px solid var(--hair);
		background: transparent;
		padding: 7px 11px;
		font-size: 13px;
		cursor: pointer;
	}
	.confirm-delete .btns button:hover {
		border-color: var(--ink);
	}
	.confirm-delete .btns .rm {
		color: var(--magenta);
	}
</style>
