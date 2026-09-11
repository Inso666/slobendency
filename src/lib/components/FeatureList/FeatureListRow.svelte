<!--
	FeatureListRow (F-14 · features/F-14-verzeichnis.md, Abschnitt "Umfang").

	Ein Eintrag im Verzeichnis: Anzeigename (`label` ?? `id`, Ubiquitous Language), Punktführung
	und Lotung `impact · effort` in Azeret Mono (design/03-seekarte.html, `.entry`). Ist `selected`
	gesetzt, erhält der Eintrag den Hintergrund --shallow und halbfetten Namen (`.entry.here`).
	Die Aktionen "Bearbeiten", "Löschen" und "Beziehung anlegen" (FR-55) sind bei Hover und bei
	Tastaturfokus sichtbar (F-14, Abschnitt "Verhalten") und rufen ausschließlich die übergebenen
	Callbacks auf — welche Aggregatsoperation daraus folgt (deleteFeature, die Rückfrage nach
	FR-05, connectSource), entscheidet FeatureList.svelte, nicht diese Zeile.

	Der Eintrag selbst ist ein Knopf, nicht ein anklickbares `div`: nur so ist er mit der Tastatur
	erreichbar und auslösbar (F-14-AK "Alle Einträge und Aktionen sind mit der Tastatur
	erreichbar"), ohne ein eigenes Tastaturverhalten nachzubauen. Die drei Aktionen stehen als
	eigene Knöpfe daneben und halten ihren Klick auf, damit ein Klick auf "Löschen" nicht zugleich
	als Klick auf den Eintrag (Selektieren und Zentrieren) zählt. Sie tragen ein kurzes Zeichen und
	ihren Wortlaut als `aria-label`/`title`: der Entwurf hält für die Zeile 298 px vor, in denen
	drei ausgeschriebene Beschriftungen weder Platz haben noch die Punktführung übrig ließen, die
	der Entwurf für jeden Eintrag verlangt.

	Data-testid `directory-row-<id>` auf dem Zeilen-Container (Feature-Kennung, global eindeutig)
	— nötig, weil sich die Beschriftungen "Bearbeiten", "Löschen" und "Beziehung anlegen" über
	alle Zeilen wiederholen und ohne Container-Kennzeichen nicht eindeutig ansprechbar wären
	(e2e/F-14-verzeichnis.spec.ts).

	F-22 · Responsives Verhalten und Touch (features/F-22-responsiv.md, Abschnitt
	„Trefferflächen"; UI-16): Unter 768 px sind diese Aktionen mindestens 44 × 44 px groß statt
	22 × 22 px, und dauerhaft sichtbar statt nur bei Hover/Fokus — ein Touchgerät kennt keinen
	verlässlichen Hover-Zustand, ohne den die Aktionen dort sonst unerreichbar blieben (AK-16:
	„… bearbeiten, löschen … vollständig durchführen"). Die Zeile bricht dafür zweizeilig um
	(Name/Lotung oben, Aktionen darunter), weil daneben bei 375 px kein Platz für drei 44-px-Knöpfe
	neben der Punktführung bliebe.
-->
<script lang="ts">
	import type { Feature, FeatureId } from '../../model/types';
	import { displayNameOf } from './listing';

	let {
		feature,
		selected,
		onSelect,
		onEdit,
		onDelete,
		onConnect
	}: {
		feature: Feature;
		selected: boolean;
		onSelect: (id: FeatureId) => void;
		onEdit: (id: FeatureId) => void;
		onDelete: (id: FeatureId) => void;
		onConnect: (id: FeatureId) => void;
	} = $props();

	/** Lotung, Anzeigeform der Bewertung (features/README.md, Sprachtabelle; design
	 * `.entry .snd`). */
	let lotung = $derived(`${feature.impact} · ${feature.effort}`);
</script>

<div class="entry" class:here={selected} data-testid="directory-row-{feature.id}">
	<button type="button" class="pick" onclick={() => onSelect(feature.id)}>
		<span class="nm">{displayNameOf(feature)}</span>
		<span class="lead"></span>
		<span class="snd">{lotung}</span>
	</button>
	<span class="acts">
		<button
			type="button"
			aria-label="Bearbeiten"
			title="Bearbeiten"
			onclick={() => onEdit(feature.id)}>✎</button
		>
		<button
			type="button"
			aria-label="Löschen"
			title="Löschen"
			onclick={() => onDelete(feature.id)}>✕</button
		>
		<button
			type="button"
			aria-label="Beziehung anlegen"
			title="Beziehung anlegen"
			onclick={() => onConnect(feature.id)}>→</button
		>
	</span>
</div>

<style>
	/* design/03-seekarte.html, `.entry`: Zeile aus Name, Punktführung und Lotung. */
	.entry {
		position: relative;
		display: flex;
		align-items: baseline;
		padding: 5px 16px;
	}
	.entry:hover,
	.entry:focus-within {
		background: var(--hover);
	}
	.pick {
		flex: 1 1 auto;
		min-width: 0;
		display: flex;
		align-items: baseline;
		gap: 6px;
		padding: 0;
		background: transparent;
		border: 0;
		font: inherit;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.nm {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.lead {
		flex: 1;
		border-bottom: 1px dotted var(--hair);
		transform: translateY(-3px);
	}
	.snd {
		font-family: 'Azeret Mono', ui-monospace, monospace;
		font-variant-numeric: tabular-nums;
		font-size: 11.5px;
		color: var(--ink-soft);
		flex: none;
	}
	.entry.here {
		background: var(--shallow);
	}
	.entry.here .nm {
		font-weight: 600;
	}
	.entry.here .snd {
		color: var(--ink);
	}

	/* FR-55: Aktionen erscheinen bei Hover und bei Tastaturfokus. Sie liegen über dem rechten
	   Ende der Zeile, statt dort dauerhaft Platz zu belegen — sonst rückte die Lotung von der
	   rechten Kante ab, an der sie im Entwurf steht. Ihr Hintergrund ist deshalb der der Zeile. */
	.acts {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		gap: 1px;
		background: var(--hover);
		opacity: 0;
		transition: opacity 0.12s ease-out;
	}
	.entry.here .acts {
		background: var(--shallow);
	}
	.entry:hover .acts,
	.entry:focus-within .acts {
		opacity: 1;
	}
	.acts button {
		background: transparent;
		border: 1px solid transparent;
		color: var(--ink-soft);
		width: 22px;
		height: 22px;
		padding: 0;
		font-size: 12px;
		line-height: 1;
		cursor: pointer;
	}
	.acts button:hover {
		border-color: var(--hair);
		color: var(--ink);
	}

	/* F-22, Abschnitt „Trefferflächen"; UI-16: unter 768 px mindestens 44 × 44 px und dauerhaft
	   sichtbar statt hover-gebunden (Touchgeräte kennen keinen verlässlichen Hover-Zustand). Die
	   Zeile bricht dafür zweizeilig um, statt die Aktionen weiterhin über der Punktführung
	   schweben zu lassen — bei 375 px Breite ist dafür kein Platz. */
	@media (max-width: 768px) {
		.entry {
			flex-wrap: wrap;
			row-gap: 6px;
			padding: 8px 16px;
		}
		.pick {
			flex: 1 1 100%;
		}
		.acts {
			position: static;
			transform: none;
			flex: 1 1 100%;
			justify-content: flex-end;
			opacity: 1;
			background: transparent;
			gap: 8px;
		}
		.entry.here .acts {
			background: transparent;
		}
		.acts button {
			width: 44px;
			height: 44px;
			font-size: 15px;
			border: 1px solid var(--hair);
		}
	}
</style>
