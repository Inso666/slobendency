<!--
	Startseite: dreiteiliges Grundgerüst (Kopfband, Kartenfläche, Fußleiste) nach
	features/F-01-projektgeruest.md und design/03-seekarte.html.

	Kartendarstellung, Verzeichnis, Kartuschen und Aktionen (+ Feature, Importieren, …) sind
	nicht Teil dieses Features und folgen in späteren Features (F-08 ff.). Hier wird nur das
	Raster hergestellt und die Tafelumschaltung bedient.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { initTheme, theme, type Theme } from '$lib/store/theme';

	onMount(() => {
		initTheme();
	});

	function chooseTheme(value: Theme): void {
		theme.set(value);
	}
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

	<main class="chart"></main>

	<footer class="foot"></footer>
</div>
