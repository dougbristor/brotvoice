# What is under what

Code in this repository is GPLv3 ([LICENSE](LICENSE)). Parts that came from elsewhere keep their own terms. Files are
copied byte for byte, so no licence header has been added to them; this table is the record.

| Path | What | Licence | Source |
|---|---|---|---|
| `voice/browser-client.js`, `voice/browser-worker.js`, `voice/speech.js` | The browser engine | GPLv3 (this repository) | Written for Doug Bristor in this project |
| `voice/safe_chain.js` | The speaker-safe output chain | GPLv3 here; the same file may exist under other terms in other projects of the same owner | Written for Doug Bristor in this project |
| `voice/vendor/ort/` (not in git) | ONNX Runtime Web 1.22.0 | MIT | github.com/microsoft/onnxruntime, tag v1.22.0 |
| `voice/vendor/phonemizer/` (not in git); `source/` | Piper phonemizer WebAssembly, English data only; the trim script is in `source/` | The wrapper is MIT; the compiled **eSpeak NG** inside is **GPLv3**; the whole is conveyed under GPLv3 | github.com/diffusion-studio/piper-wasm, github.com/wide-video/piper-phonemize, github.com/rhasspy/espeak-ng |
| `voice/vendor/world/` (not in git) | WORLD vocoder, the parts used | Modified BSD | github.com/mmorise/World |
| `voice/models/` (not in git) | Voice model, northern_english_male (medium) | CC BY-SA 4.0 International for the finetuning data; the base voice's terms are open, see below | OpenSLR 83; huggingface.co/rhasspy/piper-voices |
| `voice/models/*-fp16weights.onnx` (not in git) | The same model with weights stored at half precision | CC BY-SA 4.0 International, as a derivative; attribution and changes in `voice/models/compact-manifest.json` | made from the model above |

## Open

- **The voice model's base.** The model was finetuned from Piper's en_US "lessac" voice, which was trained on the
  Blizzard 2013 Lessac data, licensed for non-commercial research use only
  (cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html). The model's CC BY-SA 4.0 covers the
  OpenSLR 83 data it was finetuned on; it does not settle the base voice's terms. Whether a finetuned model's
  weights carry the terms of the data its base was trained on is unsettled. Until it is resolved, treat the model as
  for non-commercial use. The code in this repository is unaffected. A clean route, if wanted, is a base voice
  trained from scratch on open data.
- **`voice/ATTRIBUTION.md` is the build's attribution, copied as it came.** It also names parts that are not in this
  build (a second voice and an int8 derivative) and points to working notes that are not in this repository. The
  shipped set is the 21 files in `MANIFEST.sha256`.
- **Source offer.** [SOURCE.md](SOURCE.md) is the Corresponding Source offer for the phonemizer: each served file with
  its hash, the pinned upstream source, and what is verified, inferred or not yet checked. The English-only data
  selection script is in [`source/trim_phonemizer.py`](source/trim_phonemizer.py). The upstream archives are kept as assets
  of the `source-20261101` release. The six compiled eSpeak data files were rebuilt natively
  from the pinned commit and match the served ones byte for byte; what stays unchecked is listed there.
