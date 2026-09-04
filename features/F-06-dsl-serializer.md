# F-06 · DSL-Serializer

**Schicht:** Anti-Corruption Layer · **Hängt ab von:** F-02 · **Umfang:** M

## Ziel

Aus einer Karte wird Text, den man in einen Chat einfügen kann, der sich von Hand ändern lässt
und der bei gleichem Inhalt immer byteidentisch ausfällt.

## DDD-Einordnung

Gegenstück zum Parser im Anti-Corruption Layer. Er kennt das Aggregat, aber keine Oberfläche
und keine Zwischenablage.

## Umfang

`src/lib/dsl/serializer.ts`

```ts
export function serialize(map: FeatureMap): string;
```

## Ausgabeform

```
featuremap v1

audit["Audit-Log"]         :: impact=5,  effort=5
gast["Gastzugang"]         :: impact=3,  effort=2
login["Benutzer-Login"]    :: impact=8,  effort=3

api --> rollen
rollen -->|"nutzt Identität"| sso
rollen -.->|"gemeinsame Events"| audit
rollen --x|"widerspricht sich"| gast
```

Verbindliche Regeln:

| ID | Regel |
|---|---|
| DSL-10 | Feste Struktur: Kopfzeile, Leerzeile, Feature-Block, Leerzeile, Beziehungs-Block. Datei endet mit genau einem Zeilenumbruch |
| DSL-11 | Features aufsteigend nach Kennung sortiert, Vergleich über Zeichencodes |
| DSL-12 | Der Namensteil `kennung["Anzeigename"]` wird mit Leerzeichen auf die Länge des längsten Namensteils aufgefüllt, danach folgt ` :: ` |
| DSL-13 | Der Anzeigename wird nur ausgegeben, wenn er existiert und von der Kennung abweicht |
| DSL-14 | Round-Trip: Export → Import → Export ergibt byteidentischen Text |

Innerhalb der Attribute wird ebenfalls ausgerichtet: `impact=` zuerst, dann `, `, dann
`effort=`; der Nutzenwert wird rechts mit Leerzeichen auf die Breite des längsten Nutzenwerts
im Dokument aufgefüllt, damit die Aufwandsspalte fluchtet.

Beziehungen werden sortiert nach Quelle, dann nach Art in der Reihenfolge `requires`,
`relates`, `excludes`, dann nach Ziel (Präzisierung, siehe `README.md`). Ohne diese Regel wäre
DSL-14 nicht haltbar.

Eine Beziehung ohne Beschriftung wird als `from --> to` geschrieben, mit Beschriftung als
`from -->|"text"| to` — ohne Leerzeichen zwischen Pfeil und senkrechtem Strich.

Kommentare aus einem importierten Dokument gehen verloren; das ist beabsichtigt, weil das
Modell sie nicht kennt. Der Export-Dialog weist darauf hin (F-19).

## Akzeptanzkriterien

- [ ] Zweimaliger Export ohne zwischenzeitliche Änderung liefert byteidentischen Text (AK-04).
- [ ] Export, Import in eine frische Karte, erneuter Export liefert byteidentischen Text
      (AK-03, DSL-14) — auch bei Anzeigenamen mit Umlauten, bei Werten außerhalb der
      Schätzreihe und bei Features ohne Anzeigenamen.
- [ ] Ein Feature, dessen Anzeigename gleich seiner Kennung ist, wird ohne Klammerteil
      ausgegeben.
- [ ] Die Ausgabe einer leeren Karte ist `featuremap v1` gefolgt von einem Zeilenumbruch.
- [ ] Zwei Karten mit identischem Inhalt, aber unterschiedlicher Reihenfolge in den Arrays,
      erzeugen denselben Text.

## Tests

Eigenschaftsbasierter Round-Trip-Test über zufällig erzeugte Karten (Kennungen, optionale
Namen, Werte 0 bis 50, alle drei Beziehungsarten) plus feste Beispiele für Ausrichtung,
Sortierung und Sonderfälle.

## Nicht Teil dieses Features

Export-Dialog, Zwischenablage, Datei-Download (F-19). Bildexport (F-20, F-21).
