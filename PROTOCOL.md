# MIDI protocol (firmware AD23_GD_V0249 + LEDRGB patch)

All messages are sent to the LPD8 mk2's **MIDI input** port. They work on every channel 1–16.

## Colours

Pad number `p` is 0–7, in the order of the pad notes of the active program (note 36 → `p = 0`, … note 43 → `p = 7`
in the default program; if you re-map the notes in the Akai editor, `p` follows the order of the pad slots, not the note numbers).

Component `c`: `0` = red, `1` = green, `2` = blue. Values are 0–127 (scaled to 0–254 internally).

| Bank | CC number | Meaning |
|---|---|---|
| A | `20 + 3·p + c` (20…43) | Idle colour of pad `p` |
| B | `64 + 3·p + c` (64…87) | Colour of pad `p` while it is pressed |

Send three CCs (R, G, B) per colour change. A bank A CC changes the pad's LED immediately; a bank B CC takes effect the next time the pad is pressed or lit by a Note On.

Example, pad 2 (third pad) idle colour = blue-ish (R 0, G 20, B 127):

```
CC 26 = 0      (20 + 3*2 + 0)
CC 27 = 20     (20 + 3*2 + 1)
CC 28 = 127    (20 + 3*2 + 2)
```

## Notes

| Message | Effect |
|---|---|
| Note On, velocity > 0, note = a pad's note in the active program | Pad shows its "pressed" colour |
| Note Off, or Note On velocity 0 | Pad shows its idle colour |

The matching uses the note numbers stored in the currently active program (PROG 1–4), channel is ignored.

## Persistence and interaction

- Colours are written to the RAM copy of the active program. Switching program on the device reloads the saved colours.
- Pressing a pad on the device uses the (possibly host-set) pressed/idle colours, so pads do not "flash back" to old colours.
- The Akai program editor uses SysEx, which is not touched. If you save a program from the editor while host colours are active,
  those colours are stored.
- Channel 16 is not special for this patch; the firmware's own channel-16 handshake (CC 124/126) is unaffected.

## Not implemented

- Brightness/animation (blink, pulse) – do it in the host by sending colour updates.
- Reading back the current colour.
