import * as T from 'three';
import fs from 'node:fs';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createColonyCampus } from '../src/components/colonyCampus.ts';
class Reader{readAsArrayBuffer(blob){blob.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(r=>{this.result='data:'+blob.type+';base64,'+Buffer.from(r).toString('base64');this.onloadend?.();});}}
globalThis.FileReader=Reader;
const {root,panelCount}=createColonyCampus(new T.Texture());
root.traverse(o=>{if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.map=null);}});
const glb=await new GLTFExporter().parseAsync(root,{binary:true});
fs.writeFileSync('public/models/EVA03-campus.glb',Buffer.from(glb));
console.log(JSON.stringify({panelCount,bytes:glb.byteLength,dimensions:new T.Box3().setFromObject(root).getSize(new T.Vector3()).toArray()}));
