# The app's interface sounds

Version 3.0.0, 2026-10-17 (D-070, D-071; BUILD-PLAN K0 section 5). The three sets of the sound lab
(`docs/design/lab/sounds-2026-10-16/`, LAB-NOTES.md), Pop, Papír and Üveg, one folder each, six files a set, made by
`web/scripts/sounds.py` v3.0.0, which runs the lab's synthesis; run it again to make the same bytes. A person picks one
in Hangok (Ki, Pop, Papír, Üveg; Ki by default), and `web/src/lib/sound.ts` loads only that set's folder.

v2.0.0 (2026-10-16) put Pop at the root of this folder. Those six files stay where they are, for a tab still on the old
build that asks for them there; `pop/` is the same bytes (and so the same decoded audio, sample for sample). v1.0.x
(2026-09-26 and 27) cut the six from the intro video's effects; they are retired (D-070).

They play only when a person has picked a set in Beállítások, Megjelenés, only after that person's own press, never on
arrival and never in a loop (`web/src/lib/sound.ts`), each within a second of the press it answers
(`web/src/lib/feedback.ts`). The service worker keeps each file by its own address once it was fetched
(`web/public/sw.js`), and a new build's worker drops the old cache, so a deploy replaces them. No sound says anything the
screen does not also say.

## Source and licence

Synthesised in-house from nothing: numpy and the intro video's DSP toolkit
(`docs/design/lab/video-2026-09-26/audio/src/dsp.py`); no samples, presets, loops or downloads. Nothing limits their use.

## The files

`<set>/<name>.mp3`, with `<set>` one of `pop`, `papir`, `uveg` and the same six names in each. MP3, mono, 48 kHz,
64 kb/s CBR (LAME), as before. Every file decodes in ffmpeg and in macOS Core Audio (afconvert), the decoder Safari's Web
Audio uses on a Mac (measured 2026-10-17 by `sounds.py` v3.0.0).

Onset is when the sound first reaches a tenth of its peak; skip and undo swell by design. L100 is the loudness of the
loudest 100 ms (K-weighted, the BS.1770 filter). Phone is how much L100 changes through a phone-speaker filter (nothing
under 500 Hz); every pitch is a note of A major pentatonic, the key of the intro video's hook, so two sounds that overlap
never clash. The three sets share lengths and loudness targets, so a choice between them is one of character.

### pop/ (the identity's own, the first option)

| File | Bytes | Length | Onset | Loudness (L100) | True peak | Phone | Pitch | When | What |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| approve.mp3 | 2370 | 187 ms | 0.2 ms | -21.5 dB | -10.1 dBTP | +0.4 dB | C#6 | Jóváhagyás | A soft contact, a little weight and a pop springing up an octave to C#6, past it by about a semitone, settling |
| skip.mp3 | 1980 | 159 ms | 11.2 ms | -24.4 dB | -12.8 dBTP | +2.0 dB | noise | Nem válaszolok | A card swinging away: band noise falling from 2.8 kHz to 900 Hz |
| undo.mp3 | 1788 | 124 ms | 6.8 ms | -23.5 dB | -13.8 dBTP | +0.8 dB | C#6 to C#5 | Visszavonom | The approve's pop run backwards, stopping on a soft wooden tock on A5 |
| done.mp3 | 7740 | 881 ms | 0.4 ms | -18.4 dB | -9.1 dBTP | +2.2 dB | A6 | The queue emptied (instead of approve or skip) | The intro video's hook, quickly: A5, C#6, E6 popping up, A6 landing with a marimba body, the Kész sticker and a glint |
| tick.mp3 | 1019 | 42 ms | 0.2 ms | -27.6 dB | -13.0 dBTP | +2.5 dB | A6 | A chip, a switch or a toggle whose state the press changed | A tiny wood block |
| error.mp3 | 3326 | 306 ms | 0.8 ms | -21.4 dB | -11.6 dBTP | -0.1 dB | E5 to C#5 | A request the person started did not go through; the reason is on screen | Two round notes falling a minor third, each sagging a little |

