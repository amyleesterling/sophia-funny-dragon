import * as THREE from 'three';
import {RULES,attackContains,fireCoordinates,fireWidth} from './rules.js?v=2';

// Lightweight particle simulation: directed jet, drag, buoyancy, and turbulence.
// Particle positions persist between frames; the shader only draws the glow.
export class FlameSimulation {
  constructor(scene){
    this.particles=[];this.capacity=1800;this.seed=719;
    this.positions=new Float32Array(this.capacity*3);this.heat=new Float32Array(this.capacity);this.sizes=new Float32Array(this.capacity);
    this.geometry=new THREE.BufferGeometry();
    for(const[name,array,size]of [['position',this.positions,3],['heat',this.heat,1],['size',this.sizes,1]])this.geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{pixelScale:{value:40}},
      vertexShader:`attribute float heat;attribute float size;varying float vHeat;uniform float pixelScale;void main(){vHeat=heat;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*pixelScale,2.,96.);}`,
      fragmentShader:`varying float vHeat;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float glow=pow(max(0.,1.-r),2.);float core=exp(-r*r*18.);vec3 ember=vec3(1.,.12,.012);vec3 orange=vec3(1.,.43,.035);vec3 hot=vec3(1.,.92,.5);vec3 col=mix(ember,orange,vHeat);col=mix(col,hot,core*vHeat);gl_FragColor=vec4(col,(glow*.52+core*.36)*vHeat);}`});
    this.points=new THREE.Points(this.geometry,this.material);this.points.frustumCulled=false;this.geometry.setDrawRange(0,0);scene.add(this.points);
  }
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  clear(){this.particles.length=0;this.geometry.setDrawRange(0,0);}
  emit(d,dt){
    d.emission=(d.emission||0)+dt*430;const a=d.attack;
    while(d.emission>=1&&this.particles.length<this.capacity){d.emission--;const spread=(this.random()-.5)*.22,speed=8.5+this.random()*2,jetAngle=a.angle+(this.random()-.5)*RULES.fireHalfAngle*1.84;
      this.particles.push({owner:d.index,attack:a,x:a.x+Math.cos(a.angle)*spread,y:a.y,z:a.z-Math.sin(a.angle)*spread,vx:Math.sin(jetAngle)*speed,vz:Math.cos(jetAngle)*speed,vy:-a.y*1.25+this.random()*.8,life:0,max:.7+this.random()*.15,phase:this.random()*6.28,radius:.07+this.random()*.07});
    }
  }
  step(dt,dragons,time){
    for(const d of dragons)if(d?.mode==='fire')this.emit(d,dt);
    for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life+=dt;
      const side=Math.sin(time*12+p.phase)*1.9;p.vx+=(Math.cos(p.attack.angle)*side-p.vx*.12)*dt;p.vz+=(-Math.sin(p.attack.angle)*side-p.vz*.12)*dt;p.vy+=(2.2-p.vy*.2)*dt;
      p.x+=p.vx*dt;p.z+=p.vz*dt;p.y=Math.max(.18,p.y+p.vy*dt);
      const q=fireCoordinates(p.attack,p.x,p.z);
      if(p.life>=p.max||q.forward>=RULES.fireLength||q.forward<0){this.particles.splice(i,1);continue;}
      const limit=Math.max(0,fireWidth(q.forward)-p.radius);if(Math.abs(q.side)>limit){const shift=q.side-Math.sign(q.side)*limit;p.x-=Math.cos(p.attack.angle)*shift;p.z+=Math.sin(p.attack.angle)*shift;}
    }
  }
  update(dt,dragons,time){let left=dt;while(left>0){const step=Math.min(left,1/90);this.step(step,dragons,time);left-=step;}
    this.particles.forEach((p,i)=>{this.positions.set([p.x,p.y,p.z],i*3);this.heat[i]=Math.max(0,1-p.life/p.max);this.sizes[i]=.25+p.life*.75;});
    this.geometry.setDrawRange(0,this.particles.length);for(const a of Object.values(this.geometry.attributes))a.needsUpdate=true;
  }
  hits(x,z){return this.particles.some(p=>p.life>.015&&p.y<1.85+p.radius&&attackContains(p.attack,x,z)&&Math.hypot(p.x-x,p.z-z)<p.radius+.28);}
  has(owner){return this.particles.some(p=>p.owner===owner);}
}
