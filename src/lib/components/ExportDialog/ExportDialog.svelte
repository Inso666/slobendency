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
	import type { FeatureMap } from '../../model/types';

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
</script>
