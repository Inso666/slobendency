// DSL-Tokenizer (F-05 · features/F-05-dsl-parser.md, Abschnitt „Umfang").
//
// Zerlegt eine einzelne Zeile eines DSL-Dokuments (PRD 4.2) in Marken und behält deren
// Spaltenposition (1-basiert). Kennt nur die Lexik der Grammatik, keine Fachregeln: Länge,
// Zeichensatz einer Kennung oder Wertebereiche von impact/effort prüft nicht der Tokenizer,
// sondern die Domäne (features/README.md, Leitplanke 3) — der Tokenizer liefert dafür nur
// Roh-Marken. Frameworkfrei — keine Svelte-, $app- oder DOM-Bezüge (Leitplanke 1).

/** Art einer Marke innerhalb einer DSL-Zeile. */
export type TokenType = 'word' | 'string' | 'arrow' | 'punct' | 'unknown';

/** Eine einzelne Marke mit ihrer 1-basierten Spaltenposition in der Originalzeile. */
export interface Token {
	type: TokenType;
	value: string;
	column: number;
}

const ARROW_LITERALS = ['-.->', '-->', '--x'] as const;
const PUNCT_CHARS = new Set(['[', ']', ',', '=', '|']);
const WORD_CHAR = /[A-Za-z0-9_-]/;

/** Zerlegt eine einzelne Zeile (ohne Zeilenumbruch) in eine Folge von Marken. */
export function tokenizeLine(line: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	const { length } = line;

	while (i < length) {
		const ch = line[i];

		// Whitespace zwischen Marken ist beliebig und bedeutungslos (DSL-08).
		if (ch === ' ' || ch === '\t') {
			i += 1;
			continue;
		}

		// Quoted string — quoted_string = '"', { any_char_except_quote }, '"'.
		if (ch === '"') {
			const start = i;
			const closing = line.indexOf('"', i + 1);
			if (closing === -1) {
				// Unterminiert: Rest der Zeile als offene Zeichenkette, der Parser meldet
				// den fehlenden Abschluss als Syntaxfehler.
				tokens.push({ type: 'string', value: line.slice(i + 1), column: start + 1 });
				i = length;
				continue;
			}
			tokens.push({ type: 'string', value: line.slice(i + 1, closing), column: start + 1 });
			i = closing + 1;
			continue;
		}

		// Pfeile vor generischen Wortmarken prüfen, da "-" sowohl Pfeil- als auch
		// Kennungszeichen ist (PRD 4.3).
		const arrow = ARROW_LITERALS.find((literal) => line.startsWith(literal, i));
		if (arrow) {
			tokens.push({ type: 'arrow', value: arrow, column: i + 1 });
			i += arrow.length;
			continue;
		}

		// "::" ist eine eigene, zweistellige Marke (feature_def-Trenner).
		if (line.startsWith('::', i)) {
			tokens.push({ type: 'punct', value: '::', column: i + 1 });
			i += 2;
			continue;
		}

		if (PUNCT_CHARS.has(ch)) {
			tokens.push({ type: 'punct', value: ch, column: i + 1 });
			i += 1;
			continue;
		}

		// Wortmarke: läuft, solange die Zeichen zu einer Kennung/Zahl passen könnten — bricht
		// aber vor einem beginnenden Pfeil ab, damit z. B. "A--x" korrekt in "A" und "--x"
		// zerfällt. Zeichensatz-/Längenregeln prüft die Domäne, nicht der Tokenizer.
		if (WORD_CHAR.test(ch)) {
			const start = i;
			let j = i;
			while (j < length && WORD_CHAR.test(line[j]) && !ARROW_LITERALS.some((literal) => line.startsWith(literal, j))) {
				j += 1;
			}
			tokens.push({ type: 'word', value: line.slice(start, j), column: start + 1 });
			i = j;
			continue;
		}

		// Unbekanntes Zeichen — der Parser wertet eine solche Marke als Syntaxfehler.
		tokens.push({ type: 'unknown', value: ch, column: i + 1 });
		i += 1;
	}

	return tokens;
}
