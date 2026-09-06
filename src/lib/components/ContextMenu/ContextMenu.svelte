<!--
	ContextMenu (F-16 · features/F-16-verbindungsvorgang.md, Abschnitt "Umfang").

	Kontextmenü an der Zeigerposition (FR-10): Rechtsklick auf ein Feature bietet "Als Start
	verwenden", "Als Ziel verwenden", "Bearbeiten", "Löschen" (F-16, Abschnitt "Ablauf" Schritt 1;
	PRD FR-11, FR-40); Rechtsklick auf freie Fläche bietet "Ganze Karte zeigen" und "Feature
	anlegen" (F-16, Absatz nach "Fachregeln": "Das Kontextmenü ersetzt das Browser-Kontextmenü
	über der Karte; auf freier Fläche bietet es 'Ganze Karte zeigen' und 'Feature anlegen'").
	Ersetzt in beiden Fällen das native Browser-Kontextmenü (`event.preventDefault()` beim
	auslösenden `contextmenu`-Ereignis, Aufgabe des Aufrufers — diese Komponente bekommt bereits
	die fertige Zeigerposition `x`/`y` übergeben und weiß nichts vom auslösenden Ereignis selbst).

	Rolle `menu` mit Einträgen der Rolle `menuitem` (design/README.md nennt für das Kontextmenü
	noch keinen fertigen Entwurf — "noch zu entwerfen; die Bausteine dafür — Rahmen, Kartusche,
	Panel — stehen ... bereits fest" —, deshalb hier über Rolle/Text zugänglich statt über ein
	Mockup nachgebaut). Zugänglicher Name des Menüs "Feature-Menü" auf einem Feature, "Kartenmenü"
	auf freier Fläche (e2e/F-16-verbindungsvorgang.spec.ts). Schließt bei ESC, bei Klick daneben
	und beim Scrollen (F-16, derselbe Absatz); Einträge sind mit den Pfeiltasten erreichbar
	(Pfeil-Auf/-Ab wandert zwischen den Einträgen, mit Umbruch am Rand). Trefferflächen mindestens
	44 × 44 px (UI-16).

	"Als Start verwenden" und "Als Ziel verwenden" setzen direkt connectSource bzw. connectTarget
	(src/lib/store/selection.ts) — genau wie der bereits bestehende Knopf "Als Start verwenden"
	in DetailCartouche.svelte (F-15) und "Beziehung anlegen" in FeatureList.svelte (F-14) es tun;
	diese Komponente führt hier keinen zweiten Mechanismus für dieselbe Aktion ein
	(features/README.md, Leitplanke 3). "Als Ziel verwenden" ist auf dem aktuell gesetzten
	Startfeature deaktiviert (INT-03, F-16-AK: "'Als Ziel verwenden' ist auf dem Startfeature
	nicht auswählbar"). "Löschen" ruft deleteFeature (src/lib/store/mapStore.ts) auf; besteht
	mindestens eine Beziehung, ist dieselbe Rückfrage zuständig, die bereits in
	DetailCartouche.svelte entschieden wurde (FR-05, features/STATUS.md, Entscheidung vom 06.09.
	zu FR-05) — kein zweites Bestätigungsmuster.

	Rumpf ist Aufgabe des Feature-Agenten.
-->
<script module lang="ts">
	import type { FeatureId } from '../../model/types';

	/** Ziel des Menüs: ein bestimmtes Feature (Rechtsklick auf dessen Signatur) oder freie
	 * Fläche (Rechtsklick auf die Kartenfläche selbst, F-16, Abschnitt nach "Fachregeln"). */
	export type ContextMenuTarget = { kind: 'feature'; id: FeatureId } | { kind: 'blank' };
</script>

<script lang="ts">
	let {
		x,
		y,
		target,
		onClose,
		onEdit,
		onCreateFeature,
		onShowWholeMap
	}: {
		/** Bildschirmposition, an der das Menü erscheint (F-16, Ablauf Schritt 1: "an der
		 * Zeigerposition"). */
		x: number;
		y: number;
		target: ContextMenuTarget;
		/** Schließt das Menü: ESC, Klick daneben, Scrollen, nach jeder ausgeführten Aktion. */
		onClose: () => void;
		/** "Bearbeiten" auf einem Feature — öffnet das vorbefüllte Formular aus F-13 für dieses
		 * Feature (unabhängig davon, ob es zuvor bereits selektiert war). */
		onEdit: (id: FeatureId) => void;
		/** "Feature anlegen" auf freier Fläche — öffnet dasselbe Formular aus F-13 im
		 * Anlegemodus wie der Kopfband-Knopf "+ Feature". */
		onCreateFeature: () => void;
		/** "Ganze Karte zeigen" auf freier Fläche — derselbe Vorgang wie im Menü "Ansicht"
		 * (F-12, resetViewport() aus src/lib/store/viewport.ts). */
		onShowWholeMap: () => void;
	} = $props();
</script>
