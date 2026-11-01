# Brotvoice

**Status: working prototype code, no binaries in git yet.** Brotvoice is the voice behind the Brot: type a sentence
in the browser and hear it read aloud in a voice font, with no server and no speech service. It runs a small
text-to-speech model and the phoneme front end in the page. The same engine is meant to serve any application that
wants a Brot voice, such as the Brotoid page and the Brotophone link.

**Website: [bristorbrot.org](https://bristorbrot.org)** · Licence: **GPLv3** (see [LICENSES.md](LICENSES.md) for what is
under what)

## What to expect

Brotvoice aims for a distinct English-speaking voice that sounds non-human. Doug finds the current result ideal for
the Brot. A Bristorian orbit modulates the synthesis, but its audible contribution may be subtle or add little
flavour; a unique perceptual benefit has not been established. That the voice suits the Brot is Doug's judgement of
the sound, not a finding about the orbit.

## What is here

- `voice/browser-client.js`, `voice/browser-worker.js`, `voice/speech.js`: the engine. A page asks for speech, a
  worker does all the work (phonemes, the model, the voice font), and one buffer is used both for playback and for
  WAV export. Nothing leaves the page, and cancelling stops synthesis at once. `speech.js` also has an optional
  development path to a local Python voice service (`?engine=python`); that server is not in this repository, and the
  default is the browser engine.
- `voice/safe_chain.js`: the output chain every sound passes through (high-pass and low-pass cuts, a limiter, a hard
  clip and a volume cap), kept after laptop speakers were damaged by an earlier sound engine.
- `voice/ATTRIBUTION.md`, the licence texts and model card, and the manifests: where each part comes from.
- [`SOURCE.md`](SOURCE.md) and `source/`: the source offer for the GPL phonemizer, with the script that trims its data. The phonemizer is upstream's, re-mediated for this site; this project adds nothing new to it.
- [`MANIFEST.sha256`](MANIFEST.sha256): the SHA-256 of all 21 files of the voice as built, including the ones that
  are not in this repository (the model, the WebAssembly engines and the phoneme data). It records exactly which
  bytes were meant, so a copy of the voice anywhere can be checked against it:
  `sha256sum -c MANIFEST.sha256` run in a folder that has all 21 files.

## What is not here yet

- The binaries: the voice model (about 32 MB), the speech runtime, the phonemizer and the WORLD vocoder. They are
  named and hashed in the manifest, and the source for each is linked from `voice/ATTRIBUTION.md`. They will be
  added when the licence layout for redistributing them is settled.
- Speech to text on the device (not started), voice cloning and coordinate-addressed voices (not done). Voice fonts
  so far are small recipes over one shared base voice.
- A test suite in this repository. The prototype was checked in its home workspace; those checks move here with the
  code.

## Licence

Code is [GPLv3](LICENSE), because the phonemizer WebAssembly contains eSpeak NG (GPLv3) and the engine calls
straight into it. The voice model keeps its own licence, CC BY-SA 4.0 for its finetuning data, **but it was finetuned
from a base voice trained on non-commercial research data, so treat the model as for non-commercial use until that is
resolved** (see [LICENSES.md](LICENSES.md)). Other included parts keep theirs. Copyright
(c) 2026 Doug Bristor. [LICENSES.md](LICENSES.md) lists every file's terms.

Brotvoice is a leaf: other projects use it, and nothing from it flows back into the MIT projects
([bristorbrot](https://github.com/dougbristor/bristorbrot) and the others).
