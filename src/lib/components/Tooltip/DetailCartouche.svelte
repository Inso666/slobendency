<!--
	F-15 · Detail-Kartusche (features/F-15-detail-kartusche.md, Abschnitt "Umfang").

	Gerahmte Kartusche oben rechts über der Karte zum selektierten Feature: Kopf (Anzeigename,
	Kennung), Lotung (Impact, Effort, Revier), "Geht aus von hier", "Führt hierher" und die
	Aktionen "Bearbeiten", "Als Start verwenden", "Löschen". Aufbau, Maße, Schriftrollen und
	Signaturen nach design/03-seekarte.html (Klassen `.detail`, `.sounding`, `.bearings`,
	`.detail .btns`, Rahmen aus `.cartouche`).

	Rumpf ist Aufgabe des Feature-Agenten. Vorgegeben sind hier nur die Signatur und die von
	e2e/F-15-detail-kartusche.spec.ts erwarteten Kennzeichen:

	  detail-cartouche              Behälter der Kartusche
	  detail-impact / -effort       Wert der jeweiligen Spalte der Lotung
	  detail-revier                 Name des Reviers (quadrantLabel, siehe detail.ts)
	  detail-outgoing               Abschnitt "Geht aus von hier"
	  detail-incoming               Abschnitt "Führt hierher"
	  bearing-<from>-<to>-<type>    eine Zeile in einem der beiden Abschnitte

	"Bearbeiten" ist der Knopf aus F-13, hierher übernommen statt danebengestellt
	(features/STATUS.md, Auflage zu F-15) — er darf auf der Seite nur einmal vorkommen.
-->
<script lang="ts">
	import type { Feature, FeatureMap } from '../../model/types';

	let {
		map,
		feature,
		domainMax,
		onEdit
	}: {
		/** Die aktive Karte — Quelle der Beziehungen (`relationsOf`, F-02). */
		map: FeatureMap;
		/** Das selektierte Feature (F-11 `selectedId`). */
		feature: Feature;
		/** Obergrenze des dargestellten Wertebereichs, für `quadrantOf` (F-15, Fachregeln). */
		domainMax: number;
		/** Öffnet das vorbefüllte Formular aus F-13. */
		onEdit: () => void;
	} = $props();
</script>
