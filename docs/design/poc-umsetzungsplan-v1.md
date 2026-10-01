# PoC-Umsetzungsplan – v1

Stand: 29.09.2026. Grundlage: `game-design-document-v1.md` (Abschnitt 11, PoC-Umfang).
Entwicklung komplett agentisch, Zielplattform zuerst Browser.

---

## Tech-Stack ✅

| Bereich | Wahl |
|---|---|
| Sprache | TypeScript (strict) |
| Kampf-Simulation | reines TypeScript, ohne Grafik, deterministisch (Seed) |
| Inhalte | typisierte, deklarative Daten in TypeScript |
| UI | React + Vite |
| Kampfszene | PixiJS |
| Tests | Vitest (Logik), Playwright (UI) |
| Speichern | Browser-Speicher (localStorage / IndexedDB) |
| Später PC | Electron oder Tauri |

---

## Repo-Struktur 💡

```
emberheir/
├─ CLAUDE.md            Regeln für die Agenten
├─ docs/                Game Design Document und Detail-Dateien
├─ packages/
│  ├─ sim/              Kampf, Items, Progression – reine Logik
│  └─ content/          Items, Affixe, Skills, Gegner als Daten
├─ apps/web/            React-UI und PixiJS-Kampfszene
└─ tools/balance/       CLI: tausende Kämpfe simulieren, Auswertung
```

**Regeln in CLAUDE.md** 💡
- `sim` kennt weder React noch den Browser. Die UI liest nur den Zustand und schickt Aktionen.
- Neue Affixe, Skills und Gegner sind Daten. Neue Bausteine (Conditions, Effects) bekommen immer Tests.
- Jede Änderung: Typecheck, Lint und Tests grün, bei UI-Änderungen ein Screenshot im PR.
- Spielbegriffe englisch, wie im Game Design Document.

---

## Meilensteine

Jeder Meilenstein endet mit etwas, das du dir im Browser ansehen kannst.

### M0 – Fundament
- Repo, Workspaces, strict TypeScript, Lint, Formatierung, Vitest, Playwright
- CI über GitHub Actions (Typecheck, Lint, Tests)
- CLAUDE.md und Design-Dokumente unter `docs/`
- Automatisches Deployment als Vorschau-Link

**Du siehst:** eine leere Seite unter einem festen Link, CI läuft.

### M1 – Kampf-Kern
- Held und Gegner mit Attributes und abgeleiteten Stats
- Basic Attacks nach Attack Speed, Schadensberechnung (Armor, Resistances, Evasion, Block, Crit fix 150 %)
- Heat-Leiste, Rotation mit 2 Slots und Trigger Threshold
- Ailments für den PoC: Burn, Chill, Shock
- Kampf-Log als Ereignisliste, fester Seed
- Einfache Debug-Ansicht im Browser: zwei Balken, Log, Start-Knopf

**Du siehst:** einen ersten automatischen Kampf mit Zahlen und Log.

### M2 – Items & Affixe
- Base Items (Sword, Wand, Shield, Focus, Body Armor, Amulet, Ring)
- Rarities Normal bis Epic, Item Level, Item Tier, Attribute Requirements
- ca. 20 Stat-Affixe, ca. 8 Trigger-Affixe (Condition → Chance → Effect → Internal Cooldown)
- Stats aus Ausrüstung zusammenrechnen
- **Balancing-Tool:** z. B. "1000 Kämpfe, Build X gegen Gorrak → Siegquote, Kampfdauer"

**Du siehst:** zufällige Items mit Tooltips, die den Kampf sichtbar verändern.

### M3 – Progression & Act 1
- Stages 1–15, Gegner Brute, Skirmisher, Caster, einfache Elites
- Boss Gorrak mit angekündigtem Slam (Telegraph)
- XP, Level, Attribut- und Skillpunkte
- Skill Tree: Core + Might + Arcana, ca. 30 Nodes, je 1 Keystone
- 6 Skills (3 pro Ast)
- Loot 1 aus 3, Auto-Salvage, Gold und Dust
- Tod → zurück ins Camp, Retreat
- Spielstand speichern

**Du siehst:** Act 1 von vorne bis zum Boss spielbar, noch mit einfacher UI.

### M4 – Richtige UI
- Kampf-Screen nach deinem UI-Mock (Plaques, VS-Medaillon, große Sprites, Heat-Leisten)
- Sieg-Screen mit Loot-Auswahl (Equip / Take, dazu Salvage All)
- Inventar-Grid wie in Diablo 2, Paperdoll wie in Diablo 3
- Item-Tooltips mit Vergleich zum angelegten Item
- Skill-Tree-Ansicht, Battle-Plan-Editor
- Camp mit Blacksmith (Upgrade, Salvage) und Mystic (Reforge, Temper, Imbue mit 1 Essence-Art)
- Platzhalter-Grafiken

**Du siehst:** den PoC so, wie er sich anfühlen soll.

### M5 – Prestige light & Playtest
- Vereinfachtes Prestige nach Gorrak: 1 Save Token, Rotation Slot 2 dauerhaft. Danach Camp mit Kaelen und Liora, gesammelte Skillpunkte verteilen, wieder ab Stage 1 von Act 1. Act 2 ist im PoC gesperrt ✅ (30.09.2026)
- Balancing-Durchgang mit dem Balancing-Tool
- Playtest-Checkliste zu den 5 PoC-Fragen (Heilung, Heat-Verhalten, Kampfdauer, Farm-Gefühl, Wirkung der Trigger-Affixe)

**Du siehst:** den kompletten PoC-Loop inklusive Prestige, bereit zum Testen.

---

## Parallelisierung 💡

Nach M1 können mehrere Agenten parallel arbeiten:
- **Strang A:** Items & Affixe (M2)
- **Strang B:** UI-Grundgerüst und Kampf-Screen (Teile von M4)

M3 braucht M1 und M2. M5 braucht alles.

---

## Entscheidungen (29.09.2026)

- Spiel und Repo heißen **Emberheir**, Repo privat ✅
- Vorschau über GitHub Pages während der Entwicklung ✅ (Hinweis: bei privaten Repos nur mit GitHub Pro/Team)
- Grafik: zum Start Platzhalter und Lucide-Icons, Zielbild KI-generierte Bilder ✅

## Offen, bevor es losgeht (Stand vor den Entscheidungen)

1. **Repo:** Name, privat oder öffentlich, und wann du es anlegen willst.
2. **Vorschau-Hosting:** z. B. GitHub Pages (kostenlos, einfach) oder Vercel.
3. **Grafik für den PoC:** reine Platzhalter, ein fertiges Asset-Pack oder KI-generierte Bilder?
