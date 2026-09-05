import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {RULES,insideFire,clampArena,slideFromDragon,turnToward,createGemPositions} from './rules.js';

const $=id=>document.getElementById(id);
const canvas=$('world'), overlay=$('overlay'), play=$('play');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
const state={mode:'loading',time:0,score:0,hearts:3,invulnerable:0,dash:0,cooldown:0,elapsed:0};
const input={x:0,z:0,target:null,keys:new Set(),pointer:null,lastX:0,lastZ:-1};
let renderer,scene,camera,player,heroBody,heroScarf,heroShadow,halo;
let muted=false,audio,toastTimer,flashTimer,lastFrame=0,frameCount=0;
const dragons=[],gems=[],particles=[];
const dummy=new THREE.Object3D(), temp=new THREE.Vector3(), camTarget=new THREE.Vector3();
const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
let particlesMesh,fireMesh,destinationRing;
const DRAGONS=[
  {file:'dragon-one',name:'Sir Snortstache',home:[-6,-3.7],height:3.25,mouth:.76,color:0x67dcc0},
  {file:'dragon-two',name:'Flapjack',home:[6,-3.7],height:3.05,mouth:.76,color:0xffb795},
  {file:'sunny',name:'Sunny',home:[-6,5],height:3.2,mouth:.79,color:0xffb23e},
  {file:'snugglehorn',name:'Snugglehorn',home:[6,5],height:3.35,mouth:.91,color:0xc391ff},
];

function mesh(geometry,color,parent=scene){const m=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.85}));parent.add(m);return m;}
function sphere(radius,color,parent){return mesh(new THREE.SphereGeometry(radius,12,8),color,parent);}
function flatCircle(radius,color,y=.015){const m=mesh(new THREE.CircleGeometry(radius,48),color);m.rotation.x=-Math.PI/2;m.position.y=y;return m;}
function contactShadow(radius,opacity=.22){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(32,32,3,32,32,32);g.addColorStop(0,`rgba(13,46,39,${opacity})`);g.addColorStop(1,'rgba(13,46,39,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const m=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.04;scene.add(m);return m;
}
function beep(frequency=620,duration=.13,type='sine',gain=.06){
  if(muted||!audio||audio.state!=='running')return;
  const oscillator=audio.createOscillator(),volume=audio.createGain();oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,audio.currentTime);oscillator.frequency.exponentialRampToValueAtTime(frequency*.75,audio.currentTime+duration);
  volume.gain.setValueAtTime(gain,audio.currentTime);volume.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);oscillator.connect(volume);volume.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);
}
function unlockAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}}
function toast(text,duration=2300){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),duration);}
function burst(x,y,z,color,count=16){for(let i=0;i<count&&particles.length<160;i++)particles.push({x,y,z,vx:(Math.random()-.5)*4,vy:2+Math.random()*3,vz:(Math.random()-.5)*4,life:.6+Math.random()*.6,max:1.2,color});}

