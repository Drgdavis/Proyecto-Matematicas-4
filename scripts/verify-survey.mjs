import assert from 'node:assert/strict';
import {height} from '../src/data/marsMath.ts';
import {surveyContours,SURVEY_LEVELS} from '../src/data/marsTopography.ts';
const contours=surveyContours();let maximumError=0,count=0;
assert.equal(contours.length,SURVEY_LEVELS.length);
for(const line of contours){assert.ok(line.points.length>0);assert.equal(line.points.length%2,0);for(const [x,y,z] of line.points){const error=Math.abs(height(x,z)-line.level);maximumError=Math.max(maximumError,error);assert.ok(error<.00001);assert.ok(Math.hypot(x,z)<=110);assert.equal(y,line.level);count++;}}
console.log('PASS: curvas topográficas calculadas sobre f, dentro del dominio.',{count,maximumError});
