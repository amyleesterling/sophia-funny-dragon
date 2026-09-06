// Shared, deterministic gameplay math. No renderer or browser dependencies.
export const RULES = Object.freeze({arenaRadius:11.6,goal:20,lives:5,speed:4.7,dashSpeed:13.5,dashTime:.23,dashCooldown:2.3,fireLength:5.8,fireHalfAngle:.29,chargeTime:1.35,fireTime:1.05,hitRadius:.28,invulnerableTime:2.1});
export function clampArena(x,z){const n=Math.hypot(x,z);return n>RULES.arenaRadius?[x/n*RULES.arenaRadius,z/n*RULES.arenaRadius]:[x,z];}
export function slideFromDragon(x,z,dx,dz,radius=1.15){const xx=x-dx,zz=z-dz,n=Math.hypot(xx,zz);return n<radius?[dx+(n?xx/n:1)*radius,dz+(n?zz/n:0)*radius]:[x,z];}
export function turnToward(current,target,amount){return current+Math.atan2(Math.sin(target-current),Math.cos(target-current))*Math.min(1,amount);}
export function createGemPositions(){
  const points=[];
  for(let i=0;i<12;i++){const a=i*Math.PI*2/12;points.push([Math.sin(a)*9.7,Math.cos(a)*9.7]);}
  for(let i=0;i<8;i++){const a=(i+.5)*Math.PI*2/8;points.push([Math.sin(a)*4.1,Math.cos(a)*4.1]);}
  return points;
}

export function levelSettings(level){
  const n=Math.max(0,level-1);
  return {
    speed:Math.min(.75+n*.38,3.8),
    roam:Math.min(2.2+n*1.4,9.5),
    cooldown:Math.max(.65,3.6-n*.5),
    chargeTime:Math.max(.55,RULES.chargeTime-n*.13),
    fireTime:Math.min(1.75,RULES.fireTime+n*.11),
    maxAttackers:Math.min(4,2+Math.ceil(n/2)),
    attackRange:Math.min(14,8+n*1.6),
    pursuit:Math.min(.82,n*.2),
    openingDelay:Math.max(.7,3.2-n*.38),
    openingStagger:Math.max(.25,1.35-n*.2),
  };
}
// The warning polygon, particle bounds, and damage gate share this footprint.
export function fireWidth(forward){return .18+Math.max(0,forward)*Math.tan(RULES.fireHalfAngle);}
export function fireCoordinates(attack,x,z){const dx=x-attack.x,dz=z-attack.z;return {forward:dx*Math.sin(attack.angle)+dz*Math.cos(attack.angle),side:dx*Math.cos(attack.angle)-dz*Math.sin(attack.angle)};}
export function attackContains(attack,x,z){const p=fireCoordinates(attack,x,z);return p.forward>=0&&p.forward<=RULES.fireLength&&Math.abs(p.side)<=fireWidth(p.forward);}
export function firePolygon(){const w=fireWidth(RULES.fireLength);return [-.18,.055,0,.18,.055,0,w,.055,RULES.fireLength,-.18,.055,0,w,.055,RULES.fireLength,-w,.055,RULES.fireLength];}
