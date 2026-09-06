<!--
	RelationDialog (F-16 · features/F-16-verbindungsvorgang.md, Abschnitt "Umfang").

	Öffnet sich, sobald über das Kontextmenü (ContextMenu.svelte) Start und Ziel eines
	Verbindungsvorgangs gesetzt sind (F-16, Ablauf Schritt 3, PRD FR-12): Auswahl der
	Beziehungsart über drei Knöpfe mit Signatur und Namen ("benötigt" / "hängt zusammen" /
	"schließt aus" — dieselbe Beschriftung wie in RelationRow.svelte aus F-13, features/README.md
	Ubiquitous Language), optionale Beschriftung, "Anlegen" und "Abbrechen" (F-16, Ablauf Schritt
	3). `from`/`to` liegen beim Öffnen bereits fest (durch die vorangegangenen Rechtsklicks) und
	sind in diesem Dialog nicht mehr änderbar — anders als im Beziehungs-Abschnitt des
	Feature-Formulars (F-13), das Ziel und Art in einer Zeile zusammen wählen lässt.

	"Anlegen" ruft createRelation (src/lib/store/mapStore.ts) auf, das INT-02 bis INT-04 sowie
	die Feldregeln für Kantenbeschriftungen prüft — diese Komponente prüft nichts davon selbst
	(features/README.md, Leitplanke 3). Scheitert der Aufruf (INT-03, INT-04), erscheint die
	Meldung unverändert im Dialog, der Dialog bleibt offen (F-16, Ablauf Schritt 4: "Verstöße
	gegen INT-03 und INT-04 erscheinen im Dialog; der Vorgang bleibt offen, bis er gelingt oder
	abgebrochen wird"). Gelingt der Aufruf — auch wenn die neue `requires`-Kante einen Zyklus
	schließt (INT-05, wird angelegt statt abgelehnt) —, ruft der Dialog `onCreated()` auf; die
	sichtbare Zyklus-Warnung selbst ist F-23, nicht Teil dieser Komponente (F-16, Abschnitt
	"Nicht Teil dieses Features").

	Rolle `dialog`, zugänglicher Name "Beziehung anlegen" (design/README.md: noch kein fertiger
	Entwurf für dieses Dialogfenster, deshalb wie ContextMenu.svelte über Rolle/Text zugänglich,
	nach demselben `<dialog class="cartouche">`-Muster wie FeatureModal.svelte, F-13).

	Rumpf ist Aufgabe des Feature-Agenten.
-->
<script lang="ts">
	import type { FeatureId } from '../../model/types';

	let {
		open,
		from,
		to,
		onCreated,
		onCancel
	}: {
		open: boolean;
		/** Startfeature des Verbindungsvorgangs (F-16, Ablauf Schritt 2), beim Öffnen bereits
		 * feststehend. */
		from: FeatureId;
		/** Zielfeature, über "Als Ziel verwenden" gewählt (F-16, Ablauf Schritt 3), beim Öffnen
		 * bereits feststehend. */
		to: FeatureId;
		/** Ruft createRelation auf; bei Erfolg ruft der Dialog selbst `onCreated()` auf, das den
		 * Vorgang beendet (cancelConnection() aus src/lib/store/selection.ts) und den Dialog
		 * schließt. Bei INT-03/INT-04-Verstößen bleibt der Dialog offen (Abschnitt oben). */
		onCreated: () => void;
		/** "Abbrechen" im Dialog sowie ESC und Klick auf den Hintergrund (F-16, Abschnitt
		 * "Abbruch") — bricht den gesamten Verbindungsvorgang ab, nicht nur den Dialog. */
		onCancel: () => void;
	} = $props();
</script>
