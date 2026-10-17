import * as T from 'three';
import { height } from '../data/marsMath';
import { surveyContours } from '../data/marsTopography';

export function createSurveyLayer(){
 const group=new T.Group();group.name='Levantamiento topográfico: curvas, cuadrícula y puntos';
 const v=(x:number,z:number)=>new T.Vector3(x,height(x,z)+.065,z);
 const contourMaterial=new T.LineDashedMaterial({color:'#b6d9d4',transparent:true,opacity:.48,dashSize:.38,gapSize:.17,depthWrite:false});
 for(const contour of surveyContours()){
  const points=contour.points.map(p=>new T.Vector3(p[0],p[1]+.065,p[2]));
  const line=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),contourMaterial);line.computeLineDistances();group.add(line);
 }
 const gridMaterial=new T.LineDashedMaterial({color:'#7dd2d2',transparent:true,opacity:.28,dashSize:.16,gapSize:.46,depthWrite:false});
 for(let coordinate=-100;coordinate<=100;coordinate+=20)for(const axis of [0,1]){
  const limit=Math.sqrt(110**2-coordinate**2),points:T.Vector3[]=[];
  for(let t=-limit;t<=limit;t+=1)points.push(axis?v(t,coordinate):v(coordinate,t));
  const line=new T.Line(new T.BufferGeometry().setFromPoints(points),gridMaterial);line.computeLineDistances();group.add(line);
 }
 const crosses:T.Vector3[]=[],dots:T.Vector3[]=[];
 for(let x=-100;x<=100;x+=20)for(let z=-100;z<=100;z+=20){if(Math.hypot(x,z)>108)continue;crosses.push(v(x-.48,z),v(x+.48,z),v(x,z-.48),v(x,z+.48));dots.push(v(x,z));}
 group.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(crosses),new T.LineBasicMaterial({color:'#a7e0da',transparent:true,opacity:.65,depthWrite:false})));
 group.add(new T.Points(new T.BufferGeometry().setFromPoints(dots),new T.PointsMaterial({color:'#c5f0df',size:.2,sizeAttenuation:true,transparent:true,opacity:.8,depthWrite:false})));
 return group;
}
