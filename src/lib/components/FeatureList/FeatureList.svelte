<!--
	FeatureList (F-14 · features/F-14-verzeichnis.md, Abschnitt "Umfang").

	Ausklappbares Panel über der Karte, das alle Features durchsuchbar, sortierbar und nach
	Revieren gruppiert zeigt (FR-50 bis FR-53). Filter, Sortierung und Gruppierung laufen über
	die reinen Funktionen aus listing.ts; das Revier je Feature kommt unverändert aus
	quadrantOf() (F-02) und wird hier nicht neu berechnet (Abschnitt "DDD-Einordnung"). Ein Klick
	auf einen Eintrag selektiert das Feature (src/lib/store/selection.ts) und zentriert es
	(centerOn, src/lib/store/viewport.ts, F-12) — FR-54. Löschen ruft deleteFeature
	(src/lib/store/mapStore.ts) auf; bestehen Beziehungen, fragt es vorher zurück und nennt ihre
	Zahl (FR-05). "Beziehung anlegen" setzt das Feature als Start eines Verbindungsvorgangs
	(connectSource, src/lib/store/selection.ts) und schließt das Panel — der Verbindungsvorgang
	selbst ist F-16, nicht Teil dieses Features.

	Die Rückfrage vor dem Löschen ist ein Dialog in der Seite (`role="alertdialog"`, Name
	"Feature löschen") als Kartusche über die Token aus src/app.css, kein natives `confirm`:
	Entscheidung des Orchestrators, siehe features/STATUS.md, Abschnitt "Entscheidungen des
	Orchestrators", "Form der Rückfrage beim Löschen, FR-05". Wieviele Kanten betroffen sind,
	beantwortet relationsOf() aus dem Aggregat (F-02) — die Zahl wird hier nur angezeigt, nicht
	eigenständig hergeleitet (features/README.md, Leitplanke 3).

	Die Zahl der betroffenen Kanten wird ausschließlich für die Rückfrage gebraucht; das Löschen
	selbst entfernt die Kanten über das Aggregat (INT-02, AK-09) und nicht hier.

	Darstellung als Overlay über der Karte nach design/03-seekarte.html, Abschnitt ".index":
	298 px breit (unter 1080 px 250 px, design/03-seekarte.html, @media max-width:1080px),
	Trennlinie in --rule, Titel "Verzeichnis" in Fraunces, Suchfeld mit unterer Haarlinie statt
	Rahmen und Platzhalter "Label oder ID suchen", Gruppenüberschriften in Fraunces kursiv
	gesperrt, Einträge mit Punktführung (`border-bottom: 1px dotted`) und Lotung in Azeret Mono;
	der Eintrag des selektierten Features ist mit --shallow hinterlegt und halbfett (Klasse
	`.entry.here` im Entwurf).

	Data-testid: `directory-group-<quadrant>` je Reviergruppe und `directory-row-<id>` je Eintrag
	(FeatureListRow.svelte). Alles andere wird über Rolle/Text angesprochen: das Panel als
	Landmark `role="complementary"` mit barrierefreiem Namen "Verzeichnis", das Suchfeld über
	seinen Platzhalter "Label oder ID suchen", die Sortierauswahl über
	`getByRole('combobox', { name: 'Sortierung' })` mit den Optionen "Anzeigename" / "Nutzen" /
	"Aufwand" (Entscheidung des Orchestrators zu FR-53, siehe features/STATUS.md).
