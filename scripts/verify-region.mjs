import assert from 'node:assert/strict';
import {height, grad, REGION_AREA, REGION_VOLUME, regionVolumeAt} from '../src/data/marsMath.ts';

// Independent midpoint quadrature over R; compare two resolutions and the
// values shown in the existing mathematical development (A14/A15).
function integrate(n,fraction=1) {
  const dr=12/n, dtheta=(Math.PI/4*fraction)/n;
  let volume=0, surface=0;
  for(let j=0;j<n;j++) {
    const theta=-Math.PI/4+(j+.5)*dtheta;
    for(let i=0;i<n;i++) {
      const r=60+(i+.5)*dr, x=r*Math.cos(theta), y=r*Math.sin(theta);
      const [fx,fy]=grad(x,y), weight=r*dr*dtheta;
      volume+=height(x,y)*weight;
      surface+=Math.sqrt(1+fx*fx+fy*fy)*weight;
    }
  }
  return {volume,surface};
}
const coarse=integrate(200), fine=integrate(400);
const projected=(72**2-60**2)*Math.PI/8;
assert.ok(Math.abs(REGION_AREA-projected)<1e-10);
assert.ok(Math.abs(REGION_VOLUME-fine.volume)<.001);
assert.equal(regionVolumeAt(0),0);
assert.ok(Math.abs(regionVolumeAt(.5)-integrate(400,.5).volume)<.001,'The moving cut must show the actual partial integral.');
assert.ok(Math.abs(fine.surface-coarse.surface)<1e-5,'Surface quadrature did not converge');
assert.ok(Math.abs(fine.volume-coarse.volume)<.002,'Volume quadrature did not converge');
assert.ok(Math.abs(fine.surface-623.364857)<1e-5,'Area disagrees with A15');
assert.ok(Math.abs(fine.volume-12119.9617)<.001,'Volume disagrees with A14');
assert.ok(fine.surface>projected,'Real area must exceed projected area');
console.log('PASS: region R, independent area/volume quadrature and convergence.');
console.log(JSON.stringify({projected,...fine,excess:fine.surface-projected,
  excessPercent:100*(fine.surface/projected-1),
  convergence:{surface:Math.abs(fine.surface-coarse.surface),volume:Math.abs(fine.volume-coarse.volume)}},null,2));
