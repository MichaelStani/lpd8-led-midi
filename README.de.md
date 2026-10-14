# LPD8 mk2 – Pad-LEDs per MIDI steuern

Der Akai LPD8 mk2 hat RGB-Pads, aber die Originalfirmware ignoriert LED-Befehle vom Rechner. Dieses Projekt patcht die
**offizielle Firmware-Datei** so, dass die Pads einfache MIDI-Nachrichten annehmen – jede RGB-Farbe pro Pad aus
DAW-Script, Programm oder Lichtsteuerung.

> **Inoffiziell, Nutzung auf eigene Gefahr.** Kein Bezug zu Akai Professional / inMusic. Der Bootloader bleibt unberührt,
> du kannst jederzeit die Originalfirmware zurückspielen ([docs/FLASHING.md](docs/FLASHING.md)). Garantie, dass beim
> Flashen nichts schiefgeht, gibt es nicht. Gerät beim Flashen nicht abziehen.

## Protokoll (jeder MIDI-Kanal, auch 16)

| Zweck | Nachricht | Werte |
|---|---|---|
| Ruhefarbe Pad `p` (0–7) | Control Change, CC = `20 + 3·p + c` (`c`: 0 = R, 1 = G, 2 = B) | 0–127 |
| Farbe beim Drücken | Control Change, CC = `64 + 3·p + c` | 0–127 |
| Pad auf Drück-Farbe | Note On (Velocity > 0) auf die Pad-Note | |
| Pad auf Ruhefarbe | Note Off oder Note On mit Velocity 0 | |

Die Farben gelten, bis du das Programm (PROG 1–4) wechselst. Mehr in [PROTOCOL.md](PROTOCOL.md).

## Kurzanleitung

1. Den **LPD8 mk2 Firmware Updater** von Akai installieren (dieses Repository enthält keine Akai-Dateien).
2. Node.js ≥ 18 installieren, dann:
   ```bash
   cd tools
   npm install
   node patch.mjs "C:\Program Files (x86)\Akai Professional\LPD8 mk2 Firmware Updater\AD23_GD_V0249.hex" AD23_GD_V0249_LEDRGB.hex
   ```
3. Mit dem Akai-Updater flashen: [docs/FLASHING.md](docs/FLASHING.md).
4. MIDI senden – Beispiel: [examples/powershell/lpd8.ps1](examples/powershell/lpd8.ps1).

Getestet: LPD8 mk2, Firmware V0249, Windows 11 (alle 8 Pads, alle 16 Kanäle, Farbreihenfolge, Flashen mit dem Akai-Updater).
Der Patcher akzeptiert nur genau diese Firmware-Version (SHA-256-Prüfung).
