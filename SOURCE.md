# Source for the phonemizer (GPLv3 Corresponding Source offer)

The voice served at [bristorbrot.org](https://bristorbrot.org) uses a phonemizer made from **eSpeak NG**, which is GPLv3.
This page says what is served, where the source of each part is, and how much of that has been checked. Where something
is inferred or unchecked it says so.

Everything named below is public.

## What is served

In `lib/voice/` on the host (not in this repository; hashed in [`MANIFEST.sha256`](MANIFEST.sha256) and below):

| file | bytes | sha256 | what it is |
|---|---|---|---|
| `piper_phonemize.wasm` | 635212 | `b777cd107a91d2bcc6a1ea46f2c26a662a7407394fe84589198aeaa83dd7a9d6` | the compiled program (eSpeak NG inside), **unchanged** from upstream |
| `piper_phonemize.data` | 838072 | `8b009e0567b18a3374d39507fe09e8c63c395c3d4ea59e5e81f965bd247c584b` | eSpeak NG data, **trimmed** to 14 English files |
| `piper_phonemize.js` | 84208 | `557e64439befd3c1079d377a1ad575bc83c03067cb70143c6ac37226ed76eca6` | Emscripten loader glue, **two edits** (below) |
| `english-data-manifest.json` | | `45544fd6c4aa2c7b17e731cb92ff1ae0b8a1bf7f1a1b138b79f4ac9f8cf1c931` | the kept files and their offsets |
| `ESPEAK-LICENSE` | | `3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986` | GPLv3 text |

## What we did, and did not, do

- **We did not build the WASM.** It is byte-identical to the one in the npm package
  `@diffusionstudio/piper-wasm@1.0.0`. **Verified:** both are sha256 `b777cd10…` (full hash above).
- **We changed data and loader glue, never engine code.** [`source/trim_phonemizer.py`](source/trim_phonemizer.py) keeps
  14 English files of the eSpeak NG data pack, rebuilds their offsets in the `.js` loader, and appends the line
  `export default createPiperPhonemize;`. The `.js` edits are exactly two: the `loadPackage` file table, and that one
  line. The script is the verbatim record, as run on 2026-10-16; it reads its input from `/tmp/package/build`, the
  extracted npm tarball.
- **The trim reproduces.** **Verified (2026-11-01):** run on a freshly downloaded npm tarball, the unmodified script's
  outputs (`.data`, `.js`, manifest) match the served files byte for byte. The upstream `.data` it started from is sha256
  `29f1025eb23a5b5c192cd14a6efbce4509402ff265405072ee6f7d1a09b78f8c`, 18,077,249 bytes.

## Where the source is

| what | location | pin | status |
|---|---|---|---|
| npm package taken | registry.npmjs.org `@diffusionstudio/piper-wasm` | 1.0.0 (2024-07-05); sha1 `42c15fec08bf8af3f167d5c5285a61cd0f789120` | **Verified** against the registry |
| package repository | github.com/diffusion-studio/piper-wasm | `69522c832bd52d7c16389e9a8aee568065027689` | the only commit before publish |
| build instructions | github.com/wide-video/piper-wasm | `7a9170ab4b58c241e472fea8d6f67d0e5ca5ac21` | HEAD at publish |
| piper-phonemize (the compiled program; MIT) | github.com/wide-video/piper-phonemize | `cfff8e52ebaea37c7e953ae2d06b174acb827ac4` | **Inferred.** The recipe clones without a pin; this was HEAD at publish and nothing came after |
| eSpeak NG **engine** in the WASM | github.com/rhasspy/espeak-ng | `0f65aa301e0d6bae5e172cc74197d32a6182200f` | pinned by URL in piper-phonemize's `CMakeLists.txt` |
| eSpeak NG **data** in `.data` | github.com/rhasspy/espeak-ng | `8593723f10cfd9befd50de447f14bf0a9d2a14a4` | **Inferred** the same way. **Partly verified:** the 8 `lang/gmw/en*` files match the source byte for byte. The 6 compiled files (`en_dict`, `intonations`, `phondata`, `phondata-manifest`, `phonindex`, `phontab`) are **not yet verified**; that needs a native build of espeak-ng, which is planned |

## What is not known

- Whether the published WASM came from exactly the published recipe. The recipe (from the package README) names
  emsdk **3.1.47**; that version is stated, **not checked**.
- Whether rebuilding from the pins above gives the same WASM bytes. **Not tested.** The WASM we serve is upstream's own
  binary, so we have not needed to.

## Archives

Archive tarballs of every commit above, and the npm tarball, are kept by the project with SHA-256 hashes, so the source
does not depend on the upstream repositories staying up.

**Pending Doug's decision:** where they are published (a release asset or the project's server; not repository history,
about 59 MB). Their hashes:

    482f1ace6a5ebce46c30e1a906daf9004fc6d16a760de647e1112273e1cdc27b  diffusion-studio_piper-wasm-69522c832bd52d7c16389e9a8aee568065027689.tar.gz
    37ebbabb010200be8ec26c61b770e93f964f4503a329d7d74c239a1a40051e43  rhasspy_espeak-ng-0f65aa301e0d6bae5e172cc74197d32a6182200f.tar.gz
    41c199da1355deec93eab6065be99d00b938dd452e78f282ab481db91657e4e4  rhasspy_espeak-ng-8593723f10cfd9befd50de447f14bf0a9d2a14a4.tar.gz
    7029b52aabc2512d36f4d98c6ede732c48a0e7128d0cd0e62379dfcee770038e  wide-video_piper-phonemize-cfff8e52ebaea37c7e953ae2d06b174acb827ac4.tar.gz
    8fba3b3abf51247e80d5b9b4305064a679bcab12ad2c6cd866e8c3fee6099e50  wide-video_piper-wasm-7a9170ab4b58c241e472fea8d6f67d0e5ca5ac21.tar.gz

The npm tarball `piper-wasm-1.0.0.tgz` (9204429 bytes) is the registry's own file:

    e5be7f15b3ec42b09fca3616db2ce3e2cf83faacc9c291c400ccf48a9d85c803  piper-wasm-1.0.0.tgz

## Scope

This covers the phonemizer. The voice model is not GPL and is not covered here; see [LICENSES.md](LICENSES.md).
