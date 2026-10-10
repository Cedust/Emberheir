# Entschlackung v1: was passt, was ist zu viel

Stand 10.10.2026, Diskussionsgrundlage mit Timo. Basis ist der Code auf `main` (inkl. Level v2).
Leitfrage: Merkt der Spieler den Unterschied, und macht die Entscheidung Spaß?

## Leitprinzipien

1. **Wenige Entscheidungen pro Kampfende.** Nach jedem Sieg gibt es genau eine Wahl (Item Pick), an Shrines eine zweite (Boon). Alles andere fällt passiv ab.
2. **Eine Währung, eine Aufgabe.** Jede Währung hat genau einen klaren Zweck. Gibt es keinen eigenen Zweck, fällt sie weg.
3. **Umskillen kostet überall Gold bei Kaelen.** Das gilt für Skill Tree, Weapon Mastery und Attribute gleich, mit einer Regel statt dreien.
4. **Eine Persona, ein Thema.** Schmiede = Metall (Tier, Salvage), Mystic = Affixe, Runesmith = Sockets.
5. **Prestige = drei Dinge.** Ein neuer Act öffnet sich, man wählt einen Prestige-Ast, die Battle-Plan-Sprosse kommt automatisch. Punkte gibt es nebenbei, ohne eigene Bildschirme.

## Timos Punkte

### Stash charakterübergreifend: ja
- Passt gut, weil es keine Waffendrops mehr gibt. Alle Drops sind klassenneutral, also lohnt sich Loot für die Twinks (D2-Gefühl).
- Den `stashBurned`-Mechanismus streichen. Er stammt aus der Zeit, als beim Prestige das Gear weg war, und hat heute keinen Sinn mehr.
- Dämpfer gegen zu starkes Twinken: Items haben ein **Required Level** (Item Level − ein paar Level). Das reicht als Bremse.
- Währungen bleiben pro Charakter. Ein geteilter Wallet würde jeden neuen Charakter trivial machen.
- Technisch: der Stash zieht aus dem Save in einen eigenen „Account“-Speicher, mit Migration (Stash von Slot 1 übernehmen, die anderen ins Inventar oder zusammenführen).

### Spoils weg, Ressourcen passiv: ja
- Reforge Stones, Ascension Shards, Kindling usw. fallen wie Runes direkt in den Beutel. Der Rewards-Screen zeigt sie als kleine Zeile („+2 Reforge Stones“).
- Flask Charges nicht mehr als Drop. Neues Belt-Affix **„+1–2 Flask Charges“** gibt dem Belt eine eigene Identität.
- Damit fällt auch **Distill** weg: Stones droppen verlässlich, die Umwandlung aus Dust braucht es nicht mehr.

### Trophies, Uniques, Heirlooms: so ist es heute
- **Uniques**: 8 handgemachte Legendaries mit festem Namen, nicht craftbar.
- **Boss Trophies**: auch Uniques (14), aber jede gehört zu einem Boss und droppt nur dort (~10 % im Hoard). Das ist dasselbe System mit einer anderen Quelle.
- **Trophy Wall**: Sammlung aller jemals gefundenen Uniques (beider Arten).
- **Heirlooms**: keine eigene Mechanik mehr. Seit Playtest 2 überlebt alles den Prestige, und die Legacy-Ansicht nennt das getragene Gear nur noch „Heirloom“. Das ist ein Überbleibsel aus der Save-Token-Zeit.
- **Vorschlag:** „Heirloom“ streichen. Alles heißt Unique, bei Boss-Uniques steht nur „Dropped by Gorrak“ im Tooltip. Die Trophy Wall bleibt als Sammlung (Sammeltrieb ist gut).

### Prestige/Harvest überladen: ja
Heute gibt ein Prestige 10 Dinge: Battle-Plan-Sprosse, Prestige-Ast, Harvester's Ember, +2 Attributpunkte, 2 Rekindle, Phoenix Ash, 2 Skill Points, Level Cap, neuer Act, neues Level Band.

