// Selektionszustand und Verbindungsvorgang (F-03 · features/F-03-kartenstore.md, Abschnitt
// „Umfang"; erweitert um F-16 · features/F-16-verbindungsvorgang.md, Abschnitt
// „DDD-Einordnung": „Der Zwischenzustand (gesetzter Start ohne Ziel) ist Sitzungszustand in
// selection.ts und niemals Teil des Aggregats — eine halbe Beziehung darf im Modell nicht
// existieren."). Sitzungszustand der Oberfläche — bewusst kein Teil des Aggregats FeatureMap
// und wird nicht persistiert (F-03, Abschnitt „DDD-Einordnung").
//
// Signatur ist vom Test-Agenten vorgegeben. Der Rumpf von clearSelection() ist Aufgabe des
// Feature-Agenten. mapStore.ts hebt Selektion und Verbindungsvorgang zusätzlich bei
// deleteFeature, renameFeatureId und loadMap auf (F-03, Abschnitt „Fachregeln").
//
// F-16-Ergänzung (connectTarget, cancelConnection, handleEscape): "Als Start verwenden" setzt
// weiterhin unverändert direkt connectSource.set(id) (so bereits in DetailCartouche.svelte aus
// F-15 und FeatureList.svelte aus F-14 umgesetzt, F-16, Abschnitt "Ablauf" Schritt 2: "'Als
// Start verwenden' setzt connectSource"). connectTarget bildet die zusätzliche Zwischenstufe
// "Ziel gewählt, Dialog offen" ab (F-16, Ablauf Schritt 3), aus denselben Gründen wie
// connectSource kein Teil des Aggregats. cancelConnection() und handleEscape() sind die einzige
// neue Logik, die eine eigene Prüfung braucht (F-16, Abschnitt "Tests": "Zustandsmaschine des
// Vorgangs (leer → Start gesetzt → Dialog → angelegt beziehungsweise abgebrochen)"); das bloße
// Setzen von connectSource/connectTarget ist dagegen ein reiner Store-Zugriff ohne eigenen
// Rumpf, wie schon bei selectedId (kein Test-Agenten-Rumpf, kein Nachweis nötig).

import { get, writable, type Writable } from 'svelte/store';
import type { FeatureId } from '../model/types';

/** Kennung des aktuell selektierten Features, oder null ohne Selektion. */
export const selectedId: Writable<FeatureId | null> = writable(null);

/** Hervorhebungsmodus bei Selektion: nur direkte Nachbarn oder transitive
 * requires-Vorbedingungen (PRD FR-41, FR-42, FR-44). Startwert 'transitive'. */
export const highlightMode: Writable<'direct' | 'transitive'> = writable('transitive');

/** Startfeature eines laufenden Verbindungsvorgangs (PRD FR-11 bis FR-14), oder null ohne
 * laufenden Vorgang. */
export const connectSource: Writable<FeatureId | null> = writable(null);

/** Ziel eines laufenden Verbindungsvorgangs (F-16, Ablauf Schritt 3, FR-12), gesetzt sobald
 * "Als Ziel verwenden" auf einem zweiten Feature gewählt wurde — löst das Öffnen des
 * RelationDialog aus. null, solange nur der Start gesetzt ist oder kein Vorgang läuft. Wie
 * connectSource kein Teil des Aggregats: eine halbe Beziehung darf im Modell nicht existieren
 * (F-16, Abschnitt „DDD-Einordnung"). */
export const connectTarget: Writable<FeatureId | null> = writable(null);

/** Hebt Selektion und einen laufenden Verbindungsvorgang auf (PRD FR-13, FR-46). */
export function clearSelection(): void {
	selectedId.set(null);
	connectSource.set(null);
}

/**
 * Beendet einen laufenden Verbindungsvorgang — durch Abbruch (Knopf "Abbrechen" im Hinweisband
 * oder im Dialog, F-16 Abschnitt "Abbruch") ebenso wie nach erfolgreichem Anlegen der Beziehung
 * (F-16, Ablauf Schritt 5: "Nach dem Anlegen wird connectSource geleert"): leert Start und Ziel,
 * lässt selectedId und highlightMode unangetastet. Ohne laufenden Vorgang wirkungslos.
 */
export function cancelConnection(): void {
	connectSource.set(null);
	connectTarget.set(null);
}

/**
 * Reagiert auf ESC im Sinne von FR-13 und FR-46 (F-16, Abschnitt "Abbruch": "ESC — bricht
 * zuerst den Verbindungsvorgang ab, erst ein zweites ESC hebt die Selektion auf"): Läuft ein
 * Verbindungsvorgang (connectSource gesetzt, mit oder ohne bereits gewähltes connectTarget),
 * bricht der Aufruf ausschließlich ihn ab (wie cancelConnection()) und lässt die Selektion
 * unverändert. Läuft kein Vorgang, hebt derselbe Aufruf stattdessen die Selektion auf (wie
 * clearSelection()). Ein zweiter Aufruf ohne zwischenzeitlich neu gesetzten Start trifft damit
 * automatisch den zweiten Fall.
 */
export function handleEscape(): void {
	if (get(connectSource) !== null) {
		cancelConnection();
	} else {
		clearSelection();
	}
}
