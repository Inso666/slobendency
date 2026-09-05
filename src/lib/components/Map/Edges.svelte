<!--
	F-10 · Kanten und Signaturenkatalog (features/F-10-kanten.md, Abschnitt „Umfang").

	Zeichnet die drei Beziehungsarten (`requires`, `relates`, `excludes`) anhand der Geometrie
	aus src/lib/layout/edges.ts, dazu Vorbedingungsring und Durchstreichung an den betroffenen
	Zielen. Signatur ist vom Test-Agenten vorgegeben; Inhalt ist Aufgabe des Feature-Agenten.
-->
<script lang="ts">
	import type { FeatureMap } from '../../model/types';
	import type { Placement } from '../../layout/jitter';

	let { map, placements }: { map: FeatureMap; placements: Placement[] } = $props();
</script>
