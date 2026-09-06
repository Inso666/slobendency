<!--
	F-15 · Detail-Kartusche (features/F-15-detail-kartusche.md, Abschnitt "Umfang").

	Gerahmte Kartusche oben rechts über der Karte zum selektierten Feature: Kopf (Anzeigename,
	Kennung), Lotung (Impact, Effort, Revier), "Geht aus von hier", "Führt hierher" und die
	Aktionen "Bearbeiten", "Als Start verwenden", "Löschen". Aufbau, Maße, Schriftrollen und
	Signaturen nach design/03-seekarte.html (Klassen `.detail`, `.sounding`, `.bearings`,
	`.detail .btns`, Rahmen aus `.cartouche`).

	Liest den Selektionszustand indirekt über die Props `feature`/`map`/`domainMax`, die der
	Aufrufer (routes/+page.svelte) aus store/selection.ts und store/mapStore.ts ableitet — diese
	Komponente selbst kennt keinen Store direkt außer denen, die sie für ihre eigenen Aktionen
	braucht (selectedId zum Weiterspringen, connectSource für "Als Start verwenden", deleteFeature
	zum Löschen). Die Aufteilung der Beziehungen kommt aus detail.ts (`bearingsOf`), das Revier aus
	`quadrantOf` (F-02, src/lib/model/validation.ts) — beide Regeln werden hier nicht zweites Mal
	formuliert (features/README.md, Leitplanke 3).

	Rückfrage vor dem Löschen (FR-05, features/STATUS.md, Entscheidungen vom 06.09. zu FR-05 und
	zur Vereinheitlichung mit F-15): ein `role="alertdialog"` mit dem zugänglichen Namen
	"Feature löschen", als Kartusche über die Token aus src/app.css gerendert — kein
	`window.confirm()`, damit die Rückfrage Tag-/Nachttafel folgt und für Tests sichtbar ist.
	Besteht keine Beziehung, entfällt die Rückfrage (PRD FR-05: sie ist an bestehende Beziehungen
	geknüpft).

	Data-testid (siehe e2e/F-15-detail-kartusche.spec.ts, Kommentar am Dateianfang):
	  detail-cartouche              Behälter der Kartusche
	  detail-impact / -effort       Wert der jeweiligen Spalte der Lotung
	  detail-revier                 Name des Reviers (quadrantLabel, siehe detail.ts)
	  detail-outgoing               Abschnitt "Geht aus von hier"
	  detail-incoming               Abschnitt "Führt hierher"
	  bearing-<from>-<to>-<type>    eine Zeile in einem der beiden Abschnitte

	"Bearbeiten" ist der Knopf aus F-13, hierher übernommen statt danebengestellt
	(features/STATUS.md, Auflage zu F-15) — er darf auf der Seite nur einmal vorkommen. Der
	Aufrufer (routes/+page.svelte) reicht dafür `onEdit` durch, das dasselbe Formular öffnet, das
	zuvor der Kopfband-Knopf öffnete.
-->
<script lang="ts">
	import type { Feature, FeatureMap } from '../../model/types';
	import { bearingsOf, quadrantLabel } from './detail';
	import { quadrantOf } from '../../model/validation';
	import { connectSource, selectedId } from '../../store/selection';
	import { deleteFeature } from '../../store/mapStore';

	let {
		map,
		feature,
		domainMax,
		onEdit
	}: {
		/** Die aktive Karte — Quelle der Beziehungen (`relationsOf`, F-02). */
		map: FeatureMap;
		/** Das selektierte Feature (F-11 `selectedId`). */
		feature: Feature;
		/** Obergrenze des dargestellten Wertebereichs, für `quadrantOf` (F-15, Fachregeln). */
		domainMax: number;
		/** Öffnet das vorbefüllte Formular aus F-13. */
		onEdit: () => void;
	} = $props();

	let displayName = $derived(feature.label ?? feature.id);
	let bearings = $derived(bearingsOf(map, feature.id));
	let revier = $derived(quadrantLabel(quadrantOf(feature, domainMax)));
	let hasBearings = $derived(bearings.outgoing.length > 0 || bearings.incoming.length > 0);
	let affectedCount = $derived(bearings.outgoing.length + bearings.incoming.length);

	/** Steuert die Löschrückfrage (FR-05). Immer im DOM vorhanden, aber ohne `open`-Attribut
	 * unsichtbar und außerhalb des Accessibility-Baums, solange `deleteConfirmOpen` false ist
	 * (natives Verhalten von `<dialog>`, ebenso genutzt in FeatureModal.svelte, F-13). */
	let deleteConfirmOpen = $state(false);
	let confirmDialogEl: HTMLDialogElement | undefined;

	$effect(() => {
		if (deleteConfirmOpen) {
			confirmDialogEl?.showModal();
		} else {
			confirmDialogEl?.close();
		}
	});

	/** Klick auf ein Beziehungsziel selektiert dieses Feature (F-15, Abschnitt "Verhalten"). */
	function selectCounterpart(id: string): void {
		selectedId.set(id);
	}

	function handleEditClick(): void {
		onEdit();
	}

	/** "Als Start verwenden" setzt den Startpunkt des Verbindungsvorgangs (F-16); die sichtbare
	 * Markierung darüber hinaus ist F-16, nicht F-15 (features/F-15-detail-kartusche.md,
	 * Abschnitt "Nicht Teil dieses Features"). */
	function handleStartClick(): void {
		connectSource.set(feature.id);
	}

	/** PRD FR-05: Bestehen Beziehungen, erfolgt eine Rückfrage mit deren Anzahl; sonst wird
	 * direkt gelöscht. */
	function handleDeleteClick(): void {
		if (affectedCount > 0) {
			deleteConfirmOpen = true;
		} else {
			deleteFeature(feature.id);
		}
	}

	function confirmDelete(): void {
		deleteConfirmOpen = false;
		deleteFeature(feature.id);
	}

	function cancelDelete(): void {
		deleteConfirmOpen = false;
	}

	/** Läuft auch bei ESC, das native `<dialog>` schließt sich dabei selbst. */
	function handleConfirmDialogClose(): void {
		deleteConfirmOpen = false;
	}
