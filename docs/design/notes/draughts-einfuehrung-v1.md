# Draughts einführen (v1)

Timo, 27.10.2026 (Thread „Draughts schrittweise einführen").

## Vorher

Alle sieben Draughts gingen mit Prestige 1 auf einmal auf. Ein Draught kostete nur eine Flask-Ladung (von 3, Belt
mehr). Im Harvest-Screen gab es dazu eine Zeile, eine Notification nicht.

## Entscheidungen

1. **Freischaltung:** Iron, Ward und Vigor kommen mit Prestige 1. Liora erzählt davon in einem Story Blip
   (`liora-draughts`). Ein Element-Draught (Fire, Frost, Storm, Void) ist gelernt, sobald der Heir einen Gegner
   besiegt hat, der mit diesem Element zuschlägt: Default Attack, Skill oder telegrafierter Schlag
   (`enemyHitsWith`, Kills aus `legacy.hunts`). Das passiert vor dem Boss des Acts und belohnt nie einen Tod. Jeder
   neue Element-Draught bekommt eine Notification-Karte „New Draught".
   Reihenfolge im Spiel: Fire (Cinder Caster, Act 1), Void (Blight Spitter, Rotwood), Cold (Act 4), Lightning (Act 5).
2. **Kosten:** Flask-Ladung plus Acorns: `DRAUGHT_ACORN_KILLS` = 3 normale Kills auf dem Boss-Level des Runs
   (`killPrice`, wie die anderen Preise aus dem Economy-Audit). Reichen die Acorns nicht, wird nichts gebraut und die
   Flask geht voll los. Bezahlt wird bei jedem Aufbruch.

## UI

Die Auswahl bei Eldrin zeigt nur gelernte Draughts (Timo: gesperrte gar nicht anzeigen). Ihr Tooltip listet die
Boni als Stichpunkte wie Item-Affixe, darunter die Erklärung. Neben „Draught" steht der Preis (Icon + Zahl). Reichen
die Acorns nicht, sagt das die Zeile über Set Out.
