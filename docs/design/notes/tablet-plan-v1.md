# Emberheir auf dem Tablet – Plan v1

Stand 2026-10-21. Ziel: Emberheir lässt sich auf einem Tablet im **Querformat** (iPad, Android-Tablet,
ab ca. 10 Zoll) vollständig mit dem Finger spielen. Handy und Hochformat gehören nicht dazu.

## Ausgangslage

- **Layout passt schon.** Jedes Fenster ist auf einer 900 Pixel hohen Bühne angelegt
  (`apps/web/src/ui/Stage.tsx`). Ein iPad quer (z. B. 1180×820) zeigt die Bühne mit ca. 0,9-facher
  Größe. Schrift bleibt lesbar, nichts muss neu angeordnet werden. Bei 4:3-Tablets wird die Bühne
  etwas höher (Mindestbreite 1440), das deckt der bestehende Resolution-Check schon ab.
- **Bedienung passt nicht.** Das Spiel setzt Maus und Tastatur voraus:
  - Tooltips öffnen nur per Hover. Gute Nachricht: fast alle laufen über vier Hooks
    (`useNoteHover` 57×, `useWeaponHover`, `useItemHover`, `usePerkHover`). Dazu 83 einfache
    `title=`-Texte, die auf Touch nie erscheinen.
  - Items: Rechtsklick = Standard-Aktion (`ui/items.tsx`), Ctrl+Click = in den Stash
    (`StashView.tsx`), HTML-Drag-and-Drop (Stash, Battle Plan). HTML-Drag funktioniert auf Touch
    nicht zuverlässig.
  - Shift schaltet Compare im Item-Tooltip.
  - Ash Tree, Mastery-Baum und Act Map zoomen mit dem Mausrad, Knoten-Infos per Pixi-Hover.
  - Hotkeys (Esc, C, I, T, B, L, M, Q/E, F8) haben teils keinen Knopf als Ersatz.
  - Hover-Namensschilder im Camp und Hover-Sounds (`juice.tsx`).
- **Performance:** Die Arena hat schon einen Partikel-Cap und die Einstellung Graphics Quality.
  Unbekannt ist, wie flüssig Pixi auf einem älteren iPad läuft.

## Grundregel

Ein Gerät mit Touch bekommt **dieselbe UI**, nur mit Touch-Gesten statt Maus. Keine zweite UI,
keine eigenen Layouts. Maus und Tastatur bleiben wie heute. Erkannt wird über den Zeigertyp pro
Eingabe (`pointerType === "touch"`), nicht über das Gerät, sodass Laptops mit Touchscreen beides
können.

## Gesten (Vorschlag)

| PC heute            | Tablet                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Hover = Tooltip     | **Lange drücken** (ca. 0,4 s) = Tooltip, bleibt stehen bis zum Tippen daneben |
| Klick               | Tippen (unverändert)                                                   |
| Rechtsklick (Item)  | Tooltip zeigt die Aktion als **Button** („Equip“, „Salvage“ …)          |
| Ctrl+Click (Stash)  | Button „To Stash“ im Item-Tooltip                                      |
| Drag and Drop       | Tippen = Item aufnehmen, Tippen auf Ziel = ablegen (Pointer-Events statt HTML-Drag) |
| Shift = Compare     | Compare-Schalter im Tooltip                                            |
| Mausrad-Zoom        | **Zwei Finger** = Zoom, ein Finger = verschieben                       |
| Esc                 | Sichtbarer Schließen-Knopf an jedem Window (gibt es teils schon)       |
| Hotkey-Hinweise     | auf Touch ausgeblendet                                                 |
| HoldButton          | funktioniert schon (Pointer-Events), nur Kontextmenü des Browsers unterdrücken |

## Schritte (je ein PR)