9.25 dB from the tick to the done moment, by intent; through the phone filter none loses more than 0.1 dB.

### papir/ (desk and paper, almost no pitch)

| File | Bytes | Length | Onset | Loudness (L100) | True peak | Phone | Pitch | When | What |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| approve.mp3 | 2002 | 136 ms | 0.0 ms | -21.5 dB | -9.3 dBTP | +1.4 dB | noise | Jóváhagyás | A rubber stamp on a card at desk height, its body at 230 to 330 Hz, where a phone still plays it |
| skip.mp3 | 2188 | 159 ms | 3.2 ms | -24.3 dB | -13.2 dBTP | +1.8 dB | noise | Nem válaszolok | A fingernail flick and a card flicked away: band noise falling from 3.2 kHz to 1.3 kHz, with paper grain |
| undo.mp3 | 1996 | 131 ms | 12.9 ms | -23.2 dB | -9.5 dBTP | +2.0 dB | noise | Visszavonom | The card sliding back and landing |
| done.mp3 | 3916 | 398 ms | 0.1 ms | -18.4 dB | -9.8 dBTP | +1.5 dB | noise | The queue emptied (instead of approve or skip) | A stamp, the Kész sticker coming down and slapped flat, paper settling |
| tick.mp3 | 1035 | 32 ms | 0.0 ms | -27.5 dB | -9.8 dBTP | +1.2 dB | noise | A chip, a switch or a toggle whose state the press changed | A switch's two clicks, the press and the release |
| error.mp3 | 2382 | 193 ms | 0.1 ms | -21.5 dB | -8.4 dBTP | +0.6 dB | noise | A request the person started did not go through; the reason is on screen | Two dull knocks on card |

9.1 dB from the tick to the done moment; through the phone filter none loses anything.

### uveg/ (glass and air, calm and bright)

| File | Bytes | Length | Onset | Loudness (L100) | True peak | Phone | Pitch | When | What |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| approve.mp3 | 4880 | 510 ms | 0.3 ms | -21.5 dB | -14.6 dBTP | +1.7 dB | E6 | Jóváhagyás | A struck glass on E6 (free-bar partials 1, 2.756, 5.404 and 8.933) with a slow shimmer |
| skip.mp3 | 1994 | 154 ms | 11.1 ms | -24.4 dB | -11.8 dBTP | +0.2 dB | noise | Nem válaszolok | A breath: band noise falling from 6 kHz to 2.5 kHz |
| undo.mp3 | 1994 | 151 ms | 5.7 ms | -23.5 dB | -15.0 dBTP | +1.7 dB | E6 | Visszavonom | The approve's glass reversed, swelling to a light touch |
| done.mp3 | 9675 | 1100 ms | 0.4 ms | -18.6 dB | -11.0 dBTP | +2.5 dB | A6, C#7, E7 over A5 | The queue emptied (instead of approve or skip) | Three small bells, A6, C#7 and E7, over an A5 bowl, and air |
| tick.mp3 | 1033 | 36 ms | 0.1 ms | -27.5 dB | -13.8 dBTP | +2.2 dB | A7 | A chip, a switch or a toggle whose state the press changed | A crystal tick |
| error.mp3 | 3340 | 308 ms | 0.2 ms | -21.4 dB | -11.1 dBTP | +0.0 dB | E5 to C#5 | A request the person started did not go through; the reason is on screen | A glass bowl muted by a hand, twice, falling a minor third |

8.9 dB from the tick to the done moment; through the phone filter none loses anything.

### The root (v2.0.0's Pop, for the old build)

`approve.mp3`, `skip.mp3`, `undo.mp3`, `done.mp3`, `tick.mp3`, `error.mp3`: byte for byte `pop/`. Nothing in this build
asks for them; `sounds.py --root` writes them again.
