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

	Darstellung als Overlay über der Karte nach design/03-seekarte.html, Abschnitt ".index":
	298 px breit (unter 1080 px 250 px, design/03-seekarte.html, @media max-width:1080px),
	Trennlinie in --rule, Titel "Verzeichnis" in Fraunces, Suchfeld mit unterer Haarlinie statt
	Rahmen und Platzhalter "Label oder ID suchen", Gruppenüberschriften in Fraunces kursiv
	gesperrt, Einträge mit Punktführung (`border-bottom: 1px dotted`) und Lotung in Azeret Mono;
	der Eintrag des selektierten Features ist mit --shallow hinterlegt und halbfett (Klasse
	`.entry.here` im Entwurf).

	Rumpf ist Aufgabe des Feature-Agenten. Data-testid, die er rendern muss, stehen im
	Abschlussbericht des Test-Agenten und als Kommentar in e2e/F-14-verzeichnis.spec.ts:
	`directory-group-<quadrant>` je Reviergruppe und `directory-row-<id>` je Eintrag (englische
	Quadrant-Schlüssel wie im Domänenmodell: quickWins, grosseVorhaben, nebenbei, vermeiden).
	Alles andere wird über Rolle/Text angesprochen: das Panel als Landmark `role="complementary"`
	mit barrierefreiem Namen "Verzeichnis", das Suchfeld über seinen Platzhalter "Label oder ID
	suchen", die Sortierauswahl über `getByRole('combobox', { name: 'Sortierung' })` mit den
	Optionen "Anzeigename" / "Nutzen" / "Aufwand" (Designentscheidung dieses Test-Agenten, da
	weder PRD noch Entwurf ein konkretes Bedienelement für FR-53 vorgeben — siehe Abschlussbericht
	des Test-Agenten), die Zeilenaktionen über ihren Text "Bearbeiten" / "Löschen" / "Beziehung
	anlegen", jeweils innerhalb des passenden `directory-row-<id>` gesucht, weil sich der Wortlaut
	über alle Zeilen wiederholt.
-->
<script lang="ts">
	let {
		open,
		onClose
	}: {
		open: boolean;
		onClose: () => void;
	} = $props();
</script>