- **Harvester's Ember streichen.** Keystones kosten Skill Points (z. B. 3) und liegen weit draußen (6–10 Punkte Weg, das gibt es seit Level v2 schon). Die Grenze kommt dann aus dem Punktebudget und den Forks, nicht aus einer Extra-Währung.
- **Rekindle und Phoenix Ash streichen.** Beide machen fast dasselbe (Attribute verschieben). Stattdessen gilt Attribute-Respec bei Kaelen für Gold, wie bei den Bäumen.
- Übrig bleibt: **neuer Act + Ast-Wahl + Battle-Plan-Sprosse**, dazu +2 Attributpunkte und 2 Skill Points als Zahlen auf dem Inheritance-Screen.

### Quarry: weg
Einverstanden. Der Trigger Codex funktioniert auch ohne. Die Codex-„Mastery“ (höchstes gesalvagtes Tier) würde ich ebenfalls streichen: Gelerntes ist gelernt, die Kindle-Stufe richtet sich nach dem Tier des Ziel-Items.

## Meine zusätzlichen Vorschläge

### Währungen: von 10 auf 5
| Währung | Vorschlag | Warum |
| --- | --- | --- |
| Gold | bleibt | Universeller Sink (Upgrade, Gamble, Respecs) |
| Salvage Dust | bleibt | Gibt dem Salvage einen Sinn |
| Reforge Stones | bleibt, passiv | Kern des Crafting |
| Ascension Shards | bleibt, passiv | Klar: Tier-Upgrade, Bosse |
| Runes | bleibt | D2-Gefühl, eigene Sammlung |
| 7 Essences + Imbue | **streichen** | 7 Währungen nur für Resistance-Affixe. Temper + Reforge + Kindle decken das ab |
| Kindling | **streichen** | Kindle kostet stattdessen Dust + Reforge Stones |
| Harvester's Ember | **streichen** | siehe oben |
| Phoenix Ash | **streichen** | siehe oben |
| Flask Charges | kein Drop mehr | Belt-Affix |

### Personas klarer schneiden
- **Thoric** (Schmied): Upgrade, Salvage.
- **Liora** (Mystic): Reforge, Temper, Kindle (Imbue und Distill fallen weg, 5 → 3 Aktionen).
- **Runesmith**: *alles* rund um Sockets, also Add Socket (bisher bei Thoric), Socket Rune, Combine. Ein Ort für ein Thema.
- **Marisha**: Gamble bleibt. Sie ist der Gold-Sink mit Glücksmoment, genau richtig für einen Waschbär.
- **Scout**: Act Preview und Revisit Act gehören eher auf die Straßenkarte am Camp-Rand als zu einer Persona. Das ist optional, die Figur kann als Flavor bleiben.

### Belohnungen pro Boss entzerren
Ein Boss gibt heute Echo + Hoard (6 Karten, 2 nehmen) + Trophy-Chance + Boon + Spoils + Waymark. Ohne Spoils ist das schon besser. Zusätzlich würde ich die **Boons am Boss streichen** (Shrine nur nach Stage 5/10 und Elites). Der Boss-Moment gehört dem Hoard und dem Echo.

### Kleinere Altlasten
- `Encounter`/Save-Felder für Spoils, Quarry, Ember, Ash, Essences entfernen (Save-Migration rechnet Restbestände in Gold/Dust um).
- Compendium-Texte und Tooltips anpassen, damit kein Begriff mehr auftaucht, den es nicht gibt.

## Was ich bewusst behalten würde
- **Trigger Codex + Kindle**: Das ist das eine „Build-Crafting“-System, das Emberheir besonders macht.
- **Ember Thief**: kurzer Überraschungsmoment, kostet keine Entscheidung.
- **Pity**: für den Spieler unsichtbar, nimmt Frust.
- **Echoes**: bindet Bosse an die Waffe, ein starkes Bild.
- **Battle Plan Ladder**: macht jedes Prestige spürbar.

## Runde 2 (Timo 10.10.2026, 12:19)

Timo geht mit den Vorschlägen größtenteils mit. Neu:

