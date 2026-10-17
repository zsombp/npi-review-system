# The app's interface sounds

Version 2.0.0, 2026-10-16 (D-070). The six are the Pop set of the sound lab (`docs/design/lab/sounds-2026-10-16/`,
LAB-NOTES.md), made by `web/scripts/sounds.py` v2.0.0, which runs the lab's synthesis; run it again to make the same
files. v1.0.x (2026-09-26 and 27) cut them from the intro video's effects. Measured, those put 92.5 % of approve's energy
below 300 Hz, where a phone cannot play it, started it 39 ms after the press, and spread the six over 14.7 dB of
loudness. They are retired.

They play only when a person has switched Hangok on in Beállítások, Megjelenés (the default is Ki), only after that
person's own action, never on arrival and never in a loop (`web/src/lib/sound.ts`), each within a second of the press it
answers (`web/src/lib/feedback.ts`); the service worker keeps each file once it was fetched (`web/public/sw.js`), and a
new build's worker drops the old cache, so a deploy replaces them. No sound says anything the screen does not also say.
Papír and Üveg, the other two sets of D-070, come with the picker.

## Source and licence

Synthesised in-house from nothing: numpy and the intro video's DSP toolkit
(`docs/design/lab/video-2026-09-26/audio/src/dsp.py`); no samples, presets, loops or downloads. Nothing limits their use.

## The files

MP3, mono, 48 kHz, 64 kb/s CBR (LAME): the same names and format as before, so `web/src/lib/sound.ts` is unchanged.
Each decodes in ffmpeg and in macOS Core Audio (afconvert), the decoder Safari's Web Audio uses on a Mac.

| File | Bytes | Length | Onset | Loudness (L100) | True peak | Pitch | When | What |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| approve.mp3 | 2370 | 187 ms | 0.2 ms | -21.5 dB | -10.1 dBTP | C#6 | Jóváhagyás | A soft contact, a little weight and a pop springing up an octave to C#6, past it by about a semitone, settling |
| skip.mp3 | 1980 | 159 ms | 11.2 ms | -24.4 dB | -12.8 dBTP | noise | Nem válaszolok | A card swinging away: band noise falling from 2.8 kHz to 900 Hz |
| undo.mp3 | 1788 | 124 ms | 6.8 ms | -23.5 dB | -13.8 dBTP | C#6 to C#5 | Visszavonom | The approve's pop run backwards, stopping on a soft wooden tock on A5 |
| done.mp3 | 7740 | 881 ms | 0.4 ms | -18.4 dB | -9.1 dBTP | A6 | The queue emptied (instead of approve or skip) | The intro video's hook, quickly: A5, C#6, E6 popping up, A6 landing with a marimba body, the Kész sticker and a glint |
| tick.mp3 | 1019 | 42 ms | 0.2 ms | -27.6 dB | -13.0 dBTP | A6 | A chip, a switch or a toggle whose state the press changed | A tiny wood block |
| error.mp3 | 3326 | 306 ms | 0.8 ms | -21.4 dB | -11.6 dBTP | E5 to C#5 | A request the person started did not go through; the reason is on screen | Two round notes falling a minor third, each sagging a little |

Onset is when the sound first reaches a tenth of its peak; skip and undo swell by design. L100 is the loudness of the
loudest 100 ms (K-weighted, the BS.1770 filter): 9.2 dB from the tick to the done moment, by intent. Through a
phone-speaker filter (nothing under 500 Hz) none loses more than 0.1 dB. Every pitch is a note of A major pentatonic, the
key of the intro video's hook, so two sounds that overlap never clash.
