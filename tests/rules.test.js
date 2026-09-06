import test from 'node:test';
import assert from 'node:assert/strict';
import {RULES,attackContains,firePolygon,fireWidth,levelSettings,clampArena,slideFromDragon,turnToward,createGemPositions} from '../rules.js';

test('warning and hit region share their mouth-origin footprint at every heading',()=>{
  for(let angle=-Math.PI;angle<Math.PI;angle+=.13){
    const a={x:2,z:-4,angle};
    const world=(f,side)=>[a.x+Math.sin(angle)*f+Math.cos(angle)*side,a.z+Math.cos(angle)*f-Math.sin(angle)*side];
    assert.equal(attackContains(a,...world(3,0)),true);
    assert.equal(attackContains(a,...world(-.01,0)),false);
    assert.equal(attackContains(a,...world(RULES.fireLength+.01,0)),false);
    assert.equal(attackContains(a,...world(3,fireWidth(3)+.001)),false);
    assert.equal(attackContains(a,...world(3,fireWidth(3)-.001)),true);
  }
});
test('warning mesh vertices use the same range and width as collision',()=>{
 const v=firePolygon();assert.equal(v.length,18);
 assert.equal(v[8],RULES.fireLength);assert.equal(v[6],fireWidth(RULES.fireLength));assert.equal(v[15],-fireWidth(RULES.fireLength));
});
test('levels sharply increase pressure while keeping every setting bounded',()=>{
 const first=levelSettings(1),second=levelSettings(2),fourth=levelSettings(4),max=levelSettings(100);
 assert.equal(RULES.lives,5);
 assert.ok(second.speed>first.speed);assert.ok(fourth.roam>second.roam);
 assert.ok(second.cooldown<first.cooldown);assert.ok(second.chargeTime<first.chargeTime);assert.ok(second.fireTime>first.fireTime);
 assert.ok(second.attackRange>first.attackRange);assert.ok(second.maxAttackers>=first.maxAttackers);assert.ok(second.pursuit>first.pursuit);
 assert.equal(max.speed,3.8);assert.equal(max.roam,9.5);assert.equal(max.cooldown,.65);assert.equal(max.chargeTime,.55);
 assert.equal(max.fireTime,1.75);assert.equal(max.maxAttackers,4);assert.equal(max.attackRange,14);assert.equal(max.pursuit,.82);
});
test('arena bounds and dragon collisions stay finite even at exact overlap',()=>{
  assert.deepEqual(clampArena(0,0),[0,0]);
  assert.ok(Math.abs(Math.hypot(...clampArena(50,50))-RULES.arenaRadius)<1e-9);
  const p=slideFromDragon(2,3,2,3);assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(p[0]-2,p[1]-3)-1.15)<1e-9);
});
test('20 reachable unique gems fit inside the arena and outside patrol bodies',()=>{
  const positions=createGemPositions();assert.equal(positions.length,RULES.goal);assert.equal(new Set(positions.map(p=>p.join(','))).size,RULES.goal);
  for(const[x,z]of positions){assert.ok(Math.hypot(x,z)<RULES.arenaRadius-.5);for(const[dx,dz]of [[-6,-3.7],[6,-3.7],[-6,5],[6,5]])assert.ok(Math.hypot(x-dx,z-dz)>1.9);}
});
test('heading interpolation takes the short turn across the angle seam',()=>{
  assert.ok(Math.abs(turnToward(Math.PI-.1,-Math.PI+.1,.5)-Math.PI)<1e-9);
});
