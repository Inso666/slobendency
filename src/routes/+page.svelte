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
	Anlegeformular. Ein über Rolle und Text erreichbarer Knopf „Bearbeiten" — Entscheidung des
	Orchestrators, siehe features/STATUS.md, Abschnitt „Entscheidungen des Orchestrators", da
	F-13 nicht von F-15/F-16 abhängt, aus denen die Quellen sonst einen Auslöser für den
	Bearbeitungsmodus (FR-04) kennen würden — öffnet dasselbe Formular vorbefüllt, solange ein
	Feature selektiert ist (F-11 `selectedId`). Beide Knöpfe merken sich das auslösende Element,
	damit der Fokus beim Schließen dorthin zurückkehrt (F-13, Abschnitt „Darstellung"); das ist
	Aufgabe des Aufrufers, nicht von FeatureModal.svelte selbst.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme, theme, type Theme } from '$lib/store/theme';
	import { initPersistence } from '$lib/store/persistence';
	import { map, selectedFeature } from '$lib/store/mapStore';
	import { highlightMode, selectedId } from '$lib/store/selection';
	import { domainMaxOf } from '$lib/layout/scales';
	import { resetViewport } from '$lib/store/viewport';
	import MapCanvas from '$lib/components/Map/MapCanvas.svelte';
	import FeatureModal from '$lib/components/FeatureModal/FeatureModal.svelte';
	import FeatureList from '$lib/components/FeatureList/FeatureList.svelte';
	import type { FeatureId } from '$lib/model/types';

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

	function handleViewMenuKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') viewMenuOpen = false;
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

	function openEditModal(event: MouseEvent): void {
		modalTrigger = event.currentTarget as HTMLElement;
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
	 * Verzeichnis dabei einklappt und der Knopf nicht mehr existiert. */
	function editFeatureFromDirectory(_id: FeatureId): void {
		modalTrigger = null;
		modalMode = 'edit';
		modalOpen = true;
	}
</script>

<svelte:window onkeydown={handleViewMenuKeydown} />

<div class="app">
	<header class="ribbon">
		<div class="title">
			<b>Feature Map</b>
			<span>Blatt 1 · Impact / Effort</span>
		</div>
		<div class="acts">
			<button type="button" class="btn pri" onclick={openCreateModal}>+ Feature</button>
			{#if $selectedId}
				<button type="button" class="btn" onclick={openEditModal}>Bearbeiten</button>
			{/if}
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
		<MapCanvas map={$map} {domainMax} />
		<FeatureList
			open={directoryOpen}
			onClose={closeDirectory}
			onEditFeature={editFeatureFromDirectory}
		/>
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
</div>
