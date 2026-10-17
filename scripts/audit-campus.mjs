import * as T from 'three';
import { createColonyCampus } from '../src/components/colonyCampus.ts';

// AABB intersections are candidates, not a triangle-level collision claim.
// Circular slab intersections are exact in plan, including the widened base.
const campus=createColonyCampus(new T.Texture());
const modules=campus.spatialInventory;
const pairs=[];
for(let i=0;i<modules.length;i++)for(let j=i+1;j<modules.length;j++){
 const a=modules[i],b=modules[j];
 const foundationGap=Math.hypot(a.x-b.x,a.z-b.z)-a.foundationRadius-b.foundationRadius;
 const overlap=a.min.map((value,k)=>Math.min(a.max[k],b.max[k])-Math.max(value,b.min[k]));
 if(foundationGap<0||overlap.every(value=>value>0))pairs.push({a:a.id,b:b.id,foundationGap,bodyAabbOverlap:overlap.every(value=>value>0),overlap});
}
const report={coordinateSystem:'Three.js (x, altura, y), metros',scope:'16 viviendas y sus cimientos; no certifica corredores, industria, activos GLB ni el conjunto completo',modules,pairs};
console.log(JSON.stringify({modules:modules.length,candidatePairs:pairs.length,pairs,scope:report.scope,note:'La auditoría espacial de avance se conserva en public/materials/Auditoria_EVA03_Maestra.md; este verificador solo imprime resultados derivados.'},null,2));
const geometries=new Set(),materials=new Set();
campus.root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
