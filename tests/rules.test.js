import test from 'node:test';
import assert from 'node:assert/strict';
import {RULES,insideFire,clampArena,slideFromDragon,turnToward,createGemPositions} from '../rules.js';

test('fire points where the dragon faces, never behind it',()=>{
  assert.equal(insideFire(0,3,0,0,0),true);
  assert.equal(insideFire(0,-3,0,0,0),false);
  assert.equal(insideFire(3,0,0,0,Math.PI/2),true);
  assert.equal(insideFire(-3,0,0,0,Math.PI/2),false);
});
test('sideways dodges and leaving range escape the fire cone',()=>{
  assert.equal(insideFire(2,3,0,0,0),false);
  assert.equal(insideFire(0,7,0,0,0),false);
  assert.equal(insideFire(0,RULES.fireLength,0,0,0),true);
});
test('all rotated attack directions match the same collision geometry',()=>{
  for(let angle=-Math.PI;angle<=Math.PI;angle+=.13){
    assert.equal(insideFire(2+Math.sin(angle)*3,-4+Math.cos(angle)*3,2,-4,angle),true);
    assert.equal(insideFire(2-Math.sin(angle)*3,-4-Math.cos(angle)*3,2,-4,angle),false);
  }
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