function createWorld(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x91d3e4);scene.fog=new THREE.Fog(0x91d3e4,48,90);
  camera=new THREE.OrthographicCamera(-18,18,13,-13,.1,100);camera.position.set(0,23,26);camera.lookAt(0,0,0);
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.5:2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene.add(new THREE.HemisphereLight(0xfff8e3,0x72a16c,2.1));
  const sun=new THREE.DirectionalLight(0xffecc7,2.7);sun.position.set(-12,22,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-17;sun.shadow.camera.right=17;sun.shadow.camera.top=17;sun.shadow.camera.bottom=-17;sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun);
  const rim=new THREE.DirectionalLight(0xaadfff,.65);rim.position.set(8,8,-12);scene.add(rim);
  const island=mesh(new THREE.CylinderGeometry(12.9,12.1,1.45,80),0xc59a6d);island.position.y=-.77;
  const bottom=mesh(new THREE.CylinderGeometry(12.1,10.6,1.6,64),0xa37d6a);bottom.position.y=-2.2;
  const meadow=flatCircle(12.95,0x71b553,0);meadow.receiveShadow=true;
  const trail=mesh(new THREE.RingGeometry(6.9,7.75,96),0xcecf83);trail.rotation.x=-Math.PI/2;trail.position.y=.018;trail.receiveShadow=true;
  const inner=mesh(new THREE.RingGeometry(12.35,12.75,96),0x96c768);inner.rotation.x=-Math.PI/2;inner.position.y=.019;
  // Seeded, instanced meadow details keep draw calls low on phones.
  let seed=74;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const flecks=new THREE.InstancedMesh(new THREE.CircleGeometry(.12,5),new THREE.MeshBasicMaterial({color:0xa3d373}),180);
  for(let i=0;i<180;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*12;dummy.position.set(Math.cos(a)*r,.028,Math.sin(a)*r);dummy.rotation.set(-Math.PI/2,0,random()*6);dummy.scale.setScalar(.5+random());dummy.updateMatrix();flecks.setMatrixAt(i,dummy.matrix);}scene.add(flecks);
  const petals=new THREE.InstancedMesh(new THREE.SphereGeometry(.1,5,4),new THREE.MeshStandardMaterial({roughness:.9}),90);
  for(let i=0;i<90;i++){const a=random()*Math.PI*2,r=10.4+random()*1.8;dummy.position.set(Math.cos(a)*r,.12,Math.sin(a)*r);dummy.rotation.set(0,0,0);dummy.scale.set(1,.5,1);dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);petals.setColorAt(i,new THREE.Color([0xffd355,0xfff4dd,0xc89cff,0xff91aa][i%4]));}scene.add(petals);
  for(let i=0;i<15;i++){
    const a=(i+.4)/15*Math.PI*2,r=12.8+random()*.5,x=Math.sin(a)*r,z=Math.cos(a)*r;
    const h=1.6+random()*1.3;
    const trunk=mesh(new THREE.CylinderGeometry(.16,.23,h,7),0xa78154);trunk.position.set(x,h/2,z);
    const crown=sphere(.95+random()*.35,[0x388b60,0x519b64,0x408f69][i%3]);crown.scale.set(1,1.1,1);crown.position.set(x,h+.25,z);
    const tuft=sphere(.7,0x65af68);tuft.position.set(x-.22,h+.92,z-.15);
  }
  // A simple playable explorer, independent of the unrigged dragon models.
  player=new THREE.Group();scene.add(player);heroBody=new THREE.Group();player.add(heroBody);
  const body=mesh(new THREE.CapsuleGeometry(.24,.38,4,10),0x655ac1,heroBody);body.position.y=.64;body.castShadow=true;
  const head=sphere(.245,0xf7cfa5,heroBody);head.position.y=1.19;head.castShadow=true;
  const cap=sphere(.263,0xf7d561,heroBody);cap.scale.set(1,.53,1);cap.position.y=1.35;
  const brim=mesh(new THREE.CylinderGeometry(.3,.3,.045,16),0xf3c54f,heroBody);brim.position.set(0,1.32,.055);
  for(const x of [-.088,.088]){const eye=sphere(.033,0x213f3a,heroBody);eye.position.set(x,1.21,.219);}
  for(const x of [-.15,.15]){const foot=sphere(.125,0x393d68,heroBody);foot.scale.set(.8,.72,1.4);foot.position.set(x,.12,.08);foot.name=x<0?'leftFoot':'rightFoot';}
  for(const x of [-.31,.31]){const arm=sphere(.105,0xf7cfa5,heroBody);arm.scale.y=1.7;arm.position.set(x,.72,.03);}
  const bag=mesh(new THREE.BoxGeometry(.3,.33,.15),0xf09665,heroBody);bag.position.set(0,.72,-.27);
  heroScarf=mesh(new THREE.BoxGeometry(.13,.3,.035),0xf57580,heroBody);heroScarf.position.set(.13,.82,.27);heroScarf.rotation.z=-.22;
  halo=mesh(new THREE.RingGeometry(.42,.5,32),0xffffff,player);halo.rotation.x=-Math.PI/2;halo.position.y=.045;
  heroShadow=contactShadow(.6,.24);player.position.set(0,0,5.5);
  destinationRing=mesh(new THREE.RingGeometry(.25,.32,24),0xffffff);destinationRing.rotation.x=-Math.PI/2;destinationRing.position.y=.05;destinationRing.visible=false;
  const gemGeo=new THREE.OctahedronGeometry(.3,0);
  for(const [x,z]of createGemPositions()){
    const material=new THREE.MeshStandardMaterial({color:0xac6cf1,emissive:0x532890,emissiveIntensity:.23,roughness:.23,metalness:.18});
    const m=new THREE.Mesh(gemGeo,material);m.scale.set(.85,1.35,.85);m.position.set(x,.65,z);scene.add(m);
    const ring=mesh(new THREE.RingGeometry(.24,.3,18),0xe9d78c);ring.rotation.x=-Math.PI/2;ring.position.set(x,.04,z);
    gems.push({mesh:m,ring,x,z,collected:false,phase:random()*6});
  }
  particlesMesh=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.085,0),new THREE.MeshBasicMaterial(),160);particlesMesh.count=0;particlesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particlesMesh.frustumCulled=false;scene.add(particlesMesh);
  fireMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({transparent:true,opacity:.86,depthWrite:false}),96);fireMesh.count=0;fireMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);fireMesh.frustumCulled=false;scene.add(fireMesh);
  window.addEventListener('resize',resize);resize();
}

