<!--
	ImportDialog (F-18 · features/F-18-import.md, Abschnitt "Umfang").

	Textfeld zum Einfügen sowie Datei-Upload (.fmap/.txt) mit Vorschau der Parse-Ergebnisse vor
	der Übernahme (FR-61). Interpretiert den eingefügten Text nicht selbst, sondern ruft
	`parse()` (F-05, src/lib/dsl/parser.ts) über `evaluateImportText()`
	(src/lib/components/ImportDialog/importPreview.ts) auf und zeigt entweder die Vorschau
	("n Features · m Beziehungen" samt den ersten acht Features mit Lotung) oder die
	vollständige, zeilengenaue Fehlerliste (DSL-01, DSL-03). Bei vorhandenem Bestand fragt die
	Übernahme über `replaceNeedsConfirmation()` zurück ("Bestehende Karte ersetzen?", FR-62);
	bei leerem Bestand ersetzt sie direkt. Übernommen wird über `loadMap()`
	(src/lib/store/mapStore.ts), das Selektion und Verbindungsvorgang selbst aufhebt.

	Aufbau, Rahmen und Kartuschen-Optik folgen demselben Muster wie FeatureModal.svelte (F-13)
	und RelationDialog.svelte (F-16): natives `<dialog class="cartouche">`, geöffnet über
	`showModal()`, geschlossen über ESC, Klick auf den Hintergrund, "Abbrechen" oder nach
	erfolgreicher Übernahme — alle vier Fälle laufen über denselben Rückkanal `onClose`, weil der
	Aufrufer sie nicht unterscheidet (Signatur unten). Ein pixelgenauer Entwurf für die
	Import-Vorschau selbst fehlt (design/README.md, Abschnitt "Offen, unabhängig von der
	Richtung": "Import-Vorschau (FR-61) ... noch zu entwerfen; die Bausteine dafür — Rahmen,
	Kartusche, Panel — stehen ... bereits fest") — die Vorschauzeilen übernehmen deshalb Aufbau
	und Beschriftung unverändert von FeatureListRow.svelte (F-14: Anzeigename, Punktführung,
	Lotung in Azeret Mono über `displayNameOf()`), statt ein zweites Zeilenmuster zu erfinden
	(features/README.md, Leitplanke 3 sinngemäß auch für Darstellung). Die Rückfrage vor dem
	Ersetzen ist derselbe `role="alertdialog"`-Aufbau wie die Löschrückfrage aus F-14/F-15
	(features/STATUS.md, Entscheidungen des Orchestrators zu FR-05), hier auf FR-62 angewendet.

	Data-testid (siehe e2e/F-18-import.spec.ts, Kommentar am Dateianfang):
	  Dialog: role="dialog", zugänglicher Name "Karte importieren" (ausgelöst über den Knopf
	          "Importieren" im Kopfband, design/03-seekarte.html Zeile 223)
	  import-file-input          das <input type="file" accept=".fmap,.txt">, unabhängig von
	                              seiner Sichtbarkeit ansprechbar (Knopf "Datei wählen" davor)
	  import-preview             Container der Vorschau bei fehlerfreiem Text
	  import-preview-row-<id>    eine Zeile der Feature-Vorschau (höchstens acht)
	  import-error-<line>        ein Eintrag der Fehlerliste (Zeilennummer, Originalzeile,
	                              Meldung)
	  import-error-line-<line>   der anklickbare Zeilennummer-Knopf eines Fehlereintrags,
	                              springt im Textfeld an die betroffene Stelle

	Rückfrage: role="alertdialog", zugänglicher Name "Bestehende Karte ersetzen?", Knöpfe
	"Ersetzen" und "Abbrechen".
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { FeatureMap } from '../../model/types';
	import { loadMap, map } from '../../store/mapStore';
	import { resetViewport } from '../../store/viewport';
	import { domainMaxOf } from '../../layout/scales';
	import { displayNameOf } from '../FeatureList/listing';
	import { evaluateImportText, replaceNeedsConfirmation } from './importPreview';

	let {
		open,
		onClose
	}: {
		/** Sichtbarkeit des Dialogs — dasselbe Muster wie FeatureModal.svelte (F-13) und
		 * RelationDialog.svelte (F-16): der Aufrufer hält die Komponente nur gemountet, solange
		 * `open` gilt. */
		open: boolean;
		/** ESC, Klick auf den Hintergrund, "Abbrechen" sowie nach erfolgreicher Übernahme
		 * (F-18, Abschnitt "Verhalten": "Übernahme erfolgt → Dialog schließt"). Der Aufrufer
		 * unterscheidet Erfolg und Abbruch nicht — beide Fälle schließen nur den Dialog, alles
		 * andere (Selektion, Verbindungsvorgang, Persistenz, Ausschnitt) regelt diese Komponente
		 * selbst über die aufgerufenen Kommandos. */
		onClose: () => void;
	} = $props();

	/** Platzhalter mit dem Kopfzeilen-Beispiel (F-18, Abschnitt "Umfang"). */
	const PLACEHOLDER = [
		'featuremap v1',
		'Login["Benutzer-Login"] :: impact=8, effort=3',
		'SSO["Single Sign-On"]   :: impact=5, effort=13',
		'SSO --> Login'
	].join('\n');

	let text = $state('');
	/** Vorschau- bzw. Fehlerzustand des aktuellen Textfeldinhalts (importPreview.ts). */
	let preview = $derived(evaluateImportText(text));

	let dialogEl: HTMLDialogElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let fileInputEl: HTMLInputElement | undefined = $state();

	/** Gültig geparste Karte, die nach Bestätigung der Rückfrage übernommen wird (FR-62) —
	 * gesetzt, solange die Rückfrage offen ist, sonst `null`. */
	let pendingMap = $state<FeatureMap | null>(null);
	let confirmEl: HTMLDialogElement | undefined = $state();

	onMount(() => {
		dialogEl?.showModal();
	});

	$effect(() => {
		if (pendingMap && confirmEl && !confirmEl.open) confirmEl.showModal();
	});

	function featuresLabel(count: number): string {
		return `${count} ${count === 1 ? 'Feature' : 'Features'}`;
	}

	function relationsLabel(count: number): string {
		return `${count} ${count === 1 ? 'Beziehung' : 'Beziehungen'}`;
	}

	/** Zeichenindex des Zeilenanfangs (1-basiert wie ParseError.line) innerhalb des Textfelds
	 * (F-18, Abschnitt "Umfang": "Die Zeilennummer ist anklickbar und springt im Textfeld an die
	 * Stelle"). Das Textfeld normalisiert Zeilenumbrüche selbst auf "\n". */
	function lineStartIndex(source: string, line: number): number {
		const lines = source.split('\n');
		let index = 0;
		for (let i = 0; i < line - 1; i += 1) {
			index += lines[i].length + 1;
		}
		return index;
	}

	function jumpToLine(line: number): void {
		if (!textareaEl) return;
		const index = lineStartIndex(text, line);
		textareaEl.focus();
		textareaEl.setSelectionRange(index, index);
	}

	function chooseFile(): void {
		fileInputEl?.click();
	}

	/** Übernimmt den Inhalt einer hochgeladenen .fmap-/.txt-Datei unverändert in das Textfeld,
	 * wo er vor der Übernahme noch bearbeitet werden kann (F-18, Abschnitt "Umfang"). */
	async function handleFileChange(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		text = await file.text();
		input.value = '';
	}

	/** Übernimmt eine geprüfte Karte (FR-61/FR-62): ersetzt den Bestand über `loadMap()`
	 * (hebt Selektion und Verbindungsvorgang selbst auf), setzt den Ausschnitt zurück (F-18,
	 * Abschnitt "Verhalten": "Nach der Übernahme wird der Ausschnitt zurückgesetzt") und schließt
	 * den Dialog. */
	function applyImport(next: FeatureMap): void {
		loadMap(next);
		resetViewport(domainMaxOf(next));
		dialogEl?.close();
	}

	/** "Übernehmen": bei nicht leerem Bestand öffnet sich zuerst die Rückfrage (FR-62); bei
	 * leerem Bestand wird direkt ersetzt (F-18, Abschnitt "Verhalten"). Bleibt ohne Wirkung, wenn
	 * der Text fehlerhaft ist (DSL-02) — der Knopf ist in diesem Fall bereits deaktiviert. */
	function handleSubmitClick(): void {
		if (preview.kind !== 'valid') return;
		if (replaceNeedsConfirmation($map)) {
			pendingMap = preview.map;
			return;
		}
		applyImport(preview.map);
	}

	function confirmReplace(): void {
		const next = pendingMap;
		confirmEl?.close();
		pendingMap = null;
		if (next) applyImport(next);
	}

	function cancelReplace(): void {
		confirmEl?.close();
		pendingMap = null;
	}

	function handleCancelClick(): void {
		dialogEl?.close();
	}

	/** Klick auf den Hintergrund — wie FeatureModal.svelte (F-13) und RelationDialog.svelte
	 * (F-16) liefert das native `<dialog>` dabei ein Click-Event mit `target === dialogEl`
	 * selbst, weil der sichtbare Inhalt in einem Kind-Element liegt. */
	function handleDialogClick(event: MouseEvent): void {
		if (event.target === dialogEl) dialogEl?.close();
	}

	/** Läuft bei jedem Schließen — ESC, Klick auf den Hintergrund, "Abbrechen" und nach
	 * erfolgreicher Übernahme — und ist der einzige Rückkanal zum Aufrufer (Kommentar am
	 * Dateianfang). */
	function handleDialogClose(): void {
		onClose();
	}
</script>

{#if open}
	<dialog
		bind:this={dialogEl}
		class="import-dialog cartouche"
		role="dialog"
		aria-labelledby="import-dialog-title"
		onclick={handleDialogClick}
		onclose={handleDialogClose}
	>
		<div class="body">
			<h2 id="import-dialog-title">Karte importieren</h2>

			<div class="field">
				<label for="import-text">Dokument</label>
				<textarea
					id="import-text"
					bind:this={textareaEl}
					bind:value={text}
					rows="10"
					spellcheck="false"
					placeholder={PLACEHOLDER}
				></textarea>
			</div>

			<div class="upload">
				<button type="button" class="btn" onclick={chooseFile}>Datei wählen</button>
				<input
					bind:this={fileInputEl}
					type="file"
					accept=".fmap,.txt"
					hidden
					data-testid="import-file-input"
					onchange={handleFileChange}
				/>
			</div>

			{#if preview.kind === 'valid'}
				<div class="preview" data-testid="import-preview">
					<p class="summary">
						{featuresLabel(preview.featureCount)} · {relationsLabel(preview.relationCount)}
					</p>
					{#if preview.preview.length > 0}
						<ul class="preview-list">
							{#each preview.preview as feature (feature.id)}
								<li data-testid="import-preview-row-{feature.id}">
									<span class="nm">{displayNameOf(feature)}</span>
									<span class="lead"></span>
									<span class="snd mono">{feature.impact} · {feature.effort}</span>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{:else if preview.kind === 'invalid'}
				<div class="errors" data-testid="import-errors">
					{#each preview.errors as error, index (index)}
						<div class="error-entry" data-testid="import-error-{error.line}">
							<button
								type="button"
								class="error-line mono"
								data-testid="import-error-line-{error.line}"
								onclick={() => jumpToLine(error.line)}
							>
								{error.line}
							</button>
							<div class="error-body">
								<p class="error-source mono">{error.source}</p>
								<p class="error-message">{error.message}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<div class="actions">
				<button type="button" class="btn" onclick={handleCancelClick}>Abbrechen</button>
				<button
					type="button"
					class="btn pri"
					disabled={preview.kind !== 'valid'}
					onclick={handleSubmitClick}
				>
					Übernehmen
				</button>
			</div>
		</div>
	</dialog>

	{#if pendingMap}
		<dialog
			bind:this={confirmEl}
			class="confirm cartouche"
			role="alertdialog"
			aria-labelledby="import-confirm-title"
			onclose={() => (pendingMap = null)}
		>
			<div class="confirm-body">
				<h2 id="import-confirm-title">Bestehende Karte ersetzen?</h2>
				<p>Der bestehende Bestand wird vollständig durch den importierten Text ersetzt.</p>
				<div class="confirm-actions">
					<button type="button" class="btn" onclick={cancelReplace}>Abbrechen</button>
					<button type="button" class="btn pri" onclick={confirmReplace}>Ersetzen</button>
				</div>
			</div>
		</dialog>
	{/if}
{/if}

<style>
	.import-dialog {
		padding: 0;
		margin: auto;
		width: min(92vw, 620px);
		max-height: 88vh;
		overflow: auto;
		color: var(--ink);
	}
	.import-dialog::backdrop {
		background: var(--ink);
		opacity: 0.32;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px 20px 20px;
	}
	.body h2 {
		margin: 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 19px;
		letter-spacing: 0.005em;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.field label {
		font-size: 10.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.field textarea {
		font-family: 'Azeret Mono', ui-monospace, monospace;
		font-size: 13px;
		line-height: 1.5;
		color: var(--ink);
		background: var(--paper);
		border: 1px solid var(--hair);
		padding: 10px 11px;
		resize: vertical;
		min-height: 160px;
	}
	.field textarea:focus-visible {
		border-color: var(--ink);
	}
	.field textarea::placeholder {
		color: var(--ink-soft);
	}
	.upload {
		display: flex;
	}

	/* Vorschau (FR-61): Zeilen übernehmen Aufbau und Lotung aus FeatureListRow.svelte (F-14),
	   siehe Kommentar am Dateianfang. */
	.preview {
		border-top: 1px solid var(--hair);
		padding-top: 12px;
	}
	.summary {
		margin: 0 0 8px;
		font-size: 13px;
		color: var(--ink-soft);
	}
	.preview-list {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 220px;
		overflow: auto;
	}
	.preview-list li {
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 4px 0;
		border-bottom: 1px dotted var(--hair);
	}
	.preview-list .nm {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.preview-list .lead {
		flex: 1;
		border-bottom: 1px dotted var(--hair);
		transform: translateY(-3px);
	}
	.preview-list .snd {
		font-size: 11.5px;
		color: var(--ink-soft);
		flex: none;
	}

	/* Fehlerliste (DSL-01, DSL-03): Zeilennummer in Azeret Mono, Originalzeile in --ink-soft,
	   darunter die Meldung (F-18, Abschnitt "Umfang"). */
	.errors {
		display: flex;
		flex-direction: column;
		gap: 10px;
		border-top: 1px solid var(--hair);
		padding-top: 12px;
		max-height: 260px;
		overflow: auto;
	}
	.error-entry {
		display: flex;
		gap: 10px;
	}
	.error-line {
		flex: none;
		align-self: flex-start;
		background: transparent;
		border: 1px solid var(--hair);
		color: var(--ink);
		min-width: 30px;
		padding: 2px 6px;
		font-size: 12px;
		cursor: pointer;
	}
	.error-line:hover {
		border-color: var(--ink);
	}
	.error-body {
		min-width: 0;
	}
	.error-source {
		margin: 0;
		font-size: 12.5px;
		color: var(--ink-soft);
		overflow-wrap: break-word;
	}
	.error-message {
		margin: 2px 0 0;
		font-size: 13px;
		color: var(--magenta);
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		padding-top: 6px;
		border-top: 1px solid var(--hair);
	}

	/* Rückfrage (FR-62) — dieselbe Kartusche wie die Löschrückfrage aus F-14/F-15. */
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

	@media (max-width: 768px) {
		.import-dialog {
			width: 100vw;
			max-width: none;
			height: 100vh;
			max-height: none;
			margin: 0;
			inset: 0;
		}
	}
</style>