</script>

<div class="detail cartouche" data-testid="detail-cartouche">
	<div class="hd">
		<h3>{displayName}</h3>
		<div class="sub mono">{feature.id}</div>
	</div>

	<div class="sounding">
		<div>
			<u>Impact</u>
			<b data-testid="detail-impact">{feature.impact}</b>
		</div>
		<div>
			<u>Effort</u>
			<b data-testid="detail-effort">{feature.effort}</b>
		</div>
		<div>
			<u>Revier</u>
			<b class="revier" data-testid="detail-revier">{revier}</b>
		</div>
	</div>

	{#if hasBearings}
		{#if bearings.outgoing.length > 0}
			<div class="bearings" data-testid="detail-outgoing">
				<h4>Geht aus von hier</h4>
				<ul>
					{#each bearings.outgoing as bearing (bearing.counterpartId + '·' + bearing.type)}
						<li data-testid="bearing-{feature.id}-{bearing.counterpartId}-{bearing.type}">
							<svg viewBox="0 0 26 10" aria-hidden="true">
								{#if bearing.type === 'requires'}
									<line class="s-ink" x1="0" y1="5" x2="19" y2="5" stroke-width="1.4" />
									<path class="f-ink" d="M19 2 L25 5 L19 8 Z" />
								{:else if bearing.type === 'relates'}
									<line
										class="s-sea"
										x1="0"
										y1="5"
										x2="19"
										y2="5"
										stroke-width="1.4"
										stroke-dasharray="4 4"
									/>
									<path class="f-sea" d="M19 2 L25 5 L19 8 Z" />
								{:else}
									<line class="s-mag" x1="0" y1="5" x2="20" y2="5" stroke-width="1.4" />
									<line class="s-mag" x1="18" y1="1" x2="25" y2="9" stroke-width="1.4" />
									<line class="s-mag" x1="25" y1="1" x2="18" y2="9" stroke-width="1.4" />
								{/if}
							</svg>
							<button type="button" onclick={() => selectCounterpart(bearing.counterpartId)}>
								{bearing.name}{#if bearing.label}<small> · {bearing.label}</small>{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if bearings.incoming.length > 0}
			<div class="bearings" data-testid="detail-incoming">
				<h4>Führt hierher</h4>
				<ul>
					{#each bearings.incoming as bearing (bearing.counterpartId + '·' + bearing.type)}
						<li data-testid="bearing-{bearing.counterpartId}-{feature.id}-{bearing.type}">
							<svg viewBox="0 0 26 10" aria-hidden="true">
								{#if bearing.type === 'requires'}
									<line class="s-ink" x1="6" y1="5" x2="25" y2="5" stroke-width="1.4" />
									<path class="f-ink" d="M7 2 L1 5 L7 8 Z" />
								{:else if bearing.type === 'relates'}
									<line
										class="s-sea"
										x1="6"
										y1="5"
										x2="25"
										y2="5"
										stroke-width="1.4"
										stroke-dasharray="4 4"
									/>
									<path class="f-sea" d="M7 2 L1 5 L7 8 Z" />
								{:else}
									<line class="s-mag" x1="6" y1="5" x2="26" y2="5" stroke-width="1.4" />
									<line class="s-mag" x1="8" y1="1" x2="1" y2="9" stroke-width="1.4" />
									<line class="s-mag" x1="1" y1="1" x2="8" y2="9" stroke-width="1.4" />
								{/if}
							</svg>
							<button type="button" onclick={() => selectCounterpart(bearing.counterpartId)}>
								{bearing.name}{#if bearing.label}<small> · {bearing.label}</small>{/if}
							</button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{:else}
		<p class="no-bearings">Keine Beziehungen</p>
	{/if}

	<div class="btns">
		<button type="button" onclick={handleEditClick}>Bearbeiten</button>
		<button type="button" onclick={handleStartClick}>Als Start verwenden</button>
		<button type="button" class="rm" onclick={handleDeleteClick}>Löschen</button>
	</div>
</div>

<dialog
	bind:this={confirmDialogEl}
	class="confirm-delete cartouche"
	role="alertdialog"
	aria-labelledby="confirm-delete-title"
	onclose={handleConfirmDialogClose}
>
	<h3 id="confirm-delete-title">Feature löschen</h3>
	<p>
		„{displayName}" hat {affectedCount}
		{affectedCount === 1 ? 'Beziehung' : 'Beziehungen'}. Sie werden mit gelöscht.
	</p>
	<div class="btns">
		<button type="button" onclick={cancelDelete}>Abbrechen</button>
		<button type="button" class="rm" onclick={confirmDelete}>Löschen</button>
	</div>
</dialog>

<style>
	.detail {
		position: absolute;
		right: 26px;
		top: 26px;
		z-index: 6;
		width: 300px;
	}
	.detail .hd {
		padding: 13px 16px 11px;
		border-bottom: 1px solid var(--hair);
	}
	.detail h3 {
		margin: 0;
		font-family: 'Fraunces', serif;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: 0.005em;
	}
	.detail .sub {
		font-size: 11.5px;
		color: var(--ink-soft);
		letter-spacing: 0.06em;
	}

	.sounding {
		display: flex;
		border-bottom: 1px solid var(--hair);
	}
	.sounding div {
		flex: 1;
		padding: 10px 16px;
	}
	.sounding div + div {
		border-left: 1px solid var(--hair);
	}
	.sounding u {
		display: block;
		text-decoration: none;
		font-size: 10px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.sounding b {
		font-family: 'Fraunces', serif;
		font-size: 23px;
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.sounding b.revier {
		font-size: 15px;
	}

	.bearings {
		padding: 11px 16px;
		border-bottom: 1px solid var(--hair);
	}
	.bearings h4 {
		margin: 0 0 6px;
		font-family: 'Fraunces', serif;
		font-style: italic;
		font-size: 11px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--ink-soft);
		font-weight: 600;
	}
	.bearings ul {
		margin: 0;
		padding: 0;
	}
	.bearings li {
		list-style: none;
		display: flex;
		gap: 9px;
		align-items: baseline;
		padding: 3px 0;
		font-size: 13px;
	}
	.bearings svg {
		width: 26px;
		height: 10px;
		flex: none;
		transform: translateY(-2px);
	}
	.bearings small {
		color: var(--ink-soft);
	}
	.bearings button {
		background: transparent;
		border: 0;
		margin: 0;
		padding: 0;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.bearings button:hover {
		text-decoration: underline;
	}

	.no-bearings {
		margin: 0;
		padding: 11px 16px;
		font-size: 13px;
		color: var(--ink-soft);
	}

	.detail .btns {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		padding: 11px 16px;
	}
	.detail .btns button {
		border: 1px solid var(--hair);
		background: transparent;
		padding: 6px 10px;
		font-size: 12.5px;
		cursor: pointer;
	}
	.detail .btns button:hover {
		border-color: var(--ink);
	}
	.detail .btns .rm {
		color: var(--magenta);
	}

	.s-ink {
		stroke: var(--ink);
	}
	.f-ink {
		fill: var(--ink);
	}
	.s-sea {
		stroke: var(--sea);
	}
	.f-sea {
		fill: var(--sea);
	}
	.s-mag {
		stroke: var(--magenta);
	}

	/* Rückfrage vor dem Löschen (FR-05). Eigene Kartusche, zentriert wie FeatureModal.svelte
	   (F-13), aber deutlich kleiner — sie trägt nur einen Satz und zwei Knöpfe. */
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

	/* UI-15: Unter 768 px wird die Kartusche zum Bottom Sheet über die volle Breite — das ist
	   laut F-15, Abschnitt "Verhalten", der Umsetzung in F-22 vorbehalten. Hier wird nur
	   verhindert, dass die 300-px-Breite die Seite waagerecht überlaufen lässt (CLAUDE.md,
	   QA-Abgleich: kein horizontales Scrollen bei 375 px). */
	@media (max-width: 768px) {
		.detail {
			right: 16px;
			top: 16px;
			width: 270px;
		}
	}
</style>
