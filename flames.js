import * as THREE from 'three';
import {RULES,attackContains,fireCoordinates,fireWidth} from './rules.js?v=2';

export const FLAME_STYLES = [
  {color:0x28efb5, call:'MINT-CHOO!'},
  {color:0xff53b5, call:'BUBBLE BURP!'},
  {color:0xff53db, call:'RAINBOW HONK!', rainbow:true},
  {color:0xa855ff, call:'GOOGLY HONK!'},
];

// Lightweight particle simulation: directed jet, drag, buoyancy, and turbulence.
// Particle positions persist between frames; the shader only draws the glow.
export class FlameSimulation {
  constructor(scene){
    this.particles=[];this.capacity=1800;this.seed=719;
    this.positions=new Float32Array(this.capacity*3);this.heat=new Float32Array(this.capacity);this.sizes=new Float32Array(this.capacity);
    this.colors=new Float32Array(this.capacity*3);this.styles=new Float32Array(this.capacity);this.spins=new Float32Array(this.capacity);this.comics=new Float32Array(this.capacity);
    this.rainbowColor=new THREE.Color();
    this.palette=FLAME_STYLES.map(s=>new THREE.Color(s.color));
    this.geometry=new THREE.BufferGeometry();
    for(const[name,array,size]of [['position',this.positions,3],['heat',this.heat,1],['size',this.sizes,1],['flameColor',this.colors,3],['style',this.styles,1],['spin',this.spins,1],['comic',this.comics,1]])this.geometry.setAttribute(name,new THREE.BufferAttribute(array,size).setUsage(THREE.DynamicDrawUsage));
    const uniforms={pixelScale:{value:40}};
    const vertexShader=`attribute float heat,size,style,spin,comic;attribute vec3 flameColor;
      varying float vHeat,vStyle,vSpin,vComic;varying vec3 vColor;uniform float pixelScale;
      void main(){vHeat=heat;vStyle=style;vSpin=spin;vComic=comic;vColor=flameColor;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*pixelScale,2.,96.);}`;
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms,vertexShader,
      fragmentShader:`varying float vHeat;varying vec3 vColor;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;
      float glow=pow(1.-r,2.);gl_FragColor=vec4(mix(vColor,vec3(1.),.15*vHeat),glow*.7*vHeat);}`});
    // A second, normally blended pass keeps the cartoon pupils and mustaches dark.
    this.comicMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,vertexShader,
      fragmentShader:`varying float vHeat,vStyle,vSpin,vComic;varying vec3 vColor;
      float disk(vec2 p,float r){return 1.-smoothstep(r-.035,r+.035,length(p));}
      void main(){if(vComic<.5)discard;vec2 p=(gl_PointCoord-.5)*2.;
      float c=cos(vSpin),s=sin(vSpin);p=mat2(c,-s,s,c)*p;
      float r=length(p),theta=atan(p.y,p.x),mask=0.;vec3 col=vColor;
      if(vStyle<.5){mask=disk(p,.72);col=mix(col,vec3(.8,1.,.9),.3);
        float whiskers=max(disk((p-vec2(-.2,.16))*vec2(1.,1.9),.26),disk((p-vec2(.2,.16))*vec2(1.,1.9),.26));
        col=mix(col,vec3(.12,.045,.22),whiskers);
      }else if(vStyle<1.5){mask=disk(p,.78);float rim=smoothstep(.51,.7,r);
        col=mix(col,vec3(1.,.85,.96),rim*.8);mask*=.45+.55*rim;
        col=mix(col,vec3(1.),disk(p-vec2(-.26,-.3),.13));
      }else if(vStyle<2.5){float edge=.62+.17*cos(theta*5.);
        mask=1.-smoothstep(edge-.025,edge+.025,r);col=mix(col,vec3(1.),.12);
      }else{float edge=.66+.08*cos(theta*7.+vSpin);
        mask=1.-smoothstep(edge-.025,edge+.025,r);col=mix(col,vec3(1.,.45,.93),.25);
      }
      if(vStyle<.5||vStyle>1.5){
        float eyes=max(disk(p-vec2(-.22,-.15),.17),disk(p-vec2(.22,-.19),.2));
        col=mix(col,vec3(1.),eyes);
        float pupils=max(disk(p-vec2(-.18,-.12),.075),disk(p-vec2(.18,-.17),.08));
        col=mix(col,vec3(.06,.02,.12),pupils);
      }
      float alpha=mask*smoothstep(0.,.2,vHeat);if(alpha<.01)discard;gl_FragColor=vec4(col,alpha);}`});
    this.points=new THREE.Points(this.geometry,this.material);this.points.frustumCulled=false;
    this.cartoons=new THREE.Points(this.geometry,this.comicMaterial);this.cartoons.frustumCulled=false;this.cartoons.renderOrder=1;
    this.geometry.setDrawRange(0,0);scene.add(this.points,this.cartoons);
  }
  random(){this.seed=(this.seed*1664525+1013904223)>>>0;return this.seed/4294967296;}
  clear(){this.particles.length=0;this.geometry.setDrawRange(0,0);}
  emit(d,dt){
    d.emission=(d.emission||0)+dt*430;const a=d.attack;
    while(d.emission>=1&&this.particles.length<this.capacity){d.emission--;const spread=(this.random()-.5)*.22,speed=8.5+this.random()*2,jetAngle=a.angle+(this.random()-.5)*RULES.fireHalfAngle*1.84;
      this.particles.push({owner:d.index,comic:this.random()<.085,attack:a,x:a.x+Math.cos(a.angle)*spread,y:a.y,z:a.z-Math.sin(a.angle)*spread,vx:Math.sin(jetAngle)*speed,vz:Math.cos(jetAngle)*speed,vy:-a.y*1.25+this.random()*.8,life:0,max:.7+this.random()*.15,phase:this.random()*6.28,radius:.07+this.random()*.07});
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
    this.particles.forEach((p,i)=>{this.positions.set([p.x,p.y,p.z],i*3);this.heat[i]=Math.max(0,1-p.life/p.max);this.sizes[i]=p.comic?(.82+Math.sin(p.life*16+p.phase)*.12+p.life*.3):(.25+p.life*.75);
      const color=FLAME_STYLES[p.owner].rainbow?this.rainbowColor.setHSL(((time*.8-p.life*1.6+p.phase*.04)%1+1)%1,1,.5):this.palette[p.owner];this.colors.set([color.r,color.g,color.b],i*3);this.styles[i]=p.owner;this.comics[i]=p.comic?1:0;this.spins[i]=Math.sin(p.life*9+p.phase)*.3;});
    this.geometry.setDrawRange(0,this.particles.length);for(const a of Object.values(this.geometry.attributes))a.needsUpdate=true;
  }
  hits(x,z){return this.particles.some(p=>p.life>.015&&p.y<1.85+p.radius&&attackContains(p.attack,x,z)&&Math.hypot(p.x-x,p.z-z)<p.radius+.28);}
  has(owner){return this.particles.some(p=>p.owner===owner);}
}