-->
<script lang="ts">
	import type { Feature, FeatureId } from '../../model/types';
	import { relationsOf } from '../../model/validation';
	import { deleteFeature, map } from '../../store/mapStore';
	import { connectSource, selectedId } from '../../store/selection';
	import { centerOn } from '../../store/viewport';
	import { domainMaxOf } from '../../layout/scales';
	import { placeFeatures } from '../../layout/jitter';
	import {
		displayNameOf,
		filterFeatures,
		groupByQuadrant,
		quadrantLabel,
		sortFeatures,
		sortLabel,
		SORT_ORDER,
		type SortKey
	} from './listing';
	import FeatureListRow from './FeatureListRow.svelte';

	/**
	 * `open` steuert die Sichtbarkeit (FR-50: standardmäßig eingeklappt, der Zustand liegt beim
	 * Kopfband). `onClose` klappt das Panel wieder ein, wenn eine Aktion es verlangt.
	 * `onEditFeature` reicht die Aktion "Bearbeiten" an den Aufrufer weiter, der das Formular aus
	 * F-13 besitzt — das Verzeichnis kennt kein Formular.
	 */
	let {
		open,
		onClose,
		onEditFeature
	}: {
		open: boolean;
		onClose: () => void;
		onEditFeature: (id: FeatureId) => void;
	} = $props();

	/** Anzeigezustand des Panels, kein Teil des Aggregats (F-14, Abschnitt "DDD-Einordnung"). */
	let query = $state('');
	/** Der Entwurf zeigt im Kopf "nach Impact" — die Vorauswahl ist deshalb der Nutzen. */
	let sortBy = $state<SortKey>('impact');

	let domainMax = $derived(domainMaxOf($map));
	let matches = $derived(filterFeatures($map.features, query));
	let groups = $derived(groupByQuadrant(sortFeatures(matches, sortBy), domainMax));

	let total = $derived($map.features.length);
	let filtering = $derived(query.trim() !== '');

	function featuresWord(count: number): string {
		return count === 1 ? 'Feature' : 'Features';
	}

	/** Kopfzeile nach dem Entwurf ("14 Features · nach Impact"): nennt immer die Gesamtzahl, bei
	 * aktivem Filter zusätzlich die Zahl der Treffer (F-14, Abschnitt "Verhalten"), dazu die
	 * aktive Sortierung. */
	let subtitle = $derived(
		(filtering
			? `${matches.length} von ${total} ${featuresWord(total)}`
			: `${total} ${featuresWord(total)}`) + ` · nach ${sortLabel(sortBy)}`
	);

	/** FR-54: Klick auf einen Eintrag selektiert das Feature auf der Karte und rückt es in die
	 * Mitte des Ausschnitts. Zentriert wird auf den tatsächlich gezeichneten Punkt aus
	 * placeFeatures() (F-09), nicht auf den unversetzten Ankerpunkt. */
	function selectRow(id: FeatureId): void {
		selectedId.set(id);
		const placement = placeFeatures($map, domainMax).find((candidate) => candidate.id === id);
		if (placement) centerOn(placement.x, placement.y);
	}

	/** FR-55/FR-04: Das Formular gehört F-13; das Verzeichnis selektiert nur und meldet den
	 * Wunsch nach oben. Das Panel klappt dabei ein, damit das modale Formular nicht über einer
	 * Liste steht, die es ohnehin verdeckt. */
	function editRow(id: FeatureId): void {
		selectedId.set(id);
		onEditFeature(id);
		onClose();
	}

	/** F-14, Abschnitt "Verhalten": setzt das Feature als Start des Verbindungsvorgangs (F-16)
	 * und schließt das Panel. */
	function connectRow(id: FeatureId): void {
		connectSource.set(id);
		onClose();
	}

	// FR-05: Rückfrage nur, wenn Beziehungen bestehen — sonst wird sofort gelöscht.
	let pendingFeature = $state<Feature | null>(null);
	let pendingRelationCount = $state(0);
	let confirmEl = $state<HTMLDialogElement | undefined>(undefined);

	function relationCountOf(id: FeatureId): number {
		const { outgoing, incoming } = relationsOf($map, id);
		return outgoing.length + incoming.length;
	}

	function deleteRow(id: FeatureId): void {
		const count = relationCountOf(id);
		if (count === 0) {
			deleteFeature(id);
			return;
		}
		pendingFeature = $map.features.find((feature) => feature.id === id) ?? null;
		pendingRelationCount = count;
	}

	$effect(() => {
		if (pendingFeature && confirmEl && !confirmEl.open) confirmEl.showModal();
	});

	function confirmDelete(): void {
		const id = pendingFeature?.id;
		confirmEl?.close();
		if (id) deleteFeature(id);
	}

	function cancelDelete(): void {
		confirmEl?.close();
	}

	/** Escape schließt die Rückfrage (Standardverhalten des `<dialog>`) und darf dabei nicht
	 * zusätzlich die Selektion auf der Karte aufheben — dieselbe Abgrenzung wie im Formular aus
	 * F-13 (MapCanvas.svelte hört global auf Escape, FR-46). */
	function handleConfirmKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') event.stopPropagation();
	}
</script>

