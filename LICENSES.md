# What is under what

Code in this repository is GPLv3 ([LICENSE](LICENSE)). Parts that came from elsewhere keep their own terms. Files are
copied byte for byte, so no licence header has been added to them; this table is the record.

| Path | What | Licence | Source |
|---|---|---|---|
| `voice/browser-client.js`, `voice/browser-worker.js`, `voice/speech.js` | The browser engine | GPLv3 (this repository) | Written for Doug Bristor in this project |
| `voice/safe_chain.js` | The speaker-safe output chain | GPLv3 here; the same file may exist under other terms in other projects of the same owner | Written for Doug Bristor in this project |
| `voice/vendor/ort/` (not in git) | ONNX Runtime Web 1.22.0 | MIT | github.com/microsoft/onnxruntime, tag v1.22.0 |
| `voice/vendor/phonemizer/` (not in git) | Piper phonemizer WebAssembly, English data only | The wrapper is MIT; the compiled **eSpeak NG** inside is **GPLv3**; the whole is conveyed under GPLv3 | github.com/diffusion-studio/piper-wasm, github.com/wide-video/piper-phonemize, github.com/rhasspy/espeak-ng |
| `voice/vendor/world/` (not in git) | WORLD vocoder, the parts used | Modified BSD | github.com/mmorise/World |
| `voice/models/` (not in git) | Voice model, northern_english_male (medium) | CC BY-SA 4.0 International | OpenSLR 83; huggingface.co/rhasspy/piper-voices |
| `voice/models/*-fp16weights.onnx` (not in git) | The same model with weights stored at half precision | CC BY-SA 4.0 International, as a derivative; attribution and changes in `voice/models/compact-manifest.json` | made from the model above |

## Open

- The model card says the voice was finetuned from the U.S. English "lessac" voice. The terms of that base voice's
  training data have not been checked here.
- When the binaries are added, the GPLv3 requires the corresponding source of the phonemizer to be available
  alongside it, and the English-only data selection to be reproducible. The upstream links above are the starting
  point; they are not yet a checked source offer.
