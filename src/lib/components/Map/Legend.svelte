<!--
	F-10 · Kanten und Signaturenkatalog (features/F-10-kanten.md, Abschnitt „Umfang").

	Zeichenerklärung als Kartusche unten rechts über der Karte: die vier Einträge „benötigt",
	„hängt zusammen", „schließt aus" und „Vorbedingung" mit ihren Musterlinien. Unter 1080 px
	Fensterbreite ausgeblendet (F-10, Abschnitt „Signaturenkatalog"). Signatur ist vom
	Test-Agenten vorgegeben; Inhalt ist Aufgabe des Feature-Agenten.

	Position, Breite und Musterlinien folgen design/03-seekarte.html (Klasse `.legend`, Einträge
	unter `.legend div`). Farben ausschließlich über Token aus src/app.css.
-->
<script lang="ts"></script>

<div class="legend cartouche" data-testid="legend">
	<h3>Zeichenerklärung</h3>

	<div data-testid="legend-requires">
		<svg viewBox="0 0 44 12" aria-hidden="true">
			<line class="s-ink" x1="0" y1="6" x2="36" y2="6" stroke-width="1.4" />
			<path class="f-ink" d="M36 3 L43 6 L36 9 Z" />
		</svg>
		benötigt
	</div>

	<div data-testid="legend-relates">
		<svg viewBox="0 0 44 12" aria-hidden="true">
			<line class="s-sea" x1="0" y1="6" x2="36" y2="6" stroke-width="1.4" stroke-dasharray="4 4" />
			<path class="f-sea" d="M36 3 L43 6 L36 9 Z" />
		</svg>
		hängt zusammen
	</div>

	<div data-testid="legend-excludes">
		<svg viewBox="0 0 44 12" aria-hidden="true">
			<line class="s-mag" x1="0" y1="6" x2="38" y2="6" stroke-width="1.4" />
			<line class="s-mag" x1="35" y1="2" x2="43" y2="10" stroke-width="1.4" />
			<line class="s-mag" x1="43" y1="2" x2="35" y2="10" stroke-width="1.4" />
		</svg>
		schließt aus
	</div>

	<div data-testid="legend-vorbedingung">
		<svg viewBox="0 0 44 12" aria-hidden="true">
			<circle class="f-ink" cx="12" cy="6" r="4" />
			<circle class="s-ink" cx="12" cy="6" r="8" fill="none" stroke-width="1" stroke-dasharray="2 3" />
		</svg>
		Vorbedingung
	</div>
</div>

<style>
	.legend {
		position: absolute;
		right: 26px;
		bottom: 26px;
		z-index: 4;
		width: 236px;
		padding: 13px 15px 14px;
	}
	.legend h3 {
		margin: 0 0 9px;
		font-family: 'Fraunces', serif;
		font-style: italic;
		font-size: 12px;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--ink-soft);
		font-weight: 600;
	}
	.legend div {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 3px 0;
		font-size: 12.5px;
	}
	.legend svg {
		width: 44px;
		height: 12px;
		flex: none;
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

	@media (max-width: 1080px) {
		.legend {
			display: none;
		}
	}
</style>
