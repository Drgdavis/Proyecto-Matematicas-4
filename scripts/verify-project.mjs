import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// One console run, no competing report files. Keep going after a failure so the
// final summary distinguishes numerical, spatial, rendering and build checks.
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
const results=[];
function run(name,args,input){
 console.log(`\n[${name}]`);
 const result=spawnSync(process.execPath,args,{encoding:'utf8',input,windowsHide:true,maxBuffer:8*1024*1024});
 if(result.stdout)process.stdout.write(result.stdout);
 if(result.stderr)process.stderr.write(result.stderr);
 if(result.error)console.error(result.error.message);
 results.push({check:name,result:result.status===0&&!result.error?'PASS':'FAIL'});
}
run('Tipos TypeScript',['node_modules/typescript/bin/tsc','--noEmit']);
for(const name of ['demonstrations','mars','region','rover-clearance','campus-junction','rover-transfer','habitat','systems','survey','typesetting','assets',])run(name,[`scripts/verify-${name}.mjs`]);
run('Entrega pública',['scripts/verify-public-release.mjs']);
run('Compilación',['node_modules/vite/bin/vite.js','build','--configLoader','runner']);
console.table(results);
console.log('Las comprobaciones automáticas no sustituyen la inspección WebGL ni validan una instalación real.');
process.exitCode=results.some(row=>row.result==='FAIL')?1:0;
