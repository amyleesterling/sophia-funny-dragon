"""Extract the supplied celebration into an animation-only GLB for Sophia's existing rig."""
import sys,copy
from pathlib import Path
from prepare_models import read_glb,pack
source=Path(sys.argv[1]);doc,data=read_glb(source)
# Keep named hierarchy and transforms so GLTFLoader produces matching track names.
for node in doc['nodes']:
    node.pop('mesh',None);node.pop('skin',None)
for key in ['meshes','skins','images','textures','materials','samplers']:
    doc.pop(key,None)
used=sorted({s[k] for a in doc['animations'] for s in a['samplers'] for k in ['input','output']})
accessors=[];views=[];blob=bytearray()
for old in used:
    a=copy.deepcopy(doc['accessors'][old]);v=copy.deepcopy(doc['bufferViews'][a['bufferView']]);start=v.get('byteOffset',0)
    blob.extend(b'\0'*(-len(blob)%4));v['byteOffset']=len(blob);blob.extend(data[start:start+v['byteLength']]);a['bufferView']=len(views);views.append(v);accessors.append(a)
for animation in doc['animations']:
    for sampler in animation['samplers']:
        for key in ['input','output']:sampler[key]=used.index(sampler[key])
doc['accessors']=accessors;doc['bufferViews']=views
out=Path(__file__).resolve().parents[1]/'assets/models'/(sys.argv[2] if len(sys.argv)>2 else 'sophia-level-complete.glb');out.write_bytes(pack(doc,bytes(blob)));print(out.name,out.stat().st_size)
