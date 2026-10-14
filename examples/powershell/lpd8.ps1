# Minimal Windows example (Windows PowerShell 5.1, uses winmm.dll, no extra software needed).
# Dot-source it, then:
#   . .\lpd8.ps1
#   $h = Open-Lpd8
#   Set-PadColor $h 0 127 0 0          # pad 0 idle colour red     (channel 1)
#   Set-PadColor $h 1 0 127 0 0 15     # pad 1 idle colour green   (channel 16)
#   Set-PadOn $h 2 $true               # light pad 2 with its "pressed" colour
#   Close-Lpd8 $h
$sig = @"
using System;using System.Runtime.InteropServices;
public class W{
[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Auto)]public struct OC{public ushort m,p;public uint v;[MarshalAs(UnmanagedType.ByValTStr,SizeConst=32)]public string n;public ushort t;public ushort v2;public ushort c;public uint s;}
[DllImport("winmm.dll",CharSet=CharSet.Auto)]public static extern uint midiOutGetDevCaps(IntPtr i,ref OC c,uint s);
[DllImport("winmm.dll")]public static extern uint midiOutGetNumDevs();
[DllImport("winmm.dll")]public static extern uint midiOutOpen(out IntPtr h,uint id,IntPtr cb,IntPtr inst,uint f);
[DllImport("winmm.dll")]public static extern uint midiOutShortMsg(IntPtr h,uint m);
[DllImport("winmm.dll")]public static extern uint midiOutClose(IntPtr h);
public static string Name(uint i){OC c=new OC();midiOutGetDevCaps((IntPtr)i,ref c,(uint)Marshal.SizeOf(c));return c.n;}
}
"@
Add-Type $sig

function Open-Lpd8 {
  for ($i = 0; $i -lt [W]::midiOutGetNumDevs(); $i++) {
    if ([W]::Name($i) -match 'LPD8') {
      $h = [IntPtr]::Zero
      [void][W]::midiOutOpen([ref]$h, $i, [IntPtr]::Zero, [IntPtr]::Zero, 0)
      return $h
    }
  }
  throw 'LPD8 MIDI output not found'
}
function Close-Lpd8($h) { [void][W]::midiOutClose($h) }
function Send-Short($h, $status, $d1, $d2) {
  [void][W]::midiOutShortMsg($h, [uint32]($status -bor ($d1 -shl 8) -bor ($d2 -shl 16)))
}

# pad 0..7, r/g/b 0..127; bank 0 = idle colour (CC 20..43), bank 1 = pressed colour (CC 64..87); ch 0..15
function Set-PadColor($h, [int]$pad, [int]$r, [int]$g, [int]$b, [int]$bank = 0, [int]$ch = 0) {
  $base = if ($bank -eq 0) { 20 } else { 64 }
  $i = 0
  foreach ($v in $r, $g, $b) { Send-Short $h (0xB0 + $ch) ($base + 3 * $pad + $i) $v; $i++ }
}
# light a pad with its "pressed" colour (assumes the default notes 36..43)
function Set-PadOn($h, [int]$pad, [bool]$on, [int]$ch = 9) {
  if ($on) { Send-Short $h (0x90 + $ch) (36 + $pad) 127 } else { Send-Short $h (0x80 + $ch) (36 + $pad) 0 }
}