{#if open}
	<!--
		`role="complementary"` ist am <aside> redundant (dessen implizite Rolle ist bereits
		„complementary") — hier trotzdem gesetzt, damit die Rolle unabhängig davon feststeht, in
		welchem Abschnitt der Seite das Panel später liegt.
	-->
	<aside class="index" role="complementary" aria-labelledby="directory-title">
		<header>
			<h2 id="directory-title">Verzeichnis</h2>
			<p>{subtitle}</p>
		</header>

		<div class="find">
			<input
				type="text"
				placeholder="Label oder ID suchen"
				aria-label="Features suchen"
				bind:value={query}
			/>
			<div class="sort">
				<label for="directory-sort">Sortierung</label>
				<select id="directory-sort" bind:value={sortBy}>
					{#each SORT_ORDER as key (key)}
						<option value={key}>{sortLabel(key)}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="list">
			{#each groups as group (group.quadrant)}
				<div data-testid="directory-group-{group.quadrant}">
					<div class="group">{quadrantLabel(group.quadrant)}</div>
					{#each group.features as feature (feature.id)}
						<FeatureListRow
							{feature}
							selected={feature.id === $selectedId}
							onSelect={selectRow}
							onEdit={editRow}
							onDelete={deleteRow}
							onConnect={connectRow}
						/>
					{/each}
				</div>
			{/each}
		</div>
	</aside>

	{#if pendingFeature}
		<dialog
			bind:this={confirmEl}
			class="confirm cartouche"
			role="alertdialog"
			aria-labelledby="delete-confirm-title"
			aria-describedby="delete-confirm-text"
			onclose={() => (pendingFeature = null)}
			onkeydown={handleConfirmKeydown}
		>
			<div class="confirm-body">
				<h2 id="delete-confirm-title">Feature löschen</h2>
				<p id="delete-confirm-text">
					{displayNameOf(pendingFeature)} hat {pendingRelationCount}
					{pendingRelationCount === 1 ? 'Beziehung' : 'Beziehungen'}. Beim Löschen des Features
					werden sie mit entfernt.
				</p>
				<div class="confirm-actions">
					<button type="button" class="btn" onclick={cancelDelete}>Abbrechen</button>
					<button type="button" class="btn pri" onclick={confirmDelete}>Löschen</button>
				</div>
			</div>
		</dialog>
	{/if}
{/if}

<style>
	/* design/03-seekarte.html, `.index`: Overlay am linken Rand der Kartenfläche (FR-50). */
	.index {
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: 298px;
		z-index: 5;
		background: var(--paper);
		border-right: 1px solid var(--rule);
		display: flex;
		flex-direction: column;
	}
	.index header {
		padding: 15px 16px 10px;
		border-bottom: 1px solid var(--hair);
	}
	.index h2 {
		margin: 0;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 16px;
		letter-spacing: 0.02em;
	}
	.index header p {
		margin: 2px 0 0;
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.find {
		padding: 11px 16px;
		border-bottom: 1px solid var(--hair);
	}
	.find input {
		width: 100%;
		border: 0;
		border-bottom: 1px solid var(--hair);
		background: transparent;
		padding: 5px 2px;
		font: inherit;
		font-size: 13px;
		color: inherit;
	}
	.find input::placeholder {
		color: var(--ink-soft);
	}
	.find input:focus {
		border-bottom-color: var(--ink);
		outline: 0;
	}
	/* Bedienelement zu FR-53. Der Entwurf zeigt keines; die Beschriftung folgt den gesperrten
	   Versalien der übrigen Feldbeschriftungen. */
	.sort {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 9px;
	}
	.sort label {
		font-size: 10.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}
	.sort select {
		flex: 1;
		min-width: 0;
		font: inherit;
		font-size: 12.5px;
		color: var(--ink);
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--hair);
		padding: 3px 2px;
	}
	.list {
		overflow: auto;
		flex: 1;
		padding: 6px 0 14px;
	}
	.group {
		padding: 12px 16px 4px;
		font-family: 'Fraunces', serif;
		font-style: italic;
		font-size: 12px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--ink-soft);
	}

	/* Rückfrage vor dem Löschen (FR-05) — dieselbe Kartusche wie das Formular aus F-13. */
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

	/* design/03-seekarte.html, @media max-width:1080px. */
	@media (max-width: 1080px) {
		.index {
			width: 250px;
		}
	}
	/* F-14, Abschnitt "Umfang": Unter 768 px wird das Panel zum Vollbild-Overlay. Der Feinschliff
	   der schmalen Darstellung (Bottom Sheet) ist F-22. */
	@media (max-width: 768px) {
		.index {
			right: 0;
			width: auto;
			border-right: 0;
		}
	}
</style>