1. **Touch-Grundlagen im UI-Kit.** Lange drücken öffnet Tooltips in den vier Hover-Hooks,
   Tippen daneben schließt. `title=`-Texte werden zu echten Tooltips. Browser-Eigenheiten
   abschalten (Text markieren, Lupe, Kontextmenü, Doppeltipp-Zoom). Hotkey-Hinweise auf Touch
   ausblenden, Hover-Sounds auf Touch aus. Danach sind Camp, Battle und Menüs bedienbar.
2. **Items und Stash.** Aktions-Buttons im Item-Tooltip (Rechtsklick- und Ctrl+Click-Ersatz),
   Compare-Schalter, Tippen-zum-Verschieben statt Drag in Stash, Paperdoll und Battle Plan.
3. **Bäume und Karte.** Pinch-Zoom und Ein-Finger-Verschieben im Ash Tree, Mastery-Baum und der
   Act Map. Knoten antippen zeigt die Info, zweites Tippen (oder Button) lernt den Knoten.
4. **Tablet-Feinschliff.** Vollbild-Knopf im Menü und „Zum Home-Bildschirm“ (Web-App-Manifest,
   Querformat erzwungen, Hinweis „Bitte drehen“ im Hochformat). Mindestgröße für Tippziele prüfen
   (kleine Icons wie Status Rail oder Wallet bekommen eine größere Tippfläche). Performance
   messen und für Touch-Geräte Graphics Quality „low“ als Startwert, falls nötig.
5. **Tests.** Playwright mit Touch-Emulation (iPad-Profil): Camp öffnen, Item per Tippen ausrüsten,
   Tooltip per langem Drücken, Ash Tree zoomen, ein Kampf. Resolution-Check bekommt 1180×820 und
   1024×768 dazu.

Aufwand grob: Schritt 1 und 2 sind die größten, 3 mittel, 4 und 5 klein. Insgesamt 4 bis 5 PRs.
Jeder Schritt ist für sich nutzbar und ändert nichts für Maus-Spieler.

## Was Timo testen muss

Ich kann Touch nur emulieren. Echte Geräte (Gefühl für Long-Press-Zeit, Performance, Safari-
Eigenheiten) braucht einen Test von Timo auf seinem Tablet über die PR-Preview.

## Offene Fragen an Timo

1. **Welches Tablet** hast du zum Testen (iPad oder Android, ungefähres Alter)?
2. **Lange drücken für Tooltips** ok? Alternative: erstes Tippen = Tooltip, zweites Tippen = Aktion
   (schneller, aber jeder Knopf braucht dann zwei Tipps).
3. **Hochformat** einfach sperren mit „Bitte drehen“? (Empfehlung: ja.)
4. **Cheat Mode (F8)** auf dem Tablet über den Menü-Knopf reicht? (Empfehlung: ja, gibt es schon.)

## Umsetzung (2026-10-28)

Timo: Plan ok, alle Empfehlungen angenommen (lange drücken, Hochformat sperren, Cheats über das
Menü). Testgerät: iPad Pro (ca. 2020). Umgesetzt in einem PR statt fünf:

- `apps/web/src/ui/touch.ts`: lange drücken (450 ms) öffnet Tooltips aller vier Hover-Hooks und
  `title`-Texte, der folgende Klick wird geschluckt, nächstes Tippen daneben schließt.
  `<html data-input="touch|mouse">` folgt der letzten Eingabe; Key Caps und „Right-click“ sind
  auf Touch versteckt. Browser-Menü, Textauswahl, Doppeltipp- und Seiten-Zoom aus.
- Item-Tooltip auf Touch: Rechtsklick-Aktion als Button, „Compare“ antippbar.
- Items: antippen = aufnehmen, freies Feld oder Slot antippen = ablegen (kein Drag per Finger).
- Act Map: Zoom mit zwei Fingern (Ash Tree und Mastery konnten das schon).
- Web-App-Manifest (Vollbild, Querformat) + Icon, „Turn your tablet sideways“ im Hochformat.
- Tests: `e2e/touch.spec.ts` (iPad Pro 11" quer), Resolution-Check mit 1024×768.
- Offen: Gefühl und Performance auf echtem iPad (Timo testet die PR-Preview).
