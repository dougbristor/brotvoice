"""Keep only English data; rebuild offsets, leaving engine bytecode unchanged."""
from pathlib import Path
import json, re, hashlib, shutil
root = Path(__file__).resolve().parents[2]
target = root / 'web/speaking_brot/vendor/phonemizer'
# Always start from the original pinned npm archive's extracted assets.
original = Path('/tmp/package/build')
script = (original / 'piper_phonemize.js').read_text()
data = (original / 'piper_phonemize.data').read_bytes()
match = re.search(r'loadPackage\((\{"files":.*?\})\)', script)
meta = json.loads(match[1]); output = bytearray(); kept = []
for item in meta['files']:
    name = item['filename'].removeprefix('/espeak-ng-data/')
    if name in ('en_dict', 'intonations', 'phondata', 'phondata-manifest', 'phonindex', 'phontab') or name.startswith('lang/gmw/en'):
        chunk = data[item['start']:item['end']]
        kept.append(dict(item, start=len(output), end=len(output)+len(chunk)))
        output.extend(chunk)
new = dict(files=kept, remote_package_size=len(output))
script = script[:match.start(1)] + json.dumps(new, separators=(',', ':')) + script[match.end(1):]
script += '\n// ESM export added by Speaking Brot; English data offsets rebuilt.\nexport default createPiperPhonemize;\n'
(target / 'piper_phonemize.js').write_text(script)
(target / 'piper_phonemize.data').write_bytes(output)
(target / 'english-data-manifest.json').write_text(json.dumps(dict(
    package='@diffusionstudio/piper-wasm@1.0.0', originalBytes=len(data), englishBytes=len(output),
    originalSha256=hashlib.sha256(data).hexdigest(), englishSha256=hashlib.sha256(output).hexdigest(), files=kept), indent=2))
# These were exploratory copies; the Piper-compatible engine above replaces them.
unused = root / 'web/speaking_brot/vendor/espeak'
if unused.exists(): shutil.rmtree(unused)
print(f'Pronunciation data: {len(data):,} -> {len(output):,} bytes ({len(kept)} files).')