function warningFan(){
  const positions=[];const length=RULES.fireLength;
  for(let i=0;i<18;i++){const a=-RULES.fireHalfAngle+i/18*RULES.fireHalfAngle*2,b=-RULES.fireHalfAngle+(i+1)/18*RULES.fireHalfAngle*2;positions.push(0,0,0,Math.sin(a)*length,0,Math.cos(a)*length,Math.sin(b)*length,0,Math.cos(b)*length);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const fan=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:0xffac38,side:THREE.DoubleSide,transparent:true,opacity:.5,depthWrite:false}));fan.position.y=.045;fan.visible=false;scene.add(fan);return fan;
}

async function loadDragons(){
  const loader=new GLTFLoader();let loaded=0;
  await Promise.all(DRAGONS.map(async(spec,index)=>{
    const gltf=await loader.loadAsync(`./assets/models/${spec.file}.glb`);
    const model=gltf.scene,bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const scale=spec.height/size.y;model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;o.material.roughness=.8;o.material.metalness=0;o.material.normalScale?.set(.5,.5);}});
    const root=new THREE.Group(),sway=new THREE.Group();root.add(sway);sway.add(model);root.position.set(spec.home[0],0,spec.home[1]);root.rotation.y=Math.atan2(-spec.home[0],5.5-spec.home[1]);scene.add(root);
    const label=document.createElement('div');label.className='dragon-label';label.textContent=spec.name;$('dragon-labels').append(label);
    dragons[index]={...spec,root,sway,model,label,shadow:contactShadow(1.7,.27),fan:warningFan(),mode:'idle',timer:3+index*1.7,angle:root.rotation.y,index,phase:index*1.4};
    loaded++;$('load-progress').style.width=`${loaded/4*100}%`;play.textContent=`Waking the dragons… ${loaded}/4`;
  }));
  state.mode='ready';play.disabled=false;play.textContent="Let's play!";$('load-track').hidden=true;$('panel-foot').textContent=coarse?'Drag the left joystick to move. Tap DASH to zoom!':'Arrow keys or WASD to move. Space to dash. You can click to walk, too.';
}

