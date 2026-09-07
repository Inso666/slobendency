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

	Rumpf ist Aufgabe des Feature-Agenten. Vorgegeben sind hier nur die Signatur und die von
	e2e/F-18-import.spec.ts erwarteten Kennzeichen:

	  Dialog: role="dialog", zugänglicher Name "Karte importieren" (ausgelöst über den Knopf
	          "Importieren" im Kopfband, design/03-seekarte.html)
	  import-file-input          das <input type="file" accept=".fmap,.txt">, unabhängig von
	                              seiner Sichtbarkeit ansprechbar (Knopf "Datei wählen" davor)
	  import-preview             Container der Vorschau bei fehlerfreiem Text
	  import-preview-row-<id>    eine Zeile der Feature-Vorschau (höchstens acht)
	  import-error-<line>        ein Eintrag der Fehlerliste (Zeilennummer, Originalzeile,
	                              Meldung)
	  import-error-line-<line>   der anklickbare Zeilennummer-Knopf eines Fehlereintrags,
	                              springt im Textfeld an die betroffene Stelle

	Rückfrage: role="alertdialog", zugänglicher Name "Bestehende Karte ersetzen?", Knöpfe
	"Ersetzen" und "Abbrechen" — dasselbe Muster wie die Löschrückfrage aus F-14/F-15
	(features/STATUS.md, Entscheidungen des Orchestrators zu FR-05), hier für FR-62 auf die
	dort bereits im Wortlaut vorgegebene Frage angewendet.
-->
<script lang="ts">
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
</script>
