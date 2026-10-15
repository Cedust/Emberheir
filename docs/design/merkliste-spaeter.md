# Merkliste: Ideen für später

Stand 13.10.2026 · Ideen, die Timo gut findet, aber bewusst **nicht jetzt** plant oder baut.
Hier steht nur das Nötigste, damit nichts verloren geht. Planung und Umsetzung kommen erst, wenn ein Punkt dran ist.

| Idee | Status | Wann |
|---|---|---|
| Ancestor Duels | gemerkt | nach Release, ggf. als DLC |
| Battle Plan Presets | gemerkt | später |
| Death Recap | gemerkt (Platzhalter im Ashbound-Screen) | später |
| Fight Stats | gemerkt | später |
| Pixi-Looks für die Neuausrichtung | gemerkt (Timo: erst nach den gemalten Assets) | später |

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

## Pixi-Looks für die Neuausrichtung

**Timo (13.10.):** Effekte für neue Systeme erst als Idee merken. Held und Gegner werden vielleicht noch durch gemalte
Assets ersetzt, und danach muss man ohnehin neu schauen, wie die Effekte gebaut werden. Bis dahin bekommen neue Mechaniken
nur einen einfachen, lesbaren Platzhalter (Zahl, Farbe, kurzer Text in der Arena), damit man sie im Kampf erkennt.

| Was | Idee |
|---|---|
| Mighty Hit | großer Treffer mit Kamera-Ruck und eigener Zahl (Platzhalter gebaut: Bodenwelle, Splitter, ⚒) |
| Parry | Klingen-Funke, Treffer prallt halb ab (Platzhalter gebaut: heller Ring, Funken, ⚔) |
| Mastery-v2-Regeln | Interrupt (Telegraph zerbricht), Frozen Solid (Eisblock), Arc Chain (Blitzbogen), Spring Trap (Gratis-Bolzen), Rupture Plate (Rüstung platzt), Impale / Master of the Wall (gesammelter Schaden entlädt sich); bis dahin nur Log und Trefferzahl |
| Combust (Burn) | Glut springt auf, kurze Stichflamme |
| Collapse (Corruption) | Void zieht sich zusammen und implodiert |
| Poison-Überlauf | grüne Blasen platzen |
| Freeze, Shock-Stacks | Eiskristalle am Gegner, 1–3 Blitzringe |
| Doom-Anzeige | schraffierter Teil der Gegner-Lifeleiste: Schaden, den laufende DoTs noch machen |
| Omens | Wetter und Licht pro Omen (`weather.ts`), z. B. Cinder Rain als Ascheregen |
| Elite-Modifier | Aura, Partikel oder Blend Mode pro Modifier |
| Champions | Namensschild, stärkere Aura |
| Ashborn | Glutrisse und Aschepartikel am Helden ab 25/50/75/100 Punkten |
| Greater Affix | goldener Schimmer am Item-Icon, kein Arena-Effekt |
| Class Traits | Warrior: Glutschild beim Aushalten einer Heavy Attack · Hunter: Fadenkreuz beim Schuss in die Lücke · Sorcerer: Funke an der Wand nach jedem Skill · Warlock: dunkler Schleier, der mit der Kampfzeit wächst |
