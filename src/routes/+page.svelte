<!--
	Startseite: dreiteiliges Grundgerüst (Kopfband, Kartenfläche, Fußleiste) nach
	features/F-01-projektgeruest.md und design/03-seekarte.html.

	Die Karte selbst (Skalen, Raster, Reviere) kommt aus F-08. Verzeichnis und weitere Aktionen
	(Importieren, Exportieren, …) sind nicht Teil dieses Features und folgen in späteren
	Features.

	F-25 · Datenzoom (features/F-25-datenzoom.md, Abschnitt „Verhalten", Zeile „Zurücksetzen";
	ersetzt die F-12-Zoom-Mechanik vollständig): Knopf „Ansicht" öffnet ein Menü mit „Ganze Karte
	zeigen", das den Ausschnitt zurücksetzt (design/03-seekarte.html zeigt „Ansicht" bereits als
	eigenen Knopf im Kopfband, neben den — hier noch nicht umgesetzten — Knöpfen „Importieren" und
	„Exportieren" späterer Features). Der Ausschnitt startet synchron beim Seitenaufbau in der
	Vollansicht des tatsächlichen domainMax (resetViewport(domainMaxOf($map)) unten), damit nach
	jedem Neuladen wieder die Vollansicht aktiv ist (F-25-AK).

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

	F-23 · Fußleiste, Hinweise, Zurücksetzen (features/F-23-statuszeile.md): StatusBar.svelte
	ersetzt den bisher leeren `<footer class="foot">` aus F-01 — die Komponente rendert das
	`<footer>` selbst und liest ausschließlich vorhandene Stores (Kopfkommentar von
	StatusBar.svelte), diese Seite reicht keine Props durch. NoticeBar.svelte liegt aus demselben
	Grund wie `.connect-banner` (F-16) über der Kartenfläche in `<main class="chart">`. „Karte
	zurücksetzen" (FR-75) ergänzt das bereits bestehende Menü „Ansicht" (F-12) um einen weiteren
	Eintrag, weil das Menü bereits hier lebt — derselbe Rückfrage-Dialog wie „Feature löschen"
	(F-14/F-15, features/STATUS.md, Entscheidung vom 06.09. zu FR-05), hier auf `resetMap()`
	(src/lib/store/mapStore.ts) angewandt statt auf `deleteFeature`.

	F-24 · Hervorhebung: Abdunkeln oder Ausblenden (features/F-24-hervorhebung-sichtbarkeit.md, PRD
	FR-47, Abschnitt 6.1): weiterer Umschalter im bereits bestehenden Menü „Ansicht", derselben
	Bauart wie der Umschalter „Hervorhebung" im Kopfband (`role="group"`, Knöpfe mit `aria-pressed`,
	gebunden an `highlightVisibility` aus src/lib/store/selection.ts) — festgelegt in
	features/STATUS.md, Abschnitt „Entscheidungen des Orchestrators" (PRD 1.1, 11.09.): „Einstellungen
	und der neue Sichtbarkeits-Umschalter hängen am bestehenden Menü Ansicht ▾ statt einer neuen
	Symbolleisten-Schaltfläche."
