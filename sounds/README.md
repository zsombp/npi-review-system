# The app's interface sounds

Version 1.0.1, 2026-09-27 (v1.0.0, 2026-09-26, candy: the Hangok setting). v1.0.1, the candy fix after the Codex
review: when the tick and the error play is narrower (the table), each sound comes within a second of the press it
answers or not at all (`web/src/lib/feedback.ts`), and the service worker keeps each file once it was fetched
(`web/public/sw.js` v0.2.1). The files did not change. Made by `web/scripts/sounds.py` v1.0.0; run it again
to make the same files.

They play only when a person has switched Hangok to Be in Beállítások, Megjelenés (the default is Ki), only
after that person's own action, never on arrival and never on a loop (`web/src/lib/sound.ts`). No sound says
anything the screen does not also say.

## Source and licence

Every file is made from the one-shots in `docs/design/lab/video-2026-09-26/audio/sfx/lib/`, which
`audio/src/sfx.py` synthesised in-house for the intro video from nothing (numpy; no samples, presets, loops
or downloads; `audio/SOUND.md` section 7). Nothing limits their use. Nothing new was synthesised for the
app: each sound is one or more of those files, trimmed, faded, sometimes reversed or slowed, mixed to mono
and levelled.

## The files

MP3, mono, 48 kHz, 64 kb/s CBR (LAME), peak about -12 dBFS as decoded. MP3 because every browser's Web
Audio decodes it, the Chromium that Playwright drives included, which has no AAC. Each file decodes in
ffmpeg and in macOS Core Audio (afconvert), the decoder Safari's Web Audio uses on a Mac; both honour the
encoder delay, so a sound starts on its first millisecond.

| File | Bytes | Length | Peak (decoded) | When | Made from |
| --- | --- | --- | --- | --- | --- |
| approve.mp3 | 4482 | 0.480 s | -12.5 dBFS | Jóváhagyás: the stamp comes down, a thump and the ink | stamp-1.wav, 0.14 to 0.62 s: the last 60 ms of its swish, then the thump |
| skip.mp3 | 3132 | 0.300 s | -11.5 dBFS | Nem válaszolok: a card swings out | card-leave-1.wav, 0.24 to 0.54 s: the swish, peaking at 150 ms |
| undo.mp3 | 1403 | 0.096 s | -12.5 dBFS | Visszavonom: a quick rewind blip | badge-blip-1.wav reversed and played 1.25 times as fast |
| done.mp3 | 7356 | 0.830 s | -12.4 dBFS | The queue emptied: a small pop fanfare | star-blip-1.wav (A5) at 0, star-blip-3.wav (C#6) at 70 ms, star-blip-4.wav (E6) at 140 ms, star-full-1.wav at 230 ms |
| tick.mp3 | 1211 | 0.065 s | -12.6 dBFS | A chip, a switch or a toggle whose state the press changed (and the press on Be) | chip-click-1.wav, 0 to 65 ms |
| error.mp3 | 2366 | 0.200 s | -12.0 dBFS | A request the person started on Válaszok did not go through; the reason is on screen | word-pop-1.wav played at 0.55 of its speed, about ten semitones lower |

Fades are raised-cosine at both ends (0.4 to 15 ms in, 8 to 80 ms out), so no file starts or ends with a
click. The lengths are those of the sounds; an MP3 decoder rounds a file up to whole 1152-sample frames of
silence.