function resize(){
  if(!renderer)return;const w=innerWidth,h=innerHeight,aspect=w/h;
  const height=aspect<.8?28:aspect<1.25?26:23;
  camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
function resetInput(){input.x=input.z=0;input.target=null;input.keys.clear();input.pointer=null;$('stick').style.transform='translate(0px,0px)';if(destinationRing)destinationRing.visible=false;}
function updateHUD(){$('score').textContent=state.score;$('hearts').textContent='♥ '.repeat(state.hearts)+'♡ '.repeat(3-state.hearts);$('hearts').setAttribute('aria-label',`${state.hearts} hearts`);}
function newRound(){
  resetInput();Object.assign(state,{mode:'playing',time:0,score:0,hearts:3,invulnerable:1,dash:0,cooldown:0,elapsed:0});
  player.position.set(0,0,5.5);player.rotation.set(0,Math.PI,0);input.lastX=0;input.lastZ=-1;heroBody.visible=true;particles.length=0;
  for(const g of gems){g.collected=false;g.mesh.visible=g.ring.visible=true;}
  for(const d of dragons){d.mode='idle';d.timer=3.5+d.index*1.7;d.root.position.set(d.home[0],0,d.home[1]);d.fan.visible=false;d.label.className='dragon-label';d.label.textContent=d.name;}
  overlay.hidden=true;updateHUD();$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');toast('Find the purple gems. Watch for orange!');canvas.focus({preventScroll:true});
}
function pause(){
  if(state.mode!=='playing')return;state.mode='paused';resetInput();showPanel('TAKE A BREATHER','Dragons on pause.','Your gems are safe. Ready when you are.','Keep playing');$('pause').textContent='▶';$('pause').setAttribute('aria-label','Resume game');
}
function resume(){state.mode='playing';overlay.hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');canvas.focus({preventScroll:true});}
function showPanel(kicker,title,description,button){$('panel-kicker').textContent=kicker;$('panel-title').textContent=title;$('panel-description').textContent=description;$('instructions').hidden=true;$('panel-foot').textContent='Made from Sophia’s dragon ideas.';play.textContent=button;overlay.hidden=false;play.focus({preventScroll:true});}
function finish(won){
  state.mode=won?'won':'lost';resetInput();
  if(won){for(let i=0;i<5;i++)burst(player.position.x+(i-2),2,player.position.z,0xffdd65,25);beep(880,.25);setTimeout(()=>beep(1174,.35),160);showPanel('ALL 20 GEMS ARE YOURS!','A gem of an adventure.',`You out-dodged four silly dragons in ${Math.floor(state.elapsed/60)}:${String(Math.floor(state.elapsed%60)).padStart(2,'0')}. They demand a rematch.`,'Play again');}
  else{showPanel('A LITTLE TOO TOASTY','Oops. Dragon breath!',`You found ${state.score} of 20 gems. Try dashing sideways when the orange warning appears.`,'Try again');beep(180,.3,'triangle');}
}
function dash(){
  if(state.mode!=='playing'||state.cooldown>0)return;state.dash=RULES.dashTime;state.cooldown=RULES.dashCooldown;input.target=null;destinationRing.visible=false;beep(400,.12,'triangle');burst(player.position.x,.25,player.position.z,0xffffff,8);
}
function hit(){
  if(state.invulnerable>0||state.dash>0||state.mode!=='playing')return;state.hearts--;state.invulnerable=RULES.invulnerableTime;updateHUD();beep(145,.23,'triangle');burst(player.position.x,1,player.position.z,0xffa267,18);
  clearTimeout(flashTimer);$('hurt-flash').classList.add('hit');flashTimer=setTimeout(()=>$('hurt-flash').classList.remove('hit'),300);toast('Toasty toes! Dash sideways to dodge.');if(state.hearts<=0)finish(false);
}

function movePlayer(dt){
  state.invulnerable=Math.max(0,state.invulnerable-dt);state.cooldown=Math.max(0,state.cooldown-dt);
  let x=input.x,z=input.z;
  if(input.keys.has('arrowleft')||input.keys.has('a'))x-=1;if(input.keys.has('arrowright')||input.keys.has('d'))x+=1;if(input.keys.has('arrowup')||input.keys.has('w'))z-=1;if(input.keys.has('arrowdown')||input.keys.has('s'))z+=1;
  if(input.target&&Math.hypot(x,z)<.05){x=input.target.x-player.position.x;z=input.target.z-player.position.z;if(Math.hypot(x,z)<.16){input.target=null;destinationRing.visible=false;x=z=0;}}
  let length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}if(length>.08){input.lastX=x/Math.hypot(x,z);input.lastZ=z/Math.hypot(x,z);}
  const dashing=state.dash>0;if(dashing){x=input.lastX;z=input.lastZ;length=1;}
  const speed=dashing?RULES.dashSpeed:RULES.speed;let px=player.position.x+x*speed*dt,pz=player.position.z+z*speed*dt;
  [px,pz]=clampArena(px,pz);for(const d of dragons)[px,pz]=slideFromDragon(px,pz,d.root.position.x,d.root.position.z);[px,pz]=clampArena(px,pz);
  player.position.set(px,0,pz);if(length>.08)player.rotation.y=turnToward(player.rotation.y,Math.atan2(x,z),dt*15);
  heroBody.position.y=!reducedMotion&&length>.08?Math.abs(Math.sin(state.time*14))*.09:0;
  heroBody.rotation.z=!reducedMotion&&length>.08?Math.sin(state.time*14)*.07:0;
  heroBody.getObjectByName('leftFoot').position.z=.08+(length>.08?Math.sin(state.time*14)*.14:0);heroBody.getObjectByName('rightFoot').position.z=.08-(length>.08?Math.sin(state.time*14)*.14:0);
  heroScarf.rotation.x=Math.sin(state.time*8)*.15;heroBody.visible=state.invulnerable<=0||Math.floor(state.invulnerable*10)%2===0;
  halo.material.color.set(dashing?0xffe891:0xffffff);halo.scale.setScalar(dashing?1.5:1);heroShadow.position.set(px,.04,pz);
  for(const g of gems){if(!g.collected&&Math.hypot(px-g.x,pz-g.z)<.65){g.collected=true;g.mesh.visible=g.ring.visible=false;state.score++;updateHUD();burst(g.x,.75,g.z,0xc08bff,14);beep(640+state.score*24,.14);if(state.score===10)toast('Halfway! Those dragons look worried.');if(state.score===RULES.goal){finish(true);break;}}}
  // Keep dash immunity for the complete frame in which the dash was active.
  if(dashing){state.invulnerable=Math.max(state.invulnerable,dt+.025);state.dash=Math.max(0,state.dash-dt);}
  $('dash').classList.toggle('cooling',state.cooldown>0);$('dash-status').textContent=state.cooldown>0?`${state.cooldown.toFixed(1)}s`:'Ready!';$('dash').setAttribute('aria-label',state.cooldown>0?'Dash recharging':'Dash');
}

function updateDragons(dt){
  for(const d of dragons){
    const p=d.root.position;d.timer-=dt;
    const dist=Math.hypot(player.position.x-p.x,player.position.z-p.z);
    if(d.mode==='idle'){
      const desiredX=d.home[0]+Math.sin(state.time*.3+d.phase)*.7,desiredZ=d.home[1]+Math.cos(state.time*.34+d.phase)*.6;
      p.x+=(desiredX-p.x)*Math.min(1,dt*.8);p.z+=(desiredZ-p.z)*Math.min(1,dt*.8);
      const angle=Math.atan2(player.position.x-p.x,player.position.z-p.z);d.root.rotation.y=turnToward(d.root.rotation.y,angle,dt*1.8);
      if(d.timer<=0&&dist<8&&dragons.filter(v=>v.mode!=='idle').length<2){d.mode='charge';d.timer=RULES.chargeTime;d.angle=angle;d.root.rotation.y=angle;d.fan.visible=true;d.label.className='dragon-label warning';d.label.textContent='Big breath…';beep(230,.18,'sine',.025);}
    }else if(d.mode==='charge'){
      d.fan.material.color.setHex(0xffba48);d.fan.material.opacity=.28+(1-d.timer/RULES.chargeTime)*.3;
      if(d.timer<=0){d.mode='fire';d.timer=RULES.fireTime;d.label.className='dragon-label firing';d.label.textContent=['ACHOO!','FWOOSH!','PUFF!','HONK!'][d.index];beep(85,.25,'sawtooth',.024);}
    }else if(d.mode==='fire'){
      d.fan.material.color.setHex(0xff713f);d.fan.material.opacity=.42;
      if(insideFire(player.position.x,player.position.z,p.x,p.z,d.angle))hit();
      if(d.timer<=0){d.mode='idle';d.timer=3.4+d.index*.37;d.fan.visible=false;d.label.className='dragon-label';d.label.textContent=d.name;}
    }
    d.fan.position.set(p.x,.05,p.z);d.fan.rotation.y=d.angle;
    const inflate=d.mode==='charge'?1+(1-d.timer/RULES.chargeTime)*.045:1;d.sway.scale.set(inflate,1,inflate);
    d.sway.position.y=reducedMotion?0:Math.sin(state.time*2+d.phase)*.035;
    d.sway.rotation.z=reducedMotion?0:Math.sin(state.time*1.5+d.phase)*.018;
    d.shadow.position.set(p.x,.04,p.z);
    if(state.mode!=='playing')break;
  }
}
function updateEffects(dt){
  let count=0;
  for(const d of dragons){
    if(!d||d.mode!=='fire')continue;
    for(let i=0;i<22;i++){
      const t=(state.time*1.6+i/22)%1;const distance=.75+t*(RULES.fireLength-.75);const spread=Math.sin(i*27.1+state.time*6)*t*.85;
      dummy.position.set(d.root.position.x+Math.sin(d.angle)*distance+Math.cos(d.angle)*spread,d.height*d.mouth*(1-t)+.23,d.root.position.z+Math.cos(d.angle)*distance-Math.sin(d.angle)*spread);
      dummy.rotation.set(i+state.time,i*.7,0);dummy.scale.setScalar(.11+t*.32);dummy.updateMatrix();fireMesh.setMatrixAt(count,dummy.matrix);fireMesh.setColorAt(count,new THREE.Color(i%3===0?0xffe992:i%3===1?0xff9d36:0xff6335));count++;
    }
  }
  fireMesh.count=count;fireMesh.instanceMatrix.needsUpdate=true;if(fireMesh.instanceColor)fireMesh.instanceColor.needsUpdate=true;
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=7*dt;}
  particles.forEach((p,i)=>{dummy.position.set(p.x,Math.max(.06,p.y),p.z);dummy.rotation.set(p.life*5,p.life*7,0);dummy.scale.setScalar(Math.min(1,p.life*3));dummy.updateMatrix();particlesMesh.setMatrixAt(i,dummy.matrix);particlesMesh.setColorAt(i,new THREE.Color(p.color));});
  particlesMesh.count=particles.length;particlesMesh.instanceMatrix.needsUpdate=true;if(particlesMesh.instanceColor)particlesMesh.instanceColor.needsUpdate=true;
}
function renderLabels(){
  for(const d of dragons){if(!d)continue;temp.set(d.root.position.x,d.height+.35,d.root.position.z).project(camera);const x=(temp.x*.5+.5)*innerWidth,y=(-temp.y*.5+.5)*innerHeight;d.label.style.transform=`translate(${x}px,${y}px) translate(-50%,-100%)`;d.label.style.visibility=overlay.hidden&&temp.z<1&&x>20&&x<innerWidth-20&&y>125&&y<innerHeight-120?'visible':'hidden';}
}
function frame(now){
  requestAnimationFrame(frame);const dt=Math.min((now-lastFrame)/1000||0,.04);lastFrame=now;
  if(!scene)return;
  if(state.mode==='playing'){state.time+=dt;state.elapsed+=dt;movePlayer(dt);if(state.mode==='playing')updateDragons(dt);}
  else if(state.mode==='ready'||state.mode==='loading'){state.time+=dt;for(const d of dragons){if(!d)continue;d.sway.rotation.z=reducedMotion?0:Math.sin(state.time*1.4+d.phase)*.02;d.shadow.position.set(d.root.position.x,.04,d.root.position.z);}}
  if(state.mode!=='paused')updateEffects(dt);
  for(const g of gems)if(!g.collected){g.mesh.rotation.y=state.time+g.phase;g.mesh.position.y=.66+Math.sin(state.time*2.5+g.phase)*.12;}
  if(player){
    const playing=['playing','paused','won','lost'].includes(state.mode),follow=innerWidth/innerHeight<.85?1:.38;
    const tx=playing?player.position.x*follow:0,tz=playing?player.position.z*follow-1:1;
    camTarget.x+=(tx-camTarget.x)*Math.min(1,dt*4);camTarget.z+=(tz-camTarget.z)*Math.min(1,dt*4);
    camera.position.set(camTarget.x,23,camTarget.z+26);camera.lookAt(camTarget.x,0,camTarget.z);
  }
  camera.updateMatrixWorld();if(frameCount++%2===0)renderLabels();renderer.render(scene,camera);
}