-->
<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { initTheme, theme, type Theme } from '$lib/store/theme';
	import { initPersistence } from '$lib/store/persistence';
	import { map, resetMap, selectedFeature } from '$lib/store/mapStore';
	import {
		cancelConnection,
		connectSource,
		connectTarget,
		highlightMode,
		highlightVisibility
	} from '$lib/store/selection';
	import { domainMaxOf } from '$lib/layout/scales';
	import { resetViewport, viewport } from '$lib/store/viewport';
	import { estimationMode, estimationRange, initSettings } from '$lib/store/settings';
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
	import SettingsDialog from '$lib/components/SettingsDialog/SettingsDialog.svelte';
	import StatusBar from '$lib/components/StatusBar/StatusBar.svelte';
	import NoticeBar from '$lib/components/StatusBar/NoticeBar.svelte';
	import { downloadSvg } from '$lib/export/svg';
	import { downloadPng, type PngScale } from '$lib/export/png';
	import type { FeatureId, Relation } from '$lib/model/types';

	// Synchron beim Aufbau der Komponente, nicht in onMount: FR-72 verlangt, dass der
	// gespeicherte Bestand vor dem ersten Rendern der Karte wiederhergestellt ist.
	initPersistence();

	// F-26 · Schätzmodus (features/F-26-schaetzmodus.md, Abschnitt „Umfang", FR-76): ebenfalls
	// synchron und vor resetViewport() unten — domainMaxOf() hängt im Modus 'free' vom
	// eingestellten Wertebereich ab, der deshalb vor der ersten Skalenberechnung feststehen muss.
	initSettings();

	// F-25 · Datenzoom (features/F-25-datenzoom.md, Abschnitt „Akzeptanzkriterien": „Nach einem
	// Neuladen ist wieder die Vollansicht aktiv"): einmalig beim Aufbau der Seite, mit dem
	// tatsächlichen domainMax des wiederhergestellten Bestands — nicht reaktiv bei jeder
	// domainMax-Änderung, sonst risse ein wachsendes domainMax (neues Feature über 21) den
	// Ausschnitt mitten in der Sitzung wieder auf.
	resetViewport(domainMaxOf($map, $estimationMode, $estimationRange));

	onMount(() => {
		initTheme();
	});

	function chooseTheme(value: Theme): void {
		theme.set(value);
	}

	let domainMax = $derived(domainMaxOf($map, $estimationMode, $estimationRange));

	/** Menü „Ansicht" im Kopfband (F-25, Abschnitt „Verhalten", Zeile „Zurücksetzen"). */
	let viewMenuOpen = $state(false);

	function toggleViewMenu(): void {
		viewMenuOpen = !viewMenuOpen;
	}

	function showWholeMap(): void {
		resetViewport(domainMax);
		viewMenuOpen = false;
	}

	// F-22 · Responsives Verhalten und Touch (features/F-22-responsiv.md, Abschnitt „Umfang",
	// Zeile „Zeichenerklärung"): „Ausgeblendet, erreichbar über Ansicht → Zeichenerklärung."
	// Derselbe Menü-Mechanismus wie „Ganze Karte zeigen" oben, kein zweiter Menü-Aufbau
	// (features/README.md, Leitplanke 3).
	let legendForced = $state(false);

	function toggleLegendForced(): void {
		legendForced = !legendForced;
		viewMenuOpen = false;
	}

	// F-23 · „Karte zurücksetzen" (FR-75): Rückfrage im selben Muster wie die Löschrückfrage aus
	// F-14/F-15 (features/STATUS.md, Entscheidung vom 06.09. zu FR-05) — `role="alertdialog"`,
	// Name „Karte zurücksetzen", Knöpfe „Zurücksetzen"/„Abbrechen", als Kartusche über die Token
	// aus src/app.css.
	let resetConfirmOpen = $state(false);
	let resetConfirmEl: HTMLDialogElement | undefined;

	function openResetConfirm(): void {
		viewMenuOpen = false;
		resetConfirmOpen = true;
	}

	// F-26 · Schätzmodus (features/F-26-schaetzmodus.md, Abschnitt „Umfang"; PRD 6.1;
	// features/STATUS.md, Abschnitt „Entscheidungen des Orchestrators", Eintrag „Barrierefreier
	// Kontrakt des Einstellungsdialogs, F-26"): Eintrag „Einstellungen" im bereits bestehenden
	// Menü „Ansicht", dasselbe Muster wie „Karte zurücksetzen" oben — der Eintrag verschwindet mit
	// dem Menü, ein Rückkehr-Fokus auf ihn ist deshalb ebenso wenig möglich wie bei
	// editFeatureFromDirectory() (Kommentar dort).
	let settingsOpen = $state(false);

	function openSettingsDialog(): void {
		viewMenuOpen = false;
		settingsOpen = true;
	}

	function closeSettingsDialog(): void {
		settingsOpen = false;
	}

	function closeResetConfirm(): void {
		resetConfirmOpen = false;
	}

	function confirmReset(): void {
		resetConfirmOpen = false;
		resetMap();
	}

	$effect(() => {
		if (resetConfirmOpen) {
			resetConfirmEl?.showModal();
		} else {
			resetConfirmEl?.close();
		}
	});

	/** Escape schließt nur die Rückfrage (natives `<dialog>`-Verhalten) und darf dabei nicht
	 * zusätzlich MapCanvas.svelte's globalen Escape-Handler (handleEscape, FR-13/FR-46) erreichen
	 * — dasselbe Muster wie FeatureList.svelte (F-14). */
	function handleResetConfirmKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') event.stopPropagation();
	}

	function featureWord(count: number): string {
		return count === 1 ? 'Feature' : 'Features';
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

	/** Farbtafel des SVG-Exports (F-20, Abschnitt „Umfang": „Standardtafel für den Export ist
	 * Tag, auch wenn die Oberfläche gerade auf Nacht steht … Im Menü Exportieren steht dafür ein
	 * Umschalter Tafel: Tag / Nacht"). Bewusst ein eigener, von der Kopfband-Tafel ($theme, F-01)
	 * unabhängiger Zustand mit Standardwert 'light' — genau das ist der Zweck dieses Umschalters. */
	let svgExportTheme = $state<Theme>('light');

	/** Liefert das aktuell gerenderte SVG der Karte für den Export. Minimaler Testhaken für F-20:
	 * MapCanvas.svelte hält seine `<svg>`-Referenz intern; die Klasse "map" (F-08) identifiziert
	 * sie hier eindeutig, ohne eine neue Schnittstelle an MapCanvas.svelte zu entwerfen — das
	 * bleibt, falls nötig, Aufgabe des Feature-Agenten. */
	function currentMapSvg(): SVGSVGElement | null {
		return document.querySelector<SVGSVGElement>('svg.map');
	}

	/**
	 * FR-65 (unverändert, F-20/F-21 — „Nicht Teil dieses Features" laut F-25): der Bildexport
	 * umfasst immer die vollständige Karte, unabhängig vom Zoom-Ausschnitt. Vor F-25 galt das
	 * automatisch, weil der Ausschnitt nur eine `transform`-Gruppe um ansonsten unveränderte,
	 * auf den vollen Wertebereich projizierte Koordinaten legte (buildExportSvg() entfernte diese
	 * Gruppe vor dem Messen der Bounding Box). Seit F-25 tragen die gerenderten Koordinaten
	 * (Feature-Signaturen, Teilstriche, Raster, Reviere) das sichtbare Fenster bereits selbst —
	 * es gibt keine wegnehmbare Transformation mehr. Der Export setzt den Ausschnitt deshalb hier
	 * kurz auf die Vollansicht zurück, bevor er das aktuell gerenderte SVG (`currentMapSvg()`)
	 * ausliest, und stellt den vorherigen Ausschnitt danach wieder her — `tick()` sorgt dafür,
	 * dass die Karte zwischen den beiden Zustandswechseln tatsächlich neu gerendert hat, bevor
	 * geklont/gemessen wird.
	 */
	async function withFullMapView<T>(action: () => T | Promise<T>): Promise<T> {
		const previous = $viewport;
		resetViewport(domainMax);
		await tick();
		try {
			return await action();
		} finally {
			viewport.set(previous);
			await tick();
		}
	}

	/** Eintrag „Als SVG" im Menü „Exportieren" (F-20, Abschnitt „Umfang": FR-63). */
	async function exportAsSvg(): Promise<void> {
		exportMenuOpen = false;
		await withFullMapView(() => {
			const svgEl = currentMapSvg();
			if (!svgEl) return;
			downloadSvg(svgEl, { theme: svgExportTheme });
		});
	}

	/** F-21, Abschnitt „Umfang": „Das Menü Exportieren → Als Bild bietet den Faktor als drei
	 * Knöpfe (1×, 2×, 4×) ... und den Tafelumschalter aus F-20." Testhaken dieses Test-Agenten
	 * (Auftrag des Orchestrators): minimale Verdrahtung, damit e2e/F-21-export-png.spec.ts gegen
	 * ein reales Menü prüfen kann — die eigentliche Bild-Erzeugung bleibt in
	 * src/lib/export/png.ts, Aufgabe des Feature-Agenten. */
	const PNG_SCALES: PngScale[] = [1, 2, 4];
	let pngTransparentBackground = $state(false);
	/** Faktor, der gerade erzeugt wird, oder `null` — hält fest, WELCHER der drei Knöpfe
	 * „Wird erzeugt …" zeigt und deaktiviert ist (F-21-AK: „Während der Erzeugung ist der Knopf
	 * deaktiviert"). Das Menü bleibt dafür bewusst offen (anders als exportAsSvg/openExportAsText,
	 * die es sofort schließen) — sonst wäre der Zwischenzustand nie sichtbar. */
	let pngExporting = $state<PngScale | null>(null);
	/** F-21, Abschnitt „Akzeptanzkriterien": „Scheitert die Erzeugung, erscheint ein Hinweis, und
	 * die Anwendung bleibt bedienbar." Wortlaut ist eine Festlegung dieses Test-Agenten (in den
	 * Quellen nicht vorgegeben, siehe Abschlussbericht), analog zum Muster von NoticeBar.svelte
	 * (F-23: `role="status"`). */
	let pngExportError = $state('');

	async function exportAsPng(scale: PngScale): Promise<void> {
		pngExportError = '';
		pngExporting = scale;
		try {
			await withFullMapView(async () => {
				const svgEl = currentMapSvg();
				if (!svgEl) return;
				await downloadPng(svgEl, {
					scale,
					theme: svgExportTheme,
					transparent: pngTransparentBackground
				});
			});
		} catch {
			pngExportError = 'Der PNG-Export ist fehlgeschlagen. Bitte erneut versuchen.';
		} finally {
			pngExporting = null;
		}
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
			<!-- F-22, Abschnitt „Umfang", Zeile „Kopfband": „Nur Symbole, seltener Gebrauchtes im
				Überlaufmenü" (UI-17: „Die Toolbar reduziert sich auf Icons mit Overflow-Menü").
				Unter 768 px blendet app.css (.icon-label) den Wortlaut nur visuell aus (dieselbe
				sr-only-Technik wie üblich: Position/Clip statt display:none), NICHT aus dem
				Accessibility-Baum — der zugängliche Name des Knopfs bleibt deshalb exakt der
				bisherige Wortlaut ("+ Feature", "Importieren", "Verzeichnis", "Ansicht"), .icon-label
				enthält ihn deshalb ungekürzt; getByRole('button', { name: … }) trifft dadurch
				unverändert, bei jeder Breite (kein zweiter, separater aria-label nötig). Das
				dekorative Symbol (.icon) daneben ist aria-hidden, trägt also nichts zum Namen bei.
				Das „Überlaufmenü" für seltener Gebrauchtes besteht bereits: die Menüs „Ansicht"
				(Ganze Karte zeigen/Zurücksetzen/Zeichenerklärung) und „Exportieren" (Textformat, SVG,
				PNG-Optionen) fassen genau die selten benötigten Aktionen zusammen, während
				„+ Feature", „Importieren" und „Verzeichnis" als für AK-16 unmittelbar nötige
				Kernaktionen direkt erreichbar bleiben (Icons statt Untermenü) — dieselbe Aufteilung,
				die bereits vor F-22 bestand, jetzt nur als Icon statt als Wortlaut dargestellt. -->
			<button type="button" class="btn pri" onclick={openCreateModal}>
				<span class="icon" aria-hidden="true">+</span>
				<span class="icon-label">+ Feature</span>
			</button>
			<button type="button" class="btn" onclick={openImportDialog}>
				<span class="icon" aria-hidden="true">↓</span>
				<span class="icon-label">Importieren</span>
			</button>
			<button
				type="button"
				class="btn dir-toggle"
				aria-pressed={directoryOpen}
				onclick={toggleDirectory}
			>
				<span class="icon" aria-hidden="true">≡</span>
				<span class="icon-label">Verzeichnis</span>
			</button>
			<div class="view-menu">
				<button
					type="button"
					class="btn"
					aria-haspopup="true"
					aria-expanded={viewMenuOpen}
					onclick={toggleViewMenu}
				>
					<span class="icon" aria-hidden="true">⤢</span>
					<span class="icon-label">Ansicht</span>
				</button>
				{#if viewMenuOpen}
					<div class="view-menu-panel cartouche">
						<button type="button" onclick={showWholeMap}> Ganze Karte zeigen </button>
						<button type="button" onclick={openResetConfirm}>Karte zurücksetzen</button>
						<!-- F-26, Abschnitt „Umfang": „Erreichbar über das Menü Ansicht ▾ (Eintrag
							Einstellungen, PRD 6.1)". -->
						<button type="button" onclick={openSettingsDialog}>Einstellungen</button>
						<!-- F-22, Abschnitt „Umfang", Zeile „Zeichenerklärung": unter 1080 px
							ausgeblendet, hierüber erreichbar. -->
						<button type="button" aria-pressed={legendForced} onclick={toggleLegendForced}>
							Zeichenerklärung
						</button>
						<!-- F-24, Abschnitt „Darstellung": „Zweiter, unabhängiger Umschalter
							Abdunkeln/Ausblenden neben dem Umschalter nur direkte/transitiv aus F-11,
							gleiche Bauart." Bleibt das Menü nach dem Umschalten offen — anders als bei
							„Zeichenerklärung" oben — weil es sich, wie der Tafel-/Hintergrund-Umschalter im
							Menü „Exportieren", um einen dauerhaften Schalter handelt, nicht um eine
							einmalige Aktion. -->
						<span class="sw" role="group" aria-label="Sichtbarkeit nicht beteiligter Elemente">
							<button
								type="button"
								aria-pressed={$highlightVisibility === 'dim'}
								onclick={() => highlightVisibility.set('dim')}
							>
								Abdunkeln
							</button>
							<button
								type="button"
								aria-pressed={$highlightVisibility === 'hide'}
								onclick={() => highlightVisibility.set('hide')}
							>
								Ausblenden
							</button>
						</span>
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
					<!-- F-22, UI-17: Icon statt Wortlaut unter 768 px, siehe Kommentar bei "+ Feature"
						oben. -->
					<span class="icon" aria-hidden="true">↑</span>
					<span class="icon-label">Exportieren</span>
				</button>
				{#if exportMenuOpen}
					<div class="view-menu-panel cartouche">
						<button type="button" onclick={openExportAsText}>Als Text</button>
						<!-- F-20, Abschnitt „Umfang": „Standardtafel für den Export ist Tag … Im Menü
							Exportieren steht dafür ein Umschalter Tafel: Tag / Nacht." Eigener, von der
							Kopfband-Tafel unabhängiger Umschalter, siehe Kommentar bei svgExportTheme. -->
						<span class="sw export-theme-sw" role="group" aria-label="Tafel für den Bildexport">
							<button
								type="button"
								aria-pressed={svgExportTheme === 'light'}
								onclick={() => (svgExportTheme = 'light')}
							>
								Tag
							</button>
							<button
								type="button"
								aria-pressed={svgExportTheme === 'dark'}
								onclick={() => (svgExportTheme = 'dark')}
							>
								Nacht
							</button>
						</span>
						<button type="button" onclick={exportAsSvg}>Als SVG</button>
						<!-- F-21, Abschnitt „Umfang": „Das Menü Exportieren → Als Bild bietet den Faktor
							als drei Knöpfe (1×, 2×, 4×), einen Schalter Hintergrund: weiß / transparent und
							den Tafelumschalter aus F-20" — der Tafelumschalter oben (svgExportTheme) wird
							unverändert mitverwendet, kein zweiter Umschalter für dieselbe Sache
							(features/README.md, Leitplanke 3). Siehe Abschlussbericht, Entscheidung 1. -->
						<p class="lbl">Als Bild</p>
						<span class="sw png-bg-sw" role="group" aria-label="Hintergrund für den Bildexport">
							<button
								type="button"
								aria-pressed={!pngTransparentBackground}
								onclick={() => (pngTransparentBackground = false)}
							>
								weiß
							</button>
							<button
								type="button"
								aria-pressed={pngTransparentBackground}
								onclick={() => (pngTransparentBackground = true)}
							>
								transparent
							</button>
						</span>
						<span class="sw png-scale-sw" role="group" aria-label="Auflösung des Bildexports">
							{#each PNG_SCALES as scale (scale)}
								<button
									type="button"
									data-testid={`png-export-${scale}x`}
									disabled={pngExporting !== null}
									onclick={() => exportAsPng(scale)}
								>
									{pngExporting === scale ? 'Wird erzeugt …' : `${scale}×`}
								</button>
							{/each}
						</span>
						{#if pngExportError}
							<p class="png-export-error" role="status" data-testid="png-export-error">
								{pngExportError}
							</p>
						{/if}
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
		<NoticeBar />
		<MapCanvas map={$map} {domainMax} {legendForced} onContextMenu={openContextMenu} />
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

	<StatusBar />

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
			onShowWholeMap={() => resetViewport(domainMax)}
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

	{#if settingsOpen}
		<!-- F-26, Abschnitt "Umfang": Einstellungsdialog, geöffnet über "Ansicht → Einstellungen". -->
		<SettingsDialog open={settingsOpen} onClose={closeSettingsDialog} />
	{/if}

	{#if resetConfirmOpen}
		<!-- F-23, Abschnitt "Umfang", FR-75: Rückfrage vor "Karte zurücksetzen", nennt die Anzahl
			der Features und weist auf den Export als Sicherung hin. -->
		<dialog
			bind:this={resetConfirmEl}
			class="confirm cartouche"
			role="alertdialog"
			aria-labelledby="reset-confirm-title"
			aria-describedby="reset-confirm-text"
			onclose={closeResetConfirm}
			onkeydown={handleResetConfirmKeydown}
		>
			<div class="confirm-body">
				<h2 id="reset-confirm-title">Karte zurücksetzen</h2>
				<p id="reset-confirm-text">
					Die Karte enthält {$map.features.length} {featureWord($map.features.length)}. Alle
					Features und Beziehungen werden dauerhaft gelöscht — sichern Sie den Bestand vorher über
					Exportieren.
				</p>
				<div class="confirm-actions">
					<button type="button" class="btn" onclick={closeResetConfirm}>Abbrechen</button>
					<button type="button" class="btn pri" onclick={confirmReset}>Zurücksetzen</button>
				</div>
			</div>
		</dialog>
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

	/* F-23, FR-75: Rückfrage vor "Karte zurücksetzen" — dieselbe Kartusche wie die
	   Löschrückfragen aus F-14/F-15 (features/STATUS.md, Entscheidung vom 06.09. zu FR-05). */
	.confirm {
		padding: 0;
		margin: auto;
		width: min(90vw, 400px);
		color: var(--ink);
	}
	.confirm::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.confirm-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 18px 20px 20px;
	}
	.confirm-body h2 {
		margin: 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 19px;
		letter-spacing: 0.005em;
	}
	.confirm-body p {
		margin: 0;
		font-size: 13.5px;
	}
	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 6px;
		border-top: 1px solid var(--hair);
	}

	/* F-21, Abschnitt „Umfang": Beschriftung des Bildexport-Abschnitts im Menü „Exportieren"
	   (dasselbe Panel wie „Als Text"/„Als SVG", .view-menu-panel aus src/app.css). Kein eigenes
	   .lbl-Vorbild dort (nur `.scope .lbl` für das Kopfband, andere Herkunft) — hier an dieselbe
	   dezente Zwischenüberschriften-Optik angelehnt wie sonst im Menü, nur mit Token aus
	   src/app.css. Bewusst unter `.view-menu-panel` genestet, nicht als bloßes `.lbl`: Svelte
	   scoped Styles wirken klassenbasiert auf JEDES `.lbl`-Element dieser Komponente, auch die
	   Kopfband-Beschriftungen „Hervorhebung"/„Tafel" in `.scope .lbl` — ein ungenesteter Zusatz
	   hätte deren Breite mitverändert und bei 834px zum horizontalen Wrap des Kopfbands geführt
	   (CLAUDE.md, QA-Abgleich: Breakpoint 834px). */
	.view-menu-panel .lbl {
		margin: 8px 10px 2px;
		padding: 0;
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}

	/* F-21-AK: „Scheitert die Erzeugung, erscheint ein Hinweis." Dieselbe Warnfarbe wie
	   StatusBar.svelte (.warn, F-23: „Speicher voll") statt eines neuen Farbbezugs. */
	.png-export-error {
		margin: 4px 10px 8px;
		padding: 0;
		font-size: 12px;
		color: var(--magenta);
	}
</style>
