# LPD8 mk2 – control the pad LEDs over MIDI

The Akai LPD8 mk2 has RGB pads, but the stock firmware ignores LED messages from the computer.
This project patches the **official firmware image** so the pads accept simple MIDI messages:
set any RGB colour per pad from your DAW script, host application or lighting software.

*Deutsche Kurzfassung: [README.de.md](README.de.md)*

> **Unofficial. Use at your own risk.** This is not affiliated with or endorsed by Akai Professional / inMusic.
> Flashing modified firmware may void your warranty. The bootloader is not touched, so you can always
> go back to the original firmware (see [docs/FLASHING.md](docs/FLASHING.md)), but nobody can promise
> a flash will never go wrong. Do not unplug the device while flashing.

## What you get

| Purpose | MIDI message (any channel, including 16) | Values |
|---|---|---|
| Idle colour of pad `p` (0–7) | Control Change, CC = `20 + 3·p + c`  (`c`: 0 = R, 1 = G, 2 = B) | 0–127 |
| Colour while the pad is held | Control Change, CC = `64 + 3·p + c` | 0–127 |
| Light a pad with its "pressed" colour | Note On (velocity > 0) on the pad's note | |
| Back to idle colour | Note Off, or Note On with velocity 0 | |

Pad `p = 0` is the pad with the first note of the active program (36 in the default program), `p = 7` the last.
Details and examples: [PROTOCOL.md](PROTOCOL.md).

Colours live in the RAM copy of the active program: they stay while you play the pads, and are reset to the
values saved in the device when you switch program (PROG 1–4).

## Quick start

You need [Node.js](https://nodejs.org/) 18 or newer and Akai's own **LPD8 mk2 Firmware Updater**
(download it from Akai's website – this repository does *not* contain any Akai files).

1. Install the Akai LPD8 mk2 Firmware Updater. It installs `AD23_GD_V0249.hex` next to its `.exe`.
2. Build the patched firmware from your own copy of that file:
   ```bash
   cd tools
   npm install
   node patch.mjs "C:\Program Files (x86)\Akai Professional\LPD8 mk2 Firmware Updater\AD23_GD_V0249.hex" AD23_GD_V0249_LEDRGB.hex
   ```
   The patcher refuses any input that is not exactly firmware **V0249** (SHA-256 is verified). The expected
   SHA-256 of the output is `b7a623dd7a9fb2716ce5075e8fdefd1dc9605d88e91ce0b0d69c1312d0b66a9d`.
3. Flash it with Akai's updater – see [docs/FLASHING.md](docs/FLASHING.md).
4. Send MIDI. Example (PowerShell, Windows): [examples/powershell/lpd8.ps1](examples/powershell/lpd8.ps1).

Raw bytes for "pad 0 → orange (R 127, G 50, B 0) on channel 16":

```
BF 14 7F      CC 20 = 127   (red)
BF 15 32      CC 21 = 50    (green)
BF 16 00      CC 22 = 0     (blue)
```

## Status / tested

- Device: LPD8 mk2, firmware V0249 (the version shipped with updater 1.0.3), Windows 11.
- Verified on hardware: RGB order, all 8 pads, all 16 MIDI channels incl. 16, note on/off, flashing with Akai's updater.
- Not verified by the author: other firmware versions (the patcher refuses them), flashing from macOS or Linux,
  long-term effects. Reports welcome via issues.
- The patch does not touch the SysEx path used by the Akai program editor, so the editor should keep working;
  a full load/save round trip with the editor has had only a quick manual check so far. Programs saved from the editor
  while custom colours are active will store those colours.

## How it works

Short version: the firmware's USB-MIDI receive loop already receives notes and CCs from the host, but drops them.
The patch redirects one instruction pair to ~190 bytes of new code in unused flash, which writes the colour bytes into
the active program and asks the firmware to refresh the pad. Everything else, including the bootloader, is unchanged
(173 bytes differ). See [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).

## Legal

The code in this repository is MIT licensed ([LICENSE](LICENSE)). The Akai firmware, updater and trademarks belong to
their owners; no part of them is distributed here. The patcher works on your own copy, for interoperability with
hardware you own.
