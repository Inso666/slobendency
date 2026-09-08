<!--
	ExportDialog (F-19 · features/F-19-export-dsl.md, Abschnitt „Umfang").

	Zeigt die Karte als DSL-Text (serialize() aus src/lib/dsl/serializer.ts, F-06) in einem
	schreibgeschützten Textfeld in Azeret Mono, mit Bildlauf und erhaltenen Zeilenumbrüchen. Zwei
	Knöpfe: „In Zwischenablage kopieren" (Clipboard-API; Erfolg zwei Sekunden lang als „Kopiert" am
	Knopf gemeldet; scheitert der Zugriff, wird der Text markiert und ein Hinweis auf das manuelle
	Kopieren gezeigt statt eines Fehlers) und „Als .fmap-Datei herunterladen" (Dateiname und
	Inhalt über exportFile.ts, F-19, Abschnitt „Umfang"). Fußnote in `--ink-soft`: „Kommentare aus
	einem importierten Dokument werden nicht mit exportiert."

	Diese Komponente ruft serialize() auf und kümmert sich um Zwischenablage und Download — beides
	Infrastruktur, die nicht in die Domäne gehört (F-19, Abschnitt „DDD-Einordnung"). Sie prüft
	keine Fachregeln.

	Rolle `dialog`, zugänglicher Name „Als Text" — derselbe Wortlaut wie der Menüeintrag im
	Kopfband, über den dieser Dialog geöffnet wird (F-19: „aus dem Kopfband über Exportieren → Als
	Text geöffnet"; design/README.md: noch kein fertiger Entwurf für dieses Dialogfenster, deshalb
	wie RelationDialog.svelte, F-16, über Rolle/Text zugänglich, nach demselben
	`<dialog class="cartouche">`-Muster wie FeatureModal.svelte, F-13). Entscheidung dieses
	Test-Agenten, siehe Abschlussbericht.

	`open` folgt demselben Muster wie FeatureModal.svelte (F-13) und RelationDialog.svelte (F-16):
	der Aufrufer hält die Komponente nur gemountet, solange `open` gilt.

	Rumpf ist Aufgabe des Feature-Agenten.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { FeatureMap } from '../../model/types';
	import { exportFileContent, exportFilename } from './exportFile';

	let {
		open,
		map,
		onClose
	}: {
		open: boolean;
		/** Karte, deren serialize()-Ergebnis angezeigt, kopiert und heruntergeladen wird. */
		map: FeatureMap;
		/** Schließt den Dialog (ESC, Klick auf den Hintergrund) — dasselbe Muster wie
		 * RelationDialog.svelte onCancel (F-16). */
		onClose: () => void;
	} = $props();

	// Text und Inhaltstyp stehen fest, sobald der Dialog mit einer Karte geöffnet wird — derselbe
	// Aufrufer hält die Komponente nur gemountet, solange `open` gilt (Kommentar am Dateianfang),
	// eine erneute Karte bedeutet also stets ein Neu-Mounten (AK-04: zweimaliges Öffnen ohne
	// zwischenzeitliche Änderung liefert identischen Text).
	const { content, mimeType } = exportFileContent(map);
	const filename = exportFilename(new Date());

	let dialogEl: HTMLDialogElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	/** True für zwei Sekunden nach erfolgreichem Kopieren (F-19, Abschnitt „Umfang": „Erfolg wird
	 * für zwei Sekunden am Knopf gemeldet (Kopiert)"). */
	let copied = $state(false);
	/** Sichtbar, sobald der Zugriff auf die Zwischenablage gescheitert ist (F-19-AK: „erscheint
	 * ein Hinweis statt eines Fehlers"). */
	let manualHintVisible = $state(false);
	let copyResetTimeout: ReturnType<typeof setTimeout> | undefined;

	onMount(() => {
		dialogEl?.showModal();
	});

	/** Knopf „In Zwischenablage kopieren" (F-19, Abschnitt „Umfang"). Scheitert der Zugriff (z. B.
	 * fehlende Berechtigung), wird kein Fehler geworfen, sondern der Text markiert und ein
	 * Hinweis auf das manuelle Kopieren gezeigt (F-19-AK). */
	async function handleCopyClick(): Promise<void> {
		try {
			await navigator.clipboard.writeText(content);
			manualHintVisible = false;
			copied = true;
			if (copyResetTimeout) clearTimeout(copyResetTimeout);
			copyResetTimeout = setTimeout(() => {
				copied = false;
			}, 2000);
		} catch {
			copied = false;
			manualHintVisible = true;
			textareaEl?.focus();
			textareaEl?.select();
		}
	}

	/** Knopf „Als .fmap-Datei herunterladen" (F-19, Abschnitt „Umfang"). Zwischenablage und
	 * Download sind Infrastruktur, die nicht in die Domäne gehört (F-19, Abschnitt
	 * „DDD-Einordnung") — der Inhalt selbst kommt unverändert aus exportFile.ts. */
	function handleDownloadClick(): void {
		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
	}

	/** Klick auf den Hintergrund (dasselbe Muster wie FeatureModal.svelte, F-13): das native
	 * `<dialog>` liefert dabei ein Click-Event mit `target === dialogEl`, weil der sichtbare
	 * Inhalt in einem Kind-Element liegt. */
	function handleDialogClick(event: MouseEvent): void {
		if (event.target === dialogEl) dialogEl?.close();
	}

	/** Läuft bei jedem Schließen — ESC (Standardverhalten des `<dialog>`) und Klick auf den
	 * Hintergrund — und ist der einzige Rückkanal zum Aufrufer. */
	function handleDialogClose(): void {
		onClose();
	}
</script>

{#if open}
	<dialog
		bind:this={dialogEl}
		class="export-dialog cartouche"
		role="dialog"
		aria-labelledby="export-dialog-title"
		onclick={handleDialogClick}
		onclose={handleDialogClose}
	>
		<h2 id="export-dialog-title">Als Text</h2>

		<textarea bind:this={textareaEl} class="mono export-text" readonly>{content}</textarea>

		{#if manualHintVisible}
			<p class="manual-hint" data-testid="export-copy-manual-hint">
				Kopieren nicht möglich — der Text ist markiert, bitte manuell mit Strg+C (bzw. Cmd+C)
				kopieren.
			</p>
		{/if}

		<p class="footnote">
			Kommentare aus einem importierten Dokument werden nicht mit exportiert.
		</p>

		<div class="actions">
			<button
				type="button"
				class="btn"
				data-testid="export-copy-button"
				onclick={handleCopyClick}
			>
				{copied ? 'Kopiert' : 'In Zwischenablage kopieren'}
			</button>
			<button type="button" class="btn pri" onclick={handleDownloadClick}>
				Als .fmap-Datei herunterladen
			</button>
		</div>
	</dialog>
{/if}

<style>
	.export-dialog {
		padding: 0;
		margin: auto;
		width: min(92vw, 560px);
		max-height: 86vh;
		overflow: auto;
		color: var(--ink);
	}
	.export-dialog::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.export-dialog h2 {
		margin: 0;
		padding: 18px 20px 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 19px;
	}
	.export-text {
		display: block;
		box-sizing: border-box;
		width: calc(100% - 40px);
		margin: 14px 20px 0;
		height: 240px;
		resize: none;
		overflow: auto;
		white-space: pre-wrap;
		word-break: break-word;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--hair);
		padding: 10px 11px;
	}
	.export-text:focus-visible {
		border-color: var(--ink);
	}
	.manual-hint {
		margin: 10px 20px 0;
		font-size: 12px;
		color: var(--magenta);
	}
	.footnote {
		margin: 12px 20px 0;
		font-size: 12px;
		color: var(--ink-soft);
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding: 16px 20px 20px;
		margin-top: 14px;
		border-top: 1px solid var(--hair);
	}

	@media (max-width: 768px) {
		.export-dialog {
			width: 100vw;
			max-width: none;
			height: 100vh;
			max-height: none;
			margin: 0;
			inset: 0;
		}
	}
</style>
