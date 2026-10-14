// LPD8 mk2 LED-over-MIDI firmware patcher
//
// Takes the *unmodified* Akai firmware image AD23_GD_V0249.hex (from Akai's own
// firmware updater) and writes a patched copy in which the pad LEDs can be
// controlled over USB MIDI (see PROTOCOL.md).
//
// Usage:  node patch.mjs <AD23_GD_V0249.hex> [out.hex]
//
// The patcher only works on the exact firmware version it was written for
// (SHA-256 is checked) and verifies every byte it is about to change.
import fs from 'fs';
import crypto from 'crypto';
import {Capstone, Const, loadCapstone} from 'capstone-wasm';
import {Keystone, Const as KC, loadKeystone} from 'keystone-wasm';

const EXPECTED_SHA256 = '34e1558f13752d58e05449b2aee43917d380111fedee3ede8a4cdf0815b3aba8'; // AD23_GD_V0249.hex
const [,, inHex, outArg] = process.argv;
if (!inHex) {
  console.error('Usage: node patch.mjs <AD23_GD_V0249.hex> [out.hex]');
  process.exit(2);
}
const outHex = outArg ?? 'AD23_GD_V0249_LEDRGB.hex';
const fail = msg => { console.error('ERROR: ' + msg); process.exit(1); };

const raw = fs.readFileSync(inHex);
const sha = crypto.createHash('sha256').update(raw).digest('hex');
if (sha !== EXPECTED_SHA256) {
  fail(`Input is not the supported firmware (AD23_GD_V0249.hex).\n  expected SHA-256 ${EXPECTED_SHA256}\n  got      SHA-256 ${sha}`);
}

// ---- read Intel HEX into a sparse memory map ----
const mem = new Map();
let ext = 0, startRec = null;
for (const line of raw.toString('utf8').split(/\r?\n/)) {
  if (!line.startsWith(':')) continue;
  const n = parseInt(line.substr(1, 2), 16), a = parseInt(line.substr(3, 4), 16), t = parseInt(line.substr(7, 2), 16);
  if (t === 4) ext = parseInt(line.substr(9, 4), 16) << 16;
  else if (t === 5) startRec = line;
  else if (t === 0) for (let i = 0; i < n; i++) mem.set(ext + a + i, parseInt(line.substr(9 + 2 * i, 2), 16));
}

// ---- addresses in firmware V0249 (see docs/HOW_IT_WORKS.md) ----
const HOOK = 0x080099d2;   // USB-MIDI receive loop: "adds r3,r0,r1 ; ldrb.w r8,[sp]"
const RET = 0x080099d8;    // instruction after the displaced pair
const CAVE = 0x0800af88;   // unused (zero-filled) flash
const CAVE_END = 0x0800b200;
const SET_PAD_LED = 0x0800a964; // (r0 = on/off, r1 = pad index) -> table colour from program

const hookOrig = [0, 1, 2, 3, 4, 5].map(i => mem.get(HOOK + i));
if (Buffer.from(hookOrig).toString('hex') !== '43189df80080') fail('Hook site does not contain the expected instructions.');
for (let a = CAVE; a < CAVE_END; a++) if (mem.get(a) !== 0) fail('Code cave is not empty at 0x' + a.toString(16));

