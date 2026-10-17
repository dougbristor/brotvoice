# Brotvoice receipts

Till receipts: newest first, one per change a reader can see and one per correction. Each is short, and enough to
trace the change back to its commit.

- **change**: what changed, who asked for it, the check that proves it (and the planted fault that check catches), and
  the commit.
- **correction**: what was claimed before, what was wrong with it, and what made someone look.

## 2026-10-17 · change · repository created

- **What:** the engine code, the licence layout and the hash manifest of the 21-file voice as built; no binaries.
- **Asked:** Doug Bristor: put the voice on git, with its timestamp, before it appears on the web host. Licence GPLv3
  and name `brotvoice` chosen by Doug Bristor.
- **Checked by:** the 12 text files here all verify against the manifest, and the five engine and attribution files
  are byte-identical to their working copies. All 21 hashes in the manifest equal both the voice list from the page
  builder and the list of the files staged for the host. The manifest check fails when one byte of a file is
  changed (tried on a copy: `voice/speech.js` reported FAILED). No reader has reviewed the README yet.
