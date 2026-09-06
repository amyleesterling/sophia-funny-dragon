"""Create mobile GLBs from the supplied originals without changing mesh geometry.
Usage: python3 tools/prepare_models.py /path/to/originals
Requires Pillow. Original uploads are never modified.
"""
import io
import json
import struct
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    ('Meshy_AI_Sparkly_Rainbow_Cowgi_biped_Animation_Running_withSkin.glb', 'sophia-running'),
    ('Meshy_AI__0905161735_texture.glb', 'dragon-one'),
    ('Meshy_AI__0905161811_texture.glb', 'dragon-two'),
    ('Meshy_AI__0906140638_texture_clown_dragon.glb', 'clown-dragon'),
    ('Meshy_AI_Snugglehorn_the_Purpl_0905161824_texture.glb', 'snugglehorn'),
]

def read_glb(path):
    data = path.read_bytes()
    assert data[:4] == b'glTF'
    length = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + length])
    return doc, data[28 + length:]

def pack(doc, blob):
    doc['buffers'][0]['byteLength'] = len(blob)
    header = json.dumps(doc, separators=(',', ':')).encode()
    header += b' ' * (-len(header) % 4)
    blob += b'\0' * (-len(blob) % 4)
    return (struct.pack('<4sII', b'glTF', 2, 28 + len(header) + len(blob))
            + struct.pack('<II', len(header), 0x4E4F534A) + header
            + struct.pack('<II', len(blob), 0x004E4942) + blob)

def main():
    source_dir = Path(sys.argv[1])
    dest = ROOT / 'assets/models'
    dest.mkdir(parents=True, exist_ok=True)
    manifest = []
    for original, slug in SOURCES:
        src = source_dir / original
        doc, old = read_glb(src)
        image_views = {im['bufferView']: i for i, im in enumerate(doc['images'])}
        blob = bytearray()
        for index, view in enumerate(doc['bufferViews']):
            start, length = view.get('byteOffset', 0), view['byteLength']
            part = old[start:start + length]
            if index in image_views:
                image_index = image_views[index]
                im = Image.open(io.BytesIO(part)).convert('RGB')
                im.thumbnail((1024, 1024) if image_index == 0 else (512, 512), Image.Resampling.LANCZOS)
                out = io.BytesIO()
                im.save(out, format='JPEG', quality=88 if image_index == 0 else 86, subsampling=0, optimize=True)
                part = out.getvalue()
                doc['images'][image_index]['mimeType'] = 'image/jpeg'
            blob.extend(b'\0' * (-len(blob) % 4))
            view['byteOffset'], view['byteLength'] = len(blob), len(part)
            blob.extend(part)
        target = dest / (slug + '.glb')
        target.write_bytes(pack(doc, bytes(blob)))
        record = {'source': original, 'file': target.name, 'source_bytes': src.stat().st_size,
                  'bytes': target.stat().st_size, 'geometry': 'unchanged', 'rigged': bool(doc.get('skins')), 'animations': [a.get('name', '') for a in doc.get('animations', [])]}
        manifest.append(record)
        print(f'{target.name}: {record["source_bytes"]:,} -> {record["bytes"]:,} bytes')
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
