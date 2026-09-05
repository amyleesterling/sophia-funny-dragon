// Shared, deterministic gameplay math. No renderer or browser dependencies.
export const RULES = Object.freeze({arenaRadius:11.6,goal:20,speed:4.7,dashSpeed:13.5,dashTime:.23,dashCooldown:2.3,fireLength:5.8,fireHalfAngle:.29,chargeTime:1.35,fireTime:1.05,hitRadius:.28,invulnerableTime:2.1});
export function insideFire(px,pz,dx,dz,angle,radius=RULES.hitRadius){
  const x=px-dx,z=pz-dz;
  const forward=x*Math.sin(angle)+z*Math.cos(angle);
  const sideways=Math.abs(x*Math.cos(angle)-z*Math.sin(angle));
  return forward>=.55-radius && forward<=RULES.fireLength+radius && sideways<=Math.max(0,forward)*Math.tan(RULES.fireHalfAngle)+radius;
}
export function clampArena(x,z){const n=Math.hypot(x,z);return n>RULES.arenaRadius?[x/n*RULES.arenaRadius,z/n*RULES.arenaRadius]:[x,z];}
export function slideFromDragon(x,z,dx,dz,radius=1.15){const xx=x-dx,zz=z-dz,n=Math.hypot(xx,zz);return n<radius?[dx+(n?xx/n:1)*radius,dz+(n?zz/n:0)*radius]:[x,z];}
export function turnToward(current,target,amount){return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*Math.min(1,amount);}
export function createGemPositions(){
  const points=[];
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12;points.push([Math.sin(a)*9.7,Math.cos(a)*9.7]);}
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI*2/8;points.push([Math.sin(a)*4.1,Math.cos(a)*4.1]);}
  return points;
}
