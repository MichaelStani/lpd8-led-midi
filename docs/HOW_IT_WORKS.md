# How it works (firmware V0249)

Findings from analysing the firmware image that Akai's updater ships (Intel HEX, Cortex-M, application at `0x08004000`).
All addresses are for `AD23_GD_V0249.hex`; the patcher refuses other versions.

## What the firmware does

- The pad LEDs are RGB. The firmware keeps an 8×3-byte colour table in RAM (`0x20000350`) that the LED driver reads.
- Every stored program image (0xA5 bytes, five images are copied by the loader function at `0x0800A9CA`) holds, per pad (16-byte record), a note and two colours:
  idle colour at record offset 9…14 and pressed colour at 15…20, as three 14-bit (hi, lo) value pairs; only the low 8 bits are used.
  The RAM copy of the active program is addressed through the pointer stored at `0x2000017C`.
- `0x0800A964` `(r0 = pressed?, r1 = pad index 0–7)` copies the idle or pressed colour of that pad from the program into the colour table.
  The firmware calls it when a pad is pressed/released and when the program changes.
- The USB-MIDI receive loop at `0x08009844` parses USB-MIDI event packets. Note On/Off and Control Change packets from the host
  (except a small handshake on channel 16) are copied into a buffer and then ignored.

## The patch

1. **Hook** at `0x080099D2`: the instruction pair `adds r3,r0,r1 ; ldrb.w r8,[sp]` (6 bytes) is replaced by `b.w 0x0800AF88 ; nop`.
2. **Code cave** at `0x0800AF88` (zero-filled, unused flash; ~190 bytes). It saves registers, looks at the USB-MIDI packet,
   - for **Note On/Off** finds the pad whose program note equals the note and calls `0x0800A964` with on/off,
   - for **Control Change** `20…43` / `64…87` writes `(value>>6, (value<<1)&0x7F)` into the idle / pressed colour of the selected
     pad and colour component in the RAM copy of the program, then calls `0x0800A964(idle, pad)` to refresh the table,
   - restores the registers, executes the two displaced instructions, and jumps back to `0x080099D8`.

173 bytes differ from the original image. Nothing below `0x08004000` is touched, the version block at `0x0803EC00` is unchanged.

## Why not just MIDI/SysEx?

The stock firmware has no message for LEDs, so the only way is to add code. The patch uses the same internal function the
firmware uses itself, so colours, pad order and refresh behave like stock behaviour.