// ---- code cave (Thumb-2) ----
//  Note On/Off  (CIN 9/8): light pad whose program note matches -> on/off colour
//  Control Change (CIN B): CC 20..43  = idle colour  of pad (CC-20)/3, component (CC-20)%3 (R,G,B)
//                          CC 64..87  = pressed colour, same layout; value 0..127
const src = `
  push {r0-r3, lr}
  adds r3, r0, r1
  ldrb r0, [r3]
  and r0, r0, #0xf
  cmp r0, #0xb
  beq cc
  movs r2, #0
  cmp r0, #8
  beq chk
  cmp r0, #9
  bne done
  ldrb r2, [r3, #3]
  cmp r2, #0
  beq chk
  movs r2, #1
chk:
  ldrb r1, [r3, #2]
  movw r0, #0x170
  movt r0, #0x2000
  ldr r0, [r0, #0xc]
  adds r0, r0, #5
  movs r3, #0
loop:
  lsls ip, r3, #4
  ldrb.w ip, [r0, ip]
  cmp ip, r1
  beq found
  adds r3, r3, #1
  cmp r3, #8
  blo loop
  b done
found:
  adds r1, r3, #4
  and r1, r1, #7
  mov r0, r2
  bl #${SET_PAD_LED}
  b done
cc:
  ldrb r1, [r3, #2]
  subs r2, r1, #20
  cmp r2, #24
  blo banka
  subs r2, r1, #64
  cmp r2, #24
  bhs done
  movs r0, #15
  b go
banka:
  movs r0, #9
go:
  mov ip, r0
  movs r0, #43
  mul r1, r2, r0
  lsrs r1, r1, #7
  add.w r0, r1, r1, lsl #1
  subs r2, r2, r0
  lsls r2, r2, #1
  add ip, ip, r2
  lsls r2, r1, #4
  add ip, ip, r2
  movw r0, #0x170
  movt r0, #0x2000
  ldr r0, [r0, #0xc]
  add r0, r0, ip
  ldrb r2, [r3, #3]
  lsrs ip, r2, #6
  strb ip, [r0]
  lsls r2, r2, #1
  and r2, r2, #0x7f
  strb r2, [r0, #1]
  adds r1, r1, #4
  and r1, r1, #7
  movs r0, #0
  bl #${SET_PAD_LED}
done:
  pop {r0, r1, r2, r3, lr}
  adds r3, r0, r1
  ldrb.w r8, [sp]
  b.w #${RET}
`;
await loadKeystone();
const ks = new Keystone(KC.KS_ARCH_ARM, KC.KS_MODE_THUMB);
const cave = Buffer.from(ks.asm(src, {address: CAVE}));
if (CAVE + cave.length > CAVE_END) fail('Code cave too large: ' + cave.length);
const hook = Buffer.from(ks.asm(`b.w #${CAVE}\nnop`, {address: HOOK}));
if (hook.length !== 6) fail('Unexpected hook length ' + hook.length);

const out = new Map(mem);
hook.forEach((b, i) => out.set(HOOK + i, b));
cave.forEach((b, i) => out.set(CAVE + i, b));

// ---- show what will be written ----
await loadCapstone();
const cs = new Capstone(Const.CS_ARCH_ARM, Const.CS_MODE_THUMB | Const.CS_MODE_MCLASS);
const dump = (a, buf) => { for (const i of cs.disasm(buf, {address: a})) console.log('  ' + i.address.toString(16) + ': ' + i.mnemonic + ' ' + i.opStr); };
console.log(`Hook @ 0x${HOOK.toString(16)}:`); dump(HOOK, hook);
console.log(`Code cave @ 0x${CAVE.toString(16)} (${cave.length} bytes):`); dump(CAVE, cave);

// ---- write Intel HEX ----
const cks = bytes => ((-bytes.reduce((s, b) => s + b, 0)) & 0xff).toString(16).padStart(2, '0').toUpperCase();
const rec = (addr16, type, data) => {
  const b = [data.length, addr16 >> 8, addr16 & 0xff, type, ...data];
  return ':' + b.map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase() + cks(b);
};
const addrs = [...out.keys()].sort((a, b) => a - b);
const lines = [];
let curExt = -1, i = 0;
while (i < addrs.length) {
  const a = addrs[i], hi = a >>> 16;
  if (hi !== curExt) { lines.push(rec(0, 4, [hi >> 8, hi & 0xff])); curExt = hi; }
  const data = [out.get(a)];
  let j = i + 1;
  while (j < addrs.length && data.length < 16 && addrs[j] === addrs[j - 1] + 1 && (addrs[j] >>> 16) === hi) { data.push(out.get(addrs[j])); j++; }
  lines.push(rec(a & 0xffff, 0, data));
  i = j;
}
if (startRec) lines.push(startRec);
lines.push(':00000001FF');
const outBuf = Buffer.from(lines.join('\r\n') + '\r\n');
fs.writeFileSync(outHex, outBuf);
const changed = [...out.keys()].filter(a => mem.get(a) !== out.get(a)).length;
console.log(`\nWrote ${outHex}: ${changed} bytes differ from the original.`);
console.log('SHA-256 of output: ' + crypto.createHash('sha256').update(outBuf).digest('hex'));