function bindControls(){
  play.addEventListener('click',()=>{unlockAudio();if(state.mode==='error'){location.reload();return;}if(state.mode==='paused')resume();else if(['ready','won','lost'].includes(state.mode))newRound();});
  $('pause').addEventListener('click',()=>state.mode==='paused'?resume():pause());
  $('sound').addEventListener('click',()=>{unlockAudio();muted=!muted;$('sound').textContent=muted?'♪̸':'♫';$('sound').setAttribute('aria-pressed',String(muted));$('sound').setAttribute('aria-label',muted?'Turn sound on':'Turn sound off');});
  $('dash').addEventListener('pointerdown',e=>{e.preventDefault();unlockAudio();dash();});
  document.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d',' '].includes(k)&&state.mode==='playing'){e.preventDefault();input.keys.add(k);input.target=null;destinationRing.visible=false;if(k===' '&&!e.repeat)dash();}if(k==='escape'){state.mode==='paused'?resume():pause();}});
  document.addEventListener('keyup',e=>input.keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{resetInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();}});
  const joystick=$('joystick');
  const move=e=>{if(e.pointerId!==input.pointer)return;const r=joystick.getBoundingClientRect(),mx=e.clientX-r.left-r.width/2,mz=e.clientY-r.top-r.height/2,limit=r.width*.32,n=Math.max(limit,Math.hypot(mx,mz));input.x=mx/n;input.z=mz/n;$('stick').style.transform=`translate(${input.x*limit}px,${input.z*limit}px)`;input.target=null;destinationRing.visible=false;};
  joystick.addEventListener('pointerdown',e=>{if(state.mode!=='playing')return;e.preventDefault();unlockAudio();input.pointer=e.pointerId;joystick.setPointerCapture(e.pointerId);move(e);});joystick.addEventListener('pointermove',move);
  const release=e=>{if(e.pointerId===input.pointer){input.pointer=null;input.x=input.z=0;$('stick').style.transform='translate(0px,0px)';}};joystick.addEventListener('pointerup',release);joystick.addEventListener('pointercancel',release);joystick.addEventListener('lostpointercapture',release);
  canvas.addEventListener('pointerdown',e=>{if(state.mode!=='playing')return;const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);if(raycaster.ray.intersectPlane(plane,temp)){const[x,z]=clampArena(temp.x,temp.z);input.target={x,z};destinationRing.position.set(x,.05,z);destinationRing.visible=true;}canvas.focus({preventScroll:true});});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pause();state.mode='error';showPanel('LET’S WAKE THEM UP AGAIN','The dragons need a refresh.','Your device paused the 3D view. Reload to start a fresh round.','Reload game');});
}

async function boot(){
  try{createWorld();bindControls();requestAnimationFrame(frame);await loadDragons();}
  catch(error){console.error('Could not start Gem Meadow:',error);state.mode='error';play.disabled=false;play.textContent='Try loading again';$('panel-title').textContent='A dragon is running late.';$('panel-description').textContent='Check your connection and try again. This game needs a browser with WebGL 2 support.';$('panel-foot').textContent='If needed, open this link in Safari or Chrome.';$('load-track').hidden=true;play.onclick=()=>location.reload();}
}
boot();
