<!--
	Startseite: dreiteiliges Grundgerüst (Kopfband, Kartenfläche, Fußleiste) nach
	features/F-01-projektgeruest.md und design/03-seekarte.html.

	Die Karte selbst (Skalen, Raster, Reviere) kommt aus F-08. Verzeichnis, Kartuschen und
	weitere Aktionen (+ Feature, Importieren, …) sind nicht Teil dieses Features und folgen in
	späteren Features.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme, theme, type Theme } from '$lib/store/theme';
	import { initPersistence } from '$lib/store/persistence';
	import { map } from '$lib/store/mapStore';
	import { domainMaxOf } from '$lib/layout/scales';
	import MapCanvas from '$lib/components/Map/MapCanvas.svelte';

	// Synchron beim Aufbau der Komponente, nicht in onMount: FR-72 verlangt, dass der
	// gespeicherte Bestand vor dem ersten Rendern der Karte wiederhergestellt ist.
	initPersistence();

	onMount(() => {
		initTheme();
	});

	function chooseTheme(value: Theme): void {
		theme.set(value);
	}

	let domainMax = $derived(domainMaxOf($map));
</script>

<div class="app">
	<header class="ribbon">
		<div class="title">
			<b>Feature Map</b>
			<span>Blatt 1 · Impact / Effort</span>
		</div>
		<div class="scope">
			<span class="lbl">Tafel</span>
			<span class="sw" role="group" aria-label="Farbtafel">
				<button type="button" aria-pressed={$theme === 'light'} onclick={() => chooseTheme('light')}>
					Tag
				</button>
				<button type="button" aria-pressed={$theme === 'dark'} onclick={() => chooseTheme('dark')}>
					Nacht
				</button>
			</span>
		</div>
	</header>

	<main class="chart">
		<MapCanvas {domainMax} />
	</main>

	<footer class="foot"></footer>
</div>
