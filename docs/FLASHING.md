# Flashing and going back

The patched file is flashed with **Akai's own firmware updater** – no custom flasher is involved.

## Flash the patched firmware

1. Build `AD23_GD_V0249_LEDRGB.hex` with `tools/patch.mjs` (see the README).
2. The updater loads the firmware from a `.hex` file next to its `.exe`. Pick one of:
   - **Without admin rights (recommended):** copy the whole updater folder (the `.exe` and `AD23_GD_V0249.hex`) to a folder you own,
     then replace that copy of `AD23_GD_V0249.hex` with the patched file, keeping the file name `AD23_GD_V0249.hex`.
     Run the `.exe` from the copy.
   - **Installed updater:** replace `AD23_GD_V0249.hex` in `C:\Program Files (x86)\Akai Professional\LPD8 mk2 Firmware Updater\`
     (needs administrator rights). Keep a copy of the original file first.
3. Start the updater and follow its dialogue: unplug the LPD8, hold **NOTE + PROG CHNG + CC** while plugging it back in,
   confirm in the updater, and confirm the update.
4. Wait for "successfully updated". Do not unplug the device while it is updating.

## Go back to the original firmware

Do the same with the **original** `AD23_GD_V0249.hex` (from Akai's installer; this is why you should keep a copy).
The patch only changes flash from `0x08004000` upwards; the bootloader below that is never modified. Akai's updater enters
update mode with the NOTE + PROG CHNG + CC start-up combination, which on the author's device worked independently of the
installed application, so a patched firmware that misbehaves should be replaceable. This is not guaranteed.

## What can go wrong

- If the updater says the firmware is up to date: it compares version numbers; with the buttons held during plug-in it
  normally flashes anyway. Follow the on-screen instructions.
- If the device does not start after flashing: re-enter update mode with the three buttons and flash the original.
- Anything else: open an issue with the updater's message.
