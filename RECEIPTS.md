# Brotvoice receipts

Till receipts: newest first, one per change a reader can see and one per correction. Each is short, and enough to
trace the change back to its commit.

- **change**: what changed, who asked for it, the check that proves it (and the planted fault that check catches), and
  the commit.
- **correction**: what was claimed before, what was wrong with it, and what made someone look.

## 2026-11-01 · change · eSpeak data files verified by a native build

- **What:** `SOURCE.md`: the eSpeak NG data row goes from inferred / six files unverified to verified. A native build of
  espeak-ng at `8593723f` was run by Doug's go (he ran it himself after the permission guard stopped the agent); its six
  compiled files equal, byte for byte, the corresponding slices of the served `piper_phonemize.data` (`8b009e05…`).
- **Checked by:** a script compared each of the six files, size and sha256, against the offsets in the trim manifest;
  all six match (en_dict 71bd330b…, intonations 3f8af65f…, phondata 4e028895…, phondata-manifest 7b387af0…,
  phonindex 3ca7b8fa…, phontab 886f3fa4…). A planted difference was not tried; the sizes and offsets also agree.
- **Still not checked:** the piper-phonemize pin (inferred), emsdk 3.1.47 (stated), and whether the WASM rebuilds to the
  same bytes (untested).

## 2026-11-01 · change · source offer for the phonemizer, worker brought up to date

- **What:** `SOURCE.md` (each served phonemizer file with its hash, the pinned upstream source, and what is verified,
  inferred or unchecked); `source/trim_phonemizer.py` (verbatim); `voice/browser-worker.js` replaced whole by the
  fixed worker (sha256 `225bf065…`, caro's byte-final stamp; the repository's copy was older than the 2026-10-19 fix);
  `MANIFEST.sha256` line for the worker updated; `LICENSES.md` and `README.md` point at the source offer.
  `voice/ATTRIBUTION.md` is left as the build's copy and still matches the manifest.
- **Asked:** Doug Bristor, 2026-11-01: publish the source for the GPL parts, keep copies of the upstream source on GitHub under their licences so the offer holds if upstream goes, and say plainly that this project adds nothing new to the phonemizer. Source packet and checks by caro. The six upstream archives (hashes in `SOURCE.md`, re-checked against caro's `SHA256SUMS` on push) are assets of the release `source-20261101`.
- **Checked by:** the 12 text files verify against the manifest; the five phonemizer hashes in the manifest equal the
  served hashes in `SOURCE.md`; the trim reproduction (caro, 2026-11-01) matches the served files byte for byte; caro's
  browser parity run passed on the worker (274/274 plans, 4/4 lowercase-break changes, Firefox and Chromium).
- **Not checked:** the six compiled eSpeak data files (native build planned), the pins marked inferred, and whether the
  published WASM rebuilds to the same bytes. `SOURCE.md` says so. The host copy of the worker still needs the same bytes
  uploaded.

## 2026-10-17 · change · repository created

- **What:** the engine code, the licence layout and the hash manifest of the 21-file voice as built; no binaries.
- **Asked:** Doug Bristor: put the voice on git, with its timestamp, before it appears on the web host. Licence GPLv3
  and name `brotvoice` chosen by Doug Bristor.
- **Checked by:** the 12 text files here all verify against the manifest, and the five engine and attribution files
  are byte-identical to their working copies. All 21 hashes in the manifest equal both the voice list from the page
  builder and the list of the files staged for the host. The manifest check fails when one byte of a file is
  changed (tried on a copy: `voice/speech.js` reported FAILED). Fable read the whole repository before it was published and checked the model's
  base-voice licence at source (non-commercial research data), which I re-read at the Edinburgh page; the README and
  LICENSES.md now say to treat the model as non-commercial. Fable also found that `voice/ATTRIBUTION.md` names parts
  that are not in this build, which LICENSES.md now says. The README's paragraph on the Bristorian orbit and the voice
  is Doug's wording, relayed by caro. Not yet read by anyone else.