- **Scout:** behält Act Preview. Revisit Act läuft direkt über die Straßenkarte, ohne Persona. Vorschlag für eine neue Mechanik: **Bounties** (Marks). Beim Aufbruch gibt der Scout einen optionalen Auftrag für diesen Zug, z. B. „Fang den Ember Thief“, „Besiege 3 Elites“ oder „Schlag den Boss ohne Flask“. Erfüllt gibt es eine Belohnung (Ressourcen und ein Item, das mindestens Rare ist). Das gibt dem Farmen ein Ziel, ohne im Kampf etwas zu verlangen.
- **Währungsnamen (Vorschlag):** Gold bleibt (die Waschbär-Händlerin will glänzende Münzen; Alternative: Acorns). Salvage Dust → **Ash** (Items zerfallen zu Asche, passt zum Asche-Kreislauf). Reforge Stones → **Embercoal** (glühende Kohle für Thorics Esse). Ascension Shards → **Phoenix Feathers** (Wiedergeburt im Feuer = Tier-Upgrade, Bosse droppen sie, passt zur Fabelwelt). Runes bleiben Runes.
- **Keystone-Gate:** Statt Harvester's Ember gilt ein Limit gleichzeitig aktiver Keystones, das an die Prestige-Stufe gebunden ist. Vorschlag: 1 ab Start, +1 bei Prestige 2, 4 und 6, also maximal 4. Sichtbar als glühende Kerben im Ember-Sigil am Stamm. Kosten: 3 Skill Points.
- **Reforge zu Thoric:** ja. Thoric = Upgrade, Reforge, Salvage (alles Feuer und Metall, bezahlt mit Embercoal und Phoenix Feathers). Liora = Temper, Kindle (feine Affix-Magie). Reforge löst weiterhin den Affix Lock.

## Umsetzung (10.10.2026)

Timo: „Bounties sind gut. Acorns, Ash, Ember Coal, Phoenix Feathers und Runes. Keystone-Idee passt. Starte mit der Umsetzung.“ Umgesetzt in einem PR:

- **Währungen:** Acorns (ex Gold), Ash (ex Salvage Dust), Ember Coal (ex Reforge Stones), Phoenix Feathers (ex Ascension Shards), Runes. Die Rune „Ash“ heißt jetzt **Bark** (sonst zweimal „Ash“).
- **Weg:** Spoils-Pick, 7 Essences + Imbue, Distill, Kindling, Harvester's Ember, Phoenix Ash, Rekindle, Quarry, Codex Mastery, Boons nach Bossen, Flask-Charge-Drops, „Heirloom“, verbrannter Stash.
- **Passiv:** Ember Coal droppt wie Runes (Elite 2–3, Boss 4–6, normale Gegner 15 % auf 1).
- **Ember Flask:** 3 Ladungen + Belt-Affix „of Plenty“ (+1–2 Flask Charges).
- **Keystones:** 3 Skill Points, Limit 1 (+1 bei Prestige 2/4/6, max. 4), als Kerben im Ember-Sigil. Tier-II/III-Upgrades eines Keystones belegen keinen neuen Platz.
- **Attribute-Respec** bei Kaelen für Acorns (gleicher Preis wie Baum-Respec). Prestige gibt +2 Attributpunkte ohne Verschieben.
- **Personas:** Thoric = Upgrade, Reforge, Salvage. Liora = Temper, Kindle. Nyssa = Add Socket, Socket Rune, Combine, Runeword Codex. Eldrin = Act Preview + Bounty. Marisha = Gamble.
- **Bounties:** Pro Zug ein Auftrag (Elite Hunt, Culling, Thief Chase ab Akt 2, Dry Throat, Hale and Whole). Erfüllt: Acorns (10 normale Kills auf Boss-Level), 2 Ember Coal und ein Item ab Rare, das in den Supply Wagon geht. Die Bounty steht schon im Camp fest (Vorschau = echter Wurf).
- **Shared Stash:** alle 6 Slots teilen den Supply Wagon. Beim ersten Start werden die alten Stashes zusammengelegt; was nicht passt, geht ins Inventar des Charakters, sonst zu Ash.
- **Required Level** = Item Level − 5. Boss-Uniques zeigen „Dropped by …“.
- **Save v13:** Essences → 20 Ash pro Stück, Kindling → Ember Coal, Skill Tree wird zurückerstattet (Keystones kosten jetzt Punkte).
