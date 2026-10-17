import { height } from './marsMath.ts';
export type SurveyPoint=[number,number,number];
export const SURVEY_LEVELS=[17,17.75,18.5,19.25,20,20.75,21.5,22.25,23,23.75,24];
/** Contour endpoints are solved against f, rather than a decorative wave pattern. */
export function surveyContours(levels=SURVEY_LEVELS,spacing=2){
 const lines:{level:number;points:SurveyPoint[]}[]=levels.map(level=>({level,points:[]}));
 const cross=(a:SurveyPoint,b:SurveyPoint,level:number):SurveyPoint=>{
  let lo=0,hi=1;const below=a[1]<level;
  for(let i=0;i<18;i++){const t=(lo+hi)/2,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;if((height(x,z)<level)===below)lo=t;else hi=t;}
  const t=(lo+hi)/2;return[a[0]+(b[0]-a[0])*t,level,a[2]+(b[2]-a[2])*t];
 };
 for(let x=-110;x<110;x+=spacing)for(let z=-110;z<110;z+=spacing){
  const p:SurveyPoint[]=[[x,height(x,z),z],[x+spacing,height(x+spacing,z),z],[x+spacing,height(x+spacing,z+spacing),z+spacing],[x,height(x,z+spacing),z+spacing]];
  for(const tri of [[p[0],p[1],p[2]],[p[0],p[2],p[3]]])for(const line of lines){
   if(line.level<Math.min(...tri.map(p=>p[1]))||line.level>Math.max(...tri.map(p=>p[1])))continue;
   const hits:SurveyPoint[]=[];
   for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3];if((a[1]<line.level)!==(b[1]<line.level))hits.push(cross(a,b,line.level));}
   if(hits.length===2&&hits.every(p=>Math.hypot(p[0],p[2])<=110))line.points.push(...hits);
  }
 }
 return lines;
}
