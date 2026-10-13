# Merkliste: Ideen für später

Stand 13.10.2026 · Ideen, die Timo gut findet, aber bewusst **nicht jetzt** plant oder baut.
Hier steht nur das Nötigste, damit nichts verloren geht. Planung und Umsetzung kommen erst, wenn ein Punkt dran ist.

| Idee | Status | Wann |
|---|---|---|
| Ancestor Duels | gemerkt | nach Release, ggf. als DLC |
| Battle Plan Presets | gemerkt | später |
| Death Recap | gemerkt (Platzhalter im Ashbound-Screen) | später |
| Fight Stats | gemerkt | später |
| Routen auf der Straßenkarte | Vorschlag in `neuausrichtung-v1.md` 6.2 | offen |

---

## Ancestor Duels (DLC-Kandidat)

**Idee:** Asynchrone 1v1-Duelle. Ein Build wird als **Build-Code** exportiert (Klasse, Waffe, Mastery, Web, Attribute,
Gear, Battle Plan). Man kämpft gegen den Code eines Freundes oder gegen **eigene frühere Heirs** aus der Lineage.

- Passt perfekt zum Spiel: Der Kampf ist schon 1 gegen 1, und die Sim ist deterministisch (gleicher Seed, gleicher Kampf).
- Geht ohne Server: Code kopieren, einfügen, kämpfen. Später optional eine Rangliste.
- Offene Fragen für später: Normierung (Level, Item Tier) für faire Duelle, ob Boons/Draughts zählen, Belohnungen (nur
  Kosmetik?), Schutz gegen manipulierte Codes.

## Battle Plan Presets

**Idee:** Mehrere Battle Plans im Camp speichern und vor dem Aufbruch wechseln (z. B. „Gegen Telegraph-Bosse“,
„Gegen Barrier“). Der Plan wird dadurch stärker zur Antwort auf den Act und seine Omens.

- Nur im Camp wechselbar, nicht zwischen zwei Stages.
- Offen: Anzahl der Presets (Vorschlag 3), ob Gear-Sets dazugehören (eher nein).

## Death Recap

**Idee:** Nach einem Tod zeigt der Ashbound-Screen, woran es lag: Auswertung des Kampf-Event-Logs mit einfachen Regeln,
Top-3-Hinweise zum Build („75 % des Schadens war Fire, deine Fire Resistance liegt bei 30 %“).
Der Platzhalter steht schon in `apps/web/src/game/NoticeScreen.tsx`. Nutzt dieselbe Auswertung wie die Fight Stats.

## Fight Stats

**Idee:** Nach jedem Kampf (und im Combat Log) Schaden nach Quelle, Ailment-Anteile, Trigger-Auslösungen, Heat-Verlauf.
Basis ist das Event-Log der Sim. Der Training Dummy (`neuausrichtung-v1.md`, Abschnitt 9) zeigt einen Teil davon live.
