<!--
	ScoreSelect (F-13 · features/F-13-feature-formular.md, Abschnitt "Umfang" und
	"Darstellung").

	Reihe gleich breiter Knöpfe für Nutzen bzw. Aufwand: die Schätzreihe FIBONACCI plus, bei
	einem abweichenden Wert, eine zusätzliche gekennzeichnete Option (scoreOptions.ts, PRD
	FR-02, FR-03). Der gewählte Wert erscheint in --ink mit Schrift in --paper, Zahlenwerte in
	Azeret Mono (Abschnitt "Darstellung"). `label` liefert die Beschriftung der Gruppe
	("Nutzen" / "Aufwand") und wird als aria-label der Knopfgruppe gerendert
	(e2e/F-13-feature-formular.spec.ts erwartet `getByRole('group', { name: label })`).

	Rumpf ist Aufgabe des Feature-Agenten. Data-testid: keiner — jede Option ist über ihren
	sichtbaren Zahlenwert eindeutig ansprechbar (`getByRole('button', { name: '5', exact: true
	})`), die abweichende Zusatzoption über ihren Text (z. B. "7 (abweichend)").
-->
<script lang="ts">
	let {
		label,
		value,
		onSelect
	}: {
		label: string;
		value: number;
		onSelect: (value: number) => void;
	} = $props();
</script>
