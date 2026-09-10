<!--
	StatusBar (F-23 · features/F-23-statuszeile.md, Abschnitt "Umfang").

	Fußleiste (`<footer class="foot">`, design/03-seekarte.html), von links nach rechts:
	Speicherzustand, Bestand (Feature-/Beziehungszahl), Zyklen-Hinweis, rechtsbündig der Kurs
	des selektierten Features. Liest ausschließlich vorhandene Stores (F-23, Abschnitt
	"DDD-Einordnung": "Die Fußleiste liest ausschließlich vorhandene Stores; sie berechnet
	nichts selbst.") — deshalb ohne Props, direkt aus src/lib/store/mapStore.ts (map,
	featureCount, relationCount), src/lib/store/selection.ts (selectedId) und
	src/lib/store/persistence.ts (storageState, lastSavedAt). Die Zyklenprüfung selbst kommt aus
	src/lib/graph/cycles.ts (findRequiresCycles, F-07) und läuft nach jeder Änderung an den
	Beziehungen, nicht bei jedem Rendern (F-23, Abschnitt "Fachregeln") — eine naheliegende
	Umsetzung ist ein von `map` abgeleiteter Store, der `findRequiresCycles` nur bei einer
	tatsächlichen Änderung von `map.relations` neu aufruft.

	Formatierung, Zustandsauswahl und Kursbildung sind als reine Funktionen in statusText.ts
	ausgelagert (wie listing.ts für F-14, detail.ts für F-15) und dort unit-getestet
	(statusText.test.ts); diese Komponente ruft sie nur mit den aktuellen Store-Werten auf.

	Speicherzustand (F-23, Abschnitt "Umfang", Zeile "Speicherzustand"; FR-70, FR-71, FR-74,
	NFR-31, NFR-32): saveStatusText() aus statusText.ts. persistence.ts (F-04, bereits gemergt)
	exportiert bislang kein Signal für "Bündelungsfrist läuft" — src/lib/store/persistence.ts
	muss dafür um einen entsprechenden Readable-Store erweitert werden (features/F-04-persistenz.md,
	Abschnitt "Nicht Teil dieses Features" weist die Anzeige ausdrücklich F-23 zu, ohne dass F-04
	dafür bereits ein Signal bereitstellt); statusText.ts bildet diesen Wert bereits als
	expliziten Parameter `saving` von `saveStatusText()` ab (siehe dortigen Kommentar).
	`saveStatusText().warning` steuert die Magenta-Färbung ("Speicher voll", NFR-31).

	Zyklen (INT-05, AK-08): cycleWarningText() aus statusText.ts. "Keine Zyklen" ist reiner Text,
	die Warnung ("n Zyklus-Warnung(en)") ein `<button>` (klickbar, tastaturerreichbar). Klick
	selektiert das erste Feature des ersten gefundenen Zyklus (`Cycle.path[0]`, bereits von
	`findRequiresCycles` auf den kleinsten Bezeichner rotiert, F-07) über `selectedId.set()` —
	die dadurch ausgelöste Hervorhebung seiner Kanten übernimmt bereits store/highlight.ts (F-11)
	unverändert. Die dauerhafte Magenta-Färbung der am Zyklus beteiligten requires-Kanten,
	unabhängig von der Selektion (F-23, Abschnitt "Umfang": "auf der Karte dauerhaft in
	--magenta gezeichnet, auch ohne Selektion"), ist dagegen eine Zeichenregel der Kanten selbst
	(Edges.svelte, F-10) und nicht Aufgabe dieser Komponente — Edges.svelte braucht dafür
	`isOnCycle()` (src/lib/graph/cycles.ts, F-07) und eine Möglichkeit, die aktuell gefundenen
	Zyklen zu erfahren (z. B. ein zusätzlicher Prop von MapCanvas.svelte, analog zu
	`placements`).

	Kurs (rechtsbündig, Fraunces kursiv, Klasse `.foot .r` aus src/app.css): courseText() aus
	statusText.ts mit `selectedId` aus store/selection.ts, leer ohne Selektion.

	Data-testid (siehe e2e/F-23-statuszeile.spec.ts, Kommentar am Dateianfang):
	  status-save        Speicherzustand-Feld
	  status-inventory   Bestand-Feld (Feature-/Beziehungszahl)
	  status-cycles      Zyklen-Feld (Text "Keine Zyklen" oder Knopf "n Zyklus-Warnung(en)")
	  status-course      Kurs-Feld

	Rumpf ist Aufgabe des Feature-Agenten. Vorgegeben sind hier nur die Absicht und die
	erwarteten Kennzeichen; die Komponente selbst nimmt keine Props entgegen.
-->
<script lang="ts"></script>
