<!--
	Startseite: dreiteiliges Grundgerüst (Kopfband, Kartenfläche, Fußleiste) nach
	features/F-01-projektgeruest.md und design/03-seekarte.html.

	Die Karte selbst (Skalen, Raster, Reviere) kommt aus F-08. Verzeichnis und weitere Aktionen
	(Importieren, Exportieren, …) sind nicht Teil dieses Features und folgen in späteren
	Features.

	F-12 · Zoom und Pan (features/F-12-zoom-pan.md, Abschnitt „Verhalten", Zeile
	„Zurücksetzen"): Knopf „Ansicht" öffnet ein Menü mit „Ganze Karte zeigen", das den
	Ausschnitt zurücksetzt (design/03-seekarte.html zeigt „Ansicht" bereits als eigenen Knopf im
	Kopfband, neben den — hier noch nicht umgesetzten — Knöpfen „Importieren" und „Exportieren"
	späterer Features).

	F-14 · Verzeichnis (features/F-14-verzeichnis.md): Knopf „Verzeichnis" im Kopfband klappt das
	Panel auf und zu (FR-50, standardmäßig eingeklappt); `aria-pressed` spiegelt den Zustand wie
	bei den übrigen Kopfband-Reglern. Das Verzeichnis selbst besitzt kein Formular — seine Aktion
	„Bearbeiten" meldet den Wunsch hierher zurück und öffnet dasselbe vorbefüllte Formular aus
	F-13.

	F-13 · Feature-Formular (features/F-13-feature-formular.md): Knopf „+ Feature" öffnet das
	Anlegeformular.

	F-15 · Detail-Kartusche (features/F-15-detail-kartusche.md, Abschnitt „Verhalten"): Der
	Knopf „Bearbeiten", solange ein Feature selektiert ist, saß ursprünglich im Kopfband
	(Entscheidung des Orchestrators zu F-13, da F-13 nicht von F-15/F-16 abhängt, aus denen die
	Quellen sonst einen Auslöser für den Bearbeitungsmodus, FR-04, kennen würden) — F-15 nennt
	ihn ausdrücklich als eine der Aktionen der Kartusche und übernimmt ihn dorthin, statt ihn ein
	zweites Mal danebenzustellen (features/STATUS.md, Auflage zu F-15). `openEditModal` merkt
	sich dazu `document.activeElement`, weil DetailCartouche.svelte das auslösende Element nicht
	selbst als Ereignis durchreicht (seine Signatur `onEdit: () => void` ist vom Test-Agenten
	vorgegeben) — im Augenblick des Klicks ist das der Knopf „Bearbeiten" der Kartusche selbst,
	damit der Fokus beim Schließen des Formulars dorthin zurückkehrt (F-13, Abschnitt
	„Darstellung"); das Nachhalten des auslösenden Elements bleibt Aufgabe des Aufrufers, nicht
	von FeatureModal.svelte.

	F-16 · Kontextmenü und Verbindungsvorgang (features/F-16-verbindungsvorgang.md): MapCanvas.svelte
	meldet Rechtsklick/Long-Press über `onContextMenu` hierher (Bildschirmposition, Ziel); diese
	Seite hält den Menüzustand und rendert ContextMenu.svelte, weil dessen Aktionen „Bearbeiten",
	„Feature anlegen" und „Ganze Karte zeigen" dieselben hier bereits vorhandenen Kanäle
	(`editFeatureFromDirectory`, ein neuer `openCreateModalFromContextMenu`, `resetViewport`)
	auslösen wie die entsprechenden Knöpfe des Kopfbands/Verzeichnisses — kein zweiter Mechanismus
	für dieselbe Aktion (features/README.md, Leitplanke 3). RelationDialog.svelte öffnet sich alleine
	darüber, dass Start *und* Ziel gesetzt sind (`connectSource`/`connectTarget`,
	src/lib/store/selection.ts, F-16 Ablauf Schritt 3) — dieselbe Bedingung, unabhängig davon, ob der
	Start über das Kontextmenü, die Detail-Kartusche (F-15) oder das Verzeichnis (F-14, FR-15) gesetzt
	wurde. Das Hinweisband „Ziel wählen — ESC bricht ab" (F-16, Ablauf Schritt 2, FR-14) ist an
	`connectSource` gebunden und läuft über denselben `cancelConnection()` wie sein Knopf „Abbrechen".

	F-17 · Beziehungen bearbeiten und löschen (features/F-17-beziehungen-pflegen.md): `editingRelation`
	hält die über „Ändern" (Detail-Kartusche oder Beziehungsmenü) gewählte Beziehung; ist sie gesetzt,
	öffnet sich hier eine zweite RelationDialog.svelte-Instanz im Modus „Ändern" — unabhängig von der
	bereits bestehenden Instanz für den Verbindungsvorgang (F-16), weil beide nie gleichzeitig
	auftreten (ein laufender Verbindungsvorgang und ein Bearbeitungsvorgang schließen sich gegenseitig
	nicht aus den Quellen ergebend aus, in der Praxis aber, weil beide Auslöser verschiedene
	Bedienhandlungen sind). Sowohl DetailCartouche.svelte als auch ContextMenu.svelte reichen dafür
	denselben Kanal `openChangeRelation` durch (features/README.md, Leitplanke 3).

	F-18 · Import-Dialog (features/F-18-import.md): Knopf „Importieren" im Kopfband
	(design/03-seekarte.html Zeile 223) öffnet ImportDialog.svelte. Wie die übrigen Modale hier
	(FeatureModal, RelationDialog) merkt sich `importTrigger` das auslösende Element, damit der
	Fokus beim Schließen dorthin zurückkehrt; der Dialog selbst unterscheidet Erfolg und Abbruch
	nicht (siehe Kommentar am Kopf von ImportDialog.svelte) — beide rufen `onClose` gleich auf.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme, theme, type Theme } from '$lib/store/theme';
	import { initPersistence } from '$lib/store/persistence';
	import { map, selectedFeature } from '$lib/store/mapStore';
	import { cancelConnection, connectSource, connectTarget, highlightMode } from '$lib/store/selection';
	import { domainMaxOf } from '$lib/layout/scales';
	import { resetViewport } from '$lib/store/viewport';
	import MapCanvas from '$lib/components/Map/MapCanvas.svelte';
	import FeatureModal from '$lib/components/FeatureModal/FeatureModal.svelte';
	import FeatureList from '$lib/components/FeatureList/FeatureList.svelte';
	import { displayNameOf } from '$lib/components/FeatureList/listing';
	import DetailCartouche from '$lib/components/Tooltip/DetailCartouche.svelte';
	import ContextMenu, {
		type ContextMenuTarget
	} from '$lib/components/ContextMenu/ContextMenu.svelte';
	import RelationDialog from '$lib/components/RelationDialog/RelationDialog.svelte';
	import ImportDialog from '$lib/components/ImportDialog/ImportDialog.svelte';
	import ExportDialog from '$lib/components/ExportDialog/ExportDialog.svelte';
	import type { FeatureId, Relation } from '$lib/model/types';

	// Synchron beim Aufbau der Komponente, nicht in onMount: FR-72 verlangt, dass der
	// gespeicherte Bestand vor dem ersten Rendern der Karte wiederhergestellt ist.
	initPersistence();

	onMount(() => {
		initTheme();
	});

	function chooseTheme(value: Theme): void {
		theme.set(value);
	}

	let domainMax = $derived(domainMaxOf($map));

	/** Menü „Ansicht" im Kopfband (F-12, Abschnitt „Verhalten", Zeile „Zurücksetzen"). */
	let viewMenuOpen = $state(false);

	function toggleViewMenu(): void {
		viewMenuOpen = !viewMenuOpen;
	}

	function showWholeMap(): void {
		resetViewport();
		viewMenuOpen = false;
	}

	/** Menü „Exportieren" im Kopfband (F-19, Abschnitt „Umfang": „aus dem Kopfband über
	 * Exportieren → Als Text geöffnet"). Dasselbe Muster wie das Menü „Ansicht" (F-12): ein
	 * Knopf mit `aria-haspopup`/`aria-expanded`, der ein `.cartouche`-Panel mit weiteren Knöpfen
	 * öffnet, statt einen zweiten Mechanismus für dieselbe Art von Bedienung einzuführen
	 * (features/README.md, Leitplanke 3 sinngemäß auch für Bedienmuster; siehe Kopfkommentar von
	 * e2e/F-19-export-dsl.spec.ts, Entscheidung 1). Weitere Einträge folgen mit F-20/F-21 (SVG-/
	 * PNG-Export). */
	let exportMenuOpen = $state(false);
	let exportDialogOpen = $state(false);

	function toggleExportMenu(): void {
		exportMenuOpen = !exportMenuOpen;
	}

	function openExportAsText(): void {
		exportMenuOpen = false;
		exportDialogOpen = true;
	}

	function closeExportDialog(): void {
		exportDialogOpen = false;
	}

	function handleHeaderMenuKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Escape') return;
		viewMenuOpen = false;
		exportMenuOpen = false;
	}

	// F-13 · Feature-Formular: Modalzustand des Kopfbands. `modalTrigger` merkt das auslösende
	// Element, damit der Fokus beim Schließen dorthin zurückkehrt (F-13, Abschnitt
	// „Darstellung").
	let modalOpen = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let modalTrigger: HTMLElement | null = null;

	function openCreateModal(event: MouseEvent): void {
		modalTrigger = event.currentTarget as HTMLElement;
		modalMode = 'create';
		modalOpen = true;
	}

	/** Ausgelöst über DetailCartouche.svelte, dessen `onEdit: () => void` (vom Test-Agenten
	 * vorgegebene Signatur) das auslösende Element nicht mitliefert — im Augenblick des Klicks
	 * ist das aber bereits deren Knopf „Bearbeiten" (document.activeElement), siehe Kommentar am
	 * Dateianfang. */
	function openEditModal(): void {
		modalTrigger = document.activeElement as HTMLElement | null;
		modalMode = 'edit';
		modalOpen = true;
	}

	function closeModal(): void {
		modalOpen = false;
		modalTrigger?.focus();
		modalTrigger = null;
	}

	// F-14 · Verzeichnis: Auf-/Zugeklappt-Zustand des Panels (FR-50). Er liegt hier und nicht in
	// FeatureList.svelte, weil der Auslöser im Kopfband sitzt.
	let directoryOpen = $state(false);

	function toggleDirectory(): void {
		directoryOpen = !directoryOpen;
	}

	function closeDirectory(): void {
		directoryOpen = false;
	}

	/** Aktion „Bearbeiten" eines Verzeichniseintrags (FR-55): öffnet dasselbe vorbefüllte
	 * Formular wie der Kopfband-Knopf. Das Verzeichnis hat das Feature bereits selektiert; der
	 * Fokus kehrt beim Schließen nicht auf den auslösenden Zeilenknopf zurück, weil das
	 * Verzeichnis dabei einklappt und der Knopf nicht mehr existiert. Wird ebenso von
	 * ContextMenu.svelte (F-16, „Bearbeiten") aufgerufen — derselbe Kanal, kein zweiter
	 * (features/README.md, Leitplanke 3). */
	function editFeatureFromDirectory(_id: FeatureId): void {
		modalTrigger = null;
		modalMode = 'edit';
		modalOpen = true;
	}

	// F-16 · Kontextmenü und Verbindungsvorgang (features/F-16-verbindungsvorgang.md, Abschnitt
	// „Ablauf" Schritt 1). Zustand liegt hier, nicht in MapCanvas.svelte, weil die Aktionen für
	// freie Fläche („Feature anlegen", „Ganze Karte zeigen") bereits vorhandene Kanäle dieser
	// Seite auslösen (Kommentar am Dateianfang).
	let contextMenu = $state<{ x: number; y: number; target: ContextMenuTarget } | null>(null);

	function openContextMenu(x: number, y: number, target: ContextMenuTarget): void {
		contextMenu = { x, y, target };
	}

	function closeContextMenu(): void {
		contextMenu = null;
	}

	/** „Feature anlegen" auf freier Fläche (F-16, Absatz nach „Fachregeln") — dasselbe
	 * Anlegeformular wie der Kopfband-Knopf „+ Feature", ohne dessen Rückkehr-Fokus (das
	 * auslösende Menüelement existiert beim Schließen längst nicht mehr, wie bei
	 * editFeatureFromDirectory()). */
	function openCreateModalFromContextMenu(): void {
		modalTrigger = null;
		modalMode = 'create';
		modalOpen = true;
	}

	// F-17 · Beziehungen bearbeiten und löschen (features/F-17-beziehungen-pflegen.md, Abschnitt
	// „Umfang"). Ausgelöst über „Ändern" in der Detail-Kartusche (F-15) oder im Beziehungsmenü
	// einer Kante (F-16-Kontextmenü, hier erweitert) — derselbe Kanal für beide.
	let editingRelation = $state<Relation | null>(null);

	function openChangeRelation(relation: Relation): void {
		editingRelation = relation;
	}

	function closeChangeRelation(): void {
		editingRelation = null;
	}

	// F-18 · Import-Dialog (features/F-18-import.md): Knopf „Importieren" im Kopfband, siehe
	// Kommentar am Dateianfang. `importTrigger` folgt demselben Muster wie `modalTrigger` oben.
	let importOpen = $state(false);
	let importTrigger: HTMLElement | null = null;

	function openImportDialog(event: MouseEvent): void {
		importTrigger = event.currentTarget as HTMLElement;
		importOpen = true;
	}

	function closeImportDialog(): void {
		importOpen = false;
		importTrigger?.focus();
		importTrigger = null;
	}

	/** Anzeigename eines Features anhand seiner Kennung, für die Quelle/Ziel-Anzeige im
	 * RelationDialog-Modus „Ändern" (F-17, Abschnitt „Verhalten": "Quelle und Ziel ... werden nur
	 * angezeigt"). Unbekannte Kennungen (sollten hier nie vorkommen) fallen auf sich selbst zurück. */
	function featureLabel(id: FeatureId): string {
		const feature = $map.features.find((f) => f.id === id);
		return feature ? displayNameOf(feature) : id;
	}
</script>

<svelte:window onkeydown={handleHeaderMenuKeydown} />

<div class="app">
	<header class="ribbon">
		<div class="title">
			<b>Feature Map</b>
			<span>Blatt 1 · Impact / Effort</span>
		</div>
		<div class="acts">
			<button type="button" class="btn pri" onclick={openCreateModal}>+ Feature</button>
			<button type="button" class="btn" onclick={openImportDialog}>Importieren</button>
			<button
				type="button"
				class="btn"
				aria-pressed={directoryOpen}
				onclick={toggleDirectory}
			>
				Verzeichnis
			</button>
			<div class="view-menu">
				<button
					type="button"
					class="btn"
					aria-haspopup="true"
					aria-expanded={viewMenuOpen}
					onclick={toggleViewMenu}
				>
					Ansicht
				</button>
				{#if viewMenuOpen}
					<div class="view-menu-panel cartouche">
						<button type="button" onclick={showWholeMap}> Ganze Karte zeigen </button>
					</div>
				{/if}
			</div>
			<!-- F-19, Abschnitt „Umfang“: „aus dem Kopfband über Exportieren → Als Text geöffnet“.
				Dasselbe Menü-Muster wie „Ansicht“ (F-12), siehe Kommentar bei exportMenuOpen. -->
			<div class="view-menu">
				<button
					type="button"
					class="btn"
					aria-haspopup="true"
					aria-expanded={exportMenuOpen}
					onclick={toggleExportMenu}
				>
					Exportieren
				</button>
				{#if exportMenuOpen}
					<div class="view-menu-panel cartouche">
						<button type="button" onclick={openExportAsText}>Als Text</button>
					</div>
				{/if}
			</div>
		</div>
		<div class="scope">
			<span class="scope-item">
				<span class="lbl">Hervorhebung</span>
				<span class="sw" role="group" aria-label="Hervorhebung">
					<button
						type="button"
						aria-pressed={$highlightMode === 'direct'}
						onclick={() => highlightMode.set('direct')}
					>
						Nur direkte
					</button>
					<button
						type="button"
						aria-pressed={$highlightMode === 'transitive'}
						onclick={() => highlightMode.set('transitive')}
					>
						Transitiv
					</button>
				</span>
			</span>
			<span class="scope-item">
				<span class="lbl">Tafel</span>
				<span class="sw" role="group" aria-label="Farbtafel">
					<button
						type="button"
						aria-pressed={$theme === 'light'}
						onclick={() => chooseTheme('light')}
					>
						Tag
					</button>
					<button type="button" aria-pressed={$theme === 'dark'} onclick={() => chooseTheme('dark')}>
						Nacht
					</button>
				</span>
			</span>
		</div>
	</header>

	<main class="chart">
		<MapCanvas map={$map} {domainMax} onContextMenu={openContextMenu} />
		{#if $selectedFeature}
			<DetailCartouche
				map={$map}
				feature={$selectedFeature}
				{domainMax}
				onEdit={openEditModal}
				onEditRelation={openChangeRelation}
			/>
		{/if}
		<FeatureList
			open={directoryOpen}
			onClose={closeDirectory}
			onEditFeature={editFeatureFromDirectory}
		/>

		{#if $connectSource}
			<!-- F-16, Ablauf Schritt 2, FR-14: Hinweisband, solange ein Verbindungsvorgang läuft. -->
			<div class="connect-banner cartouche" data-testid="connect-banner">
				<span>Ziel wählen — ESC bricht ab</span>
				<button type="button" onclick={() => cancelConnection()}>Abbrechen</button>
			</div>
		{/if}
	</main>

	<footer class="foot"></footer>

	{#if modalOpen}
		<FeatureModal
			open={modalOpen}
			mode={modalMode}
			feature={modalMode === 'edit' ? $selectedFeature : null}
			onClose={closeModal}
		/>
	{/if}

	{#if contextMenu}
		<ContextMenu
			x={contextMenu.x}
			y={contextMenu.y}
			target={contextMenu.target}
			onClose={closeContextMenu}
			onEdit={editFeatureFromDirectory}
			onEditRelation={openChangeRelation}
			onCreateFeature={openCreateModalFromContextMenu}
			onShowWholeMap={() => resetViewport()}
		/>
	{/if}

	{#if $connectSource && $connectTarget}
		<!-- F-16, Ablauf Schritt 3: öffnet, sobald Start und Ziel gesetzt sind, unabhängig davon,
			wodurch der Start gesetzt wurde (Kontextmenü, Detail-Kartusche F-15, Verzeichnis F-14). -->
		<RelationDialog
			open={true}
			from={$connectSource}
			to={$connectTarget}
			onCreated={() => cancelConnection()}
			onCancel={() => cancelConnection()}
		/>
	{/if}

	{#if editingRelation}
		<!-- F-17, Abschnitt "Umfang": derselbe RelationDialog wie F-16, hier im Modus "Ändern",
			ausgelöst über die Detail-Kartusche oder das Beziehungsmenü einer Kante. -->
		<RelationDialog
			open={true}
			from={editingRelation.from}
			to={editingRelation.to}
			fromLabel={featureLabel(editingRelation.from)}
			toLabel={featureLabel(editingRelation.to)}
			relation={editingRelation}
			onSaved={closeChangeRelation}
			onCancel={closeChangeRelation}
		/>
	{/if}

	{#if importOpen}
		<!-- F-18, Abschnitt "Umfang": Import-Dialog, ausgelöst über den Kopfband-Knopf
			"Importieren". -->
		<ImportDialog open={importOpen} onClose={closeImportDialog} />
	{/if}

	{#if exportDialogOpen}
		<!-- F-19, Abschnitt "Umfang": Export-Dialog, geöffnet über "Exportieren → Als Text". -->
		<ExportDialog open={true} map={$map} onClose={closeExportDialog} />
	{/if}
</div>

<style>
	/* F-16, Ablauf Schritt 2, FR-14: Hinweisband über der Karte, solange ein Verbindungsvorgang
	   läuft. Keine Vorlage in design/03-seekarte.html (design/README.md: Kontextmenü und seine
	   Begleitelemente sind „noch zu entwerfen"), deshalb als schlanke Kartusche oben mittig über
	   der Kartenfläche, mit denselben Token wie jede andere Kartusche der Anwendung. */
	.connect-banner {
		position: absolute;
		top: 16px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 7;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 9px 10px 9px 16px;
		font-size: 13px;
		color: var(--ink);
	}
	.connect-banner button {
		background: transparent;
		border: 1px solid var(--hair);
		color: var(--ink);
		padding: 6px 11px;
		font-size: 12.5px;
		cursor: pointer;
	}
	.connect-banner button:hover {
		border-color: var(--ink);
	}
</style>
