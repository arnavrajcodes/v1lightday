window.showErr=m=>{const n=document.getElementById('nogl');n.hidden=false;n.innerHTML='<span>'+m+'</span>';document.body.classList.add('on')};
addEventListener('error',e=>window.showErr('Something went wrong: '+(e.message||'unknown error')+'<br><small>Press F12, open Console and send me the red message.</small>'));
(()=>{
if(!window.THREE){window.showErr('three.js could not load. Check your internet connection and reload.');return}
const $=s=>document.querySelector(s),pad=n=>String(n).padStart(2,'0');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,demo=/[?&]demo/.test(location.search);
const T=demo?Date.now()+32000:Date.UTC(2026,10,18,10,16,0); // Nov 18 2026, 5:16 AM EST = 10:16 UTC
const DAY=864e5,KM=25902068371,VEL=16.9,me=Intl.DateTimeFormat().resolvedOptions().timeZone;
const fmt=(ms,z,o)=>new Intl.DateTimeFormat('en-GB',{timeZone:z,...o}).format(ms),hm={hour:'2-digit',minute:'2-digit',hour12:false};
const V3=THREE.Vector3,Y=new V3(0,1,0),clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),sm=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};

/* ---------- renderer ---------- */
let R;try{R=new THREE.WebGLRenderer({canvas:$('#gl'),antialias:true,powerPreference:'high-performance'})}catch(e){$('#nogl').hidden=false;return}
R.setPixelRatio(Math.min(devicePixelRatio||1,2));
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(55,1,.5,9000);
let comp,bloom;
if(THREE.EffectComposer&&THREE.UnrealBloomPass){comp=new THREE.EffectComposer(R);comp.addPass(new THREE.RenderPass(scene,cam));bloom=new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.55,.6,.88);comp.addPass(bloom)}
function resize(){R.setSize(innerWidth,innerHeight);if(comp)comp.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;
 if(innerWidth>900)cam.setViewOffset(innerWidth,innerHeight,-innerWidth*.12,0,innerWidth,innerHeight);else cam.clearViewOffset();cam.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

/* ---------- world layout (compressed scale: distance = 70 * AU^0.62) ---------- */
const f=au=>70*Math.pow(au,.62),TH=1.1,LAT=35*Math.PI/180;
const uV=new V3(Math.cos(LAT)*Math.cos(TH),Math.sin(LAT),Math.cos(LAT)*Math.sin(TH));
const SP=uV.clone().multiplyScalar(-f(173)),sd=SP.clone().normalize(); // Sun position; Voyager sits at the origin
const NZ=`float h(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float n(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+7.1;a*=.5;}return s;}`;
const U={t:{value:0}};
const GT=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();
const spr=(col,s,o=1)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:GT,color:col,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:o}));m.scale.setScalar(s);scene.add(m);return m};

/* ---------- deep space: nebula, milky way, stars (follow the camera) ---------- */
const neb=new THREE.Mesh(new THREE.SphereGeometry(4000,64,32),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:U,
 vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec3 vP;uniform float t;${NZ}
 void main(){vec3 d=normalize(vP);float a=fbm(d*2.4),b=fbm(d*4.5+5.),c=fbm(d*3.2+20.);
 vec3 col=vec3(.004,.006,.014);
 col+=vec3(.035,.07,.16)*smoothstep(.42,.85,a);
 col+=vec3(.14,.09,.05)*smoothstep(.6,.9,b)*.5;
 col+=vec3(.01,.09,.11)*smoothstep(.62,.92,c)*.5;
 float mw=exp(-pow((d.y+.35*d.x-.1)*3.2,2.));col+=vec3(.55,.5,.45)*mw*(.015+.11*pow(fbm(d*9.),2.));
 gl_FragColor=vec4(col,1.);}`}));
neb.renderOrder=-10;scene.add(neb);
const sky=(()=>{const N=innerWidth<700?5000:11000,p=new Float32Array(N*3),c=new Float32Array(N*3),s=new Float32Array(N),pal=[[1,1,1],[.72,.85,1],[1,.88,.7],[1,.78,.7]];
 for(let i=0;i<N;i++){const u=Math.random()*2-1,a=Math.random()*6.283,r=Math.sqrt(1-u*u),q=3000+Math.random()*500;p.set([r*Math.cos(a)*q,u*q,r*Math.sin(a)*q],i*3);c.set(pal[i%4],i*3);s[i]=Math.pow(Math.random(),4)*4.5+1.1}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('size',new THREE.BufferAttribute(s,1));
 const m=new THREE.Points(g,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:U,
  vertexShader:'attribute float size;attribute vec3 color;varying vec3 vC;varying float vA;uniform float t;void main(){vC=color;vA=.65+.35*sin(t*1.3+position.x*.07);gl_PointSize=size*'+R.getPixelRatio().toFixed(1)+';gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=smoothstep(.5,0.,d);gl_FragColor=vec4(vC*a*vA*1.5,a);}'}));
 m.renderOrder=-9;scene.add(m);return m})();

/* ---------- the Sun ---------- */
const sunM=new THREE.Mesh(new THREE.SphereGeometry(26,64,48),new THREE.ShaderMaterial({uniforms:{...U,c:{value:SP}},
 vertexShader:'varying vec3 vP,vW;void main(){vP=position;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}',
 fragmentShader:`varying vec3 vP,vW;uniform vec3 c;uniform float t;${NZ}
 void main(){vec3 p=normalize(vP),N=normalize(vW-c),V=normalize(cameraPosition-vW);float g=fbm(p*5.+vec3(t*.03,0,0))*.8+fbm(p*14.+t*.05)*.4;
 vec3 col=mix(vec3(1.,.5,.12),vec3(1.,.93,.7),g)*(.55+.45*sqrt(max(dot(N,V),0.)))*2.4;gl_FragColor=vec4(col,1.);}`}));
sunM.position.copy(SP);scene.add(sunM);
const sg=[spr(0xffd9a0,320,.7),spr(0xff9a4a,1000,.16),spr(0xffffff,110,.9)];sg.forEach(s=>s.position.copy(SP));

/* ---------- planets ---------- */
const PL=[
 {n:'Mercury',au:.39,R:1.4,a:TH+2.1,col:[[.45,.42,.4],[.62,.58,.52],[.3,.3,.3]],b:0,w:.4,s:1},
 {n:'Venus',au:.72,R:2.8,a:TH-2.3,col:[[.85,.7,.45],[.95,.86,.62],[.7,.55,.35]],b:5,w:.3,s:2},
 {n:'Earth',au:1,R:3.2,a:TH+.9,earth:1},
 {n:'Mars',au:1.52,R:2,a:TH+2.9,col:[[.6,.28,.15],[.75,.4,.22],[.35,.18,.1]],b:0,w:.4,s:3},
 {n:'Jupiter',au:5.2,R:11,a:TH+.45,col:[[.82,.7,.55],[.6,.4,.27],[.94,.87,.76]],b:24,w:1.1,s:4},
 {n:'Saturn',au:9.5,R:9.5,a:TH+.1,col:[[.9,.8,.6],[.76,.64,.45],[.95,.9,.78]],b:28,w:.5,s:5,ring:1},
 {n:'Uranus',au:19.2,R:5.5,a:TH-.55,col:[[.55,.82,.85],[.5,.78,.82],[.72,.93,.93]],b:5,w:.2,s:6},
 {n:'Neptune',au:30.1,R:5.4,a:TH-1.25,col:[[.2,.35,.9],[.14,.27,.78],[.42,.56,1]],b:9,w:.4,s:7}];
const PV='varying vec3 vP,vW,vC;void main(){vP=position;vW=(modelMatrix*vec4(position,1.)).xyz;vC=(modelMatrix*vec4(0.,0.,0.,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}';
const earthMat=new THREE.ShaderMaterial({uniforms:{...U,sun:{value:SP}},vertexShader:PV,
 fragmentShader:`varying vec3 vP,vW,vC;uniform vec3 sun;uniform float t;${NZ}
 void main(){vec3 p=normalize(vP),N=normalize(vW-vC),L=normalize(sun-vC);float d=dot(N,L);
 float isL=smoothstep(.5,.55,fbm(p*2.2+3.));
 vec3 oc=mix(vec3(.01,.06,.28),vec3(.03,.28,.7),fbm(p*5.)),lc=mix(vec3(.08,.3,.1),vec3(.62,.5,.3),fbm(p*6.));
 float cl=smoothstep(.52,.78,fbm(p*3.+vec3(t*.02,0,t*.01)+9.));
 vec3 b=mix(oc,lc,isL);b=mix(b,vec3(.95,.97,1.),smoothstep(.82,.95,abs(p.y)));b=mix(b,vec3(1.),cl*.85);
 float lit=smoothstep(-.08,.3,d);vec3 col=b*(.04+lit*1.1);
 col+=vec3(1.,.72,.35)*isL*step(.64,fbm(p*18.))*(1.-lit)*(1.-cl)*1.1;
 vec3 Vv=normalize(cameraPosition-vW),H=normalize(L+Vv);col+=(1.-isL)*pow(max(dot(N,H),0.),70.)*.55*lit;
 col+=vec3(.25,.55,1.)*pow(1.-max(dot(N,Vv),0.),3.)*.6*(.3+lit);gl_FragColor=vec4(col,1.);}`});
const atmMat=new THREE.ShaderMaterial({side:THREE.BackSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
 vertexShader:'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'varying vec3 vN;void main(){float i=pow(max(.72-dot(vN,vec3(0,0,1)),0.),3.5);gl_FragColor=vec4(.3,.62,1.,1.)*i*2.;}'});
const gasFS=`varying vec3 vP,vW,vC;uniform vec3 c1,c2,c3,sun;uniform float bands,wob,seed;${NZ}
 void main(){vec3 p=normalize(vP),N=normalize(vW-vC),L=normalize(sun-vC);float d=dot(N,L);
 float turb=fbm(p*vec3(2.,6.,2.)+seed),b=sin(p.y*bands+turb*wob*8.+seed)*.5+.5,m=fbm(p*5.+seed*3.);
 vec3 col=mix(mix(c1,c2,b),c3,m*.55);if(bands<.5)col=mix(mix(c1,c2,m),c3,fbm(p*14.+seed)*.6);
 float lit=smoothstep(-.05,.3,d);col*=.02+lit*1.15;vec3 Vv=normalize(cameraPosition-vW);col+=c3*pow(1.-max(dot(N,Vv),0.),3.)*.3*lit;gl_FragColor=vec4(col,1.);}`;
const ringFS=`varying vec3 vP;uniform float uR;
 void main(){float rr=(length(vP.xy)/uR-1.35)/1.15;float a=smoothstep(0.,.05,rr)*smoothstep(1.,.92,rr)*(.3+.5*(sin(rr*95.)*.5+.5))*(1.-.92*exp(-pow((rr-.62)/.025,2.)));
 vec3 col=vec3(.86,.77,.6)*(.6+.4*sin(rr*38.));gl_FragColor=vec4(col,a);}`;
const planetPos=(p,t)=>{const a=p.a+t*.004/Math.pow(p.au,1.5),r=f(p.au);return new V3(SP.x+Math.cos(a)*r,SP.y,SP.z+Math.sin(a)*r)};
PL.forEach(p=>{
 let m;
 if(p.earth){m=new THREE.Mesh(new THREE.SphereGeometry(p.R,64,48),earthMat);m.add(new THREE.Mesh(new THREE.SphereGeometry(p.R*1.14,48,32),atmMat))}
 else m=new THREE.Mesh(new THREE.SphereGeometry(p.R,48,32),new THREE.ShaderMaterial({uniforms:{c1:{value:new V3(...p.col[0])},c2:{value:new V3(...p.col[1])},c3:{value:new V3(...p.col[2])},sun:{value:SP},bands:{value:p.b},wob:{value:p.w},seed:{value:p.s*3.7}},vertexShader:PV,fragmentShader:gasFS}));
 if(p.ring){const r=new THREE.Mesh(new THREE.RingGeometry(p.R*1.35,p.R*2.5,128,1),new THREE.ShaderMaterial({uniforms:{uR:{value:p.R}},transparent:true,side:THREE.DoubleSide,depthWrite:false,
  vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:ringFS}));r.rotation.set(-Math.PI/2+.47,0,.2);m.add(r)}
 scene.add(m);p.m=m;p.g=spr(p.earth?0x8fb4e3:0xf3eee3,p.R*7,0);
 const o=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({length:240},(_,i)=>new V3(Math.cos(i/240*6.2832)*f(p.au),0,Math.sin(i/240*6.2832)*f(p.au)))),new THREE.LineBasicMaterial({color:0x8fb4e3,transparent:true,opacity:.2,blending:THREE.AdditiveBlending}));o.position.copy(SP);scene.add(o)});
const PE=PL[2],PJ=PL[4],PS=PL[5];
function belt(r0,r1,th,n,size,op,col){const p=new Float32Array(n*3);for(let i=0;i<n;i++){const a=Math.random()*6.283,r=r0+Math.random()*(r1-r0);p.set([SP.x+Math.cos(a)*r,SP.y+(Math.random()-.5)*th,SP.z+Math.sin(a)*r],i*3)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));scene.add(new THREE.Points(g,new THREE.PointsMaterial({size,map:GT,color:col,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false})))}
belt(f(2.2),f(3.3),8,3000,2.4,.7,0xd9c7a8);belt(f(30)*1.04,f(50),70,4500,4,.4,0x9db8d8);
// heliopause: edge of the Sun's wind
const HP=f(121);
const hpM=new THREE.Mesh(new THREE.SphereGeometry(HP,64,48),new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,
 vertexShader:'varying vec3 vN,vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}',
 fragmentShader:'varying vec3 vN,vW;void main(){vec3 V=normalize(cameraPosition-vW);float f=pow(1.-abs(dot(normalize(vN),V)),3.);gl_FragColor=vec4(vec3(.3,.55,.95)*f*.6,f*.6);}'}));hpM.position.copy(SP);scene.add(hpM);

/* ---------- Voyager's path, light beam, photons ---------- */
const rad=(q,R0)=>q.clone().sub(SP).setY(0).normalize().multiplyScalar(R0);
const E0=planetPos(PE,0),J0=planetPos(PJ,0),S0=planetPos(PS,0),hr=(h,y)=>SP.clone().add(new V3(Math.cos(TH)*h,y,Math.sin(TH)*h));
const tang=new V3(Math.sin(PE.a),0,-Math.cos(PE.a)).multiplyScalar(PE.R+5);
const traj=new THREE.CatmullRomCurve3([E0.clone().add(tang).add(new V3(0,2,0)),J0.clone().add(rad(J0,PJ.R+16)).add(new V3(0,4,0)),S0.clone().add(rad(S0,PS.R+16)).add(new V3(0,6,0)),hr(620,160),hr(1000,520),new V3(0,0,0)]);
const trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints(traj.getPoints(400)),new THREE.LineBasicMaterial({color:0xe3bd78,transparent:true,opacity:.75,blending:THREE.AdditiveBlending}));scene.add(trail);
const bp=new Float32Array(6),bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(bp,3));
scene.add(new THREE.Line(bg,new THREE.LineBasicMaterial({color:0x8fb4e3,transparent:true,opacity:.3,blending:THREE.AdditiveBlending})));
const O=new V3(),ph=Array.from({length:6},(_,i)=>({s:spr(0xcfe6ff,14),o:i/6})),pk=[],eP=E0.clone();

/* ---------- environment map so metal looks like metal ---------- */
{const pm=new THREE.PMREMGenerator(R),es=new THREE.Scene();
 es.add(new THREE.Mesh(new THREE.SphereGeometry(50,32,16),new THREE.MeshBasicMaterial({color:0x04060d,side:THREE.BackSide})));
 const s1=new THREE.Mesh(new THREE.SphereGeometry(5,16,8),new THREE.MeshBasicMaterial({color:new THREE.Color(14,12,9)}));s1.position.copy(sd).multiplyScalar(40);es.add(s1);
 const s2=new THREE.Mesh(new THREE.SphereGeometry(16,16,8),new THREE.MeshBasicMaterial({color:new THREE.Color(.18,.3,.6)}));s2.position.copy(sd).multiplyScalar(-35).add(new V3(0,14,0));es.add(s2);
 scene.environment=pm.fromScene(es).texture}

/* ---------- camera views ---------- */
const camDir=(al,el)=>{let c;for(const s of [1,-1]){const sv=new V3().crossVectors(sd,Y).normalize().multiplyScalar(s);c=sd.clone().multiplyScalar(-Math.cos(al)).addScaledVector(sv,Math.sin(al)).addScaledVector(Y,el).normalize();if(sd.dot(new V3().crossVectors(c.clone().negate(),Y).normalize())>0)return c}return c};
const cA=camDir(.5,.2),vRt=new V3().crossVectors(cA.clone().negate(),Y).normalize(),vUp=new V3().crossVectors(vRt,cA.clone().negate()).normalize();
const sph=v=>({th:Math.atan2(v.x,v.z),ph:Math.acos(v.y/v.length())}),dirE=E0.clone().normalize();

/* ---------- Voyager 1 ---------- */
const holder=new THREE.Group(),vg=new THREE.Group();holder.add(vg);scene.add(holder);
{const ft=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle='#5e4720';x.fillRect(0,0,256,256);
  for(let i=0;i<1500;i++){x.fillStyle=`rgba(${200+Math.random()*55|0},${150+Math.random()*60|0},${50+Math.random()*40|0},${Math.random()*.35})`;x.beginPath();x.moveTo(Math.random()*256,Math.random()*256);x.lineTo(Math.random()*256,Math.random()*256);x.lineTo(Math.random()*256,Math.random()*256);x.fill()}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t})();
 const white=new THREE.MeshStandardMaterial({color:0xdedad2,roughness:.6,metalness:.05,side:THREE.DoubleSide}),
  gold=new THREE.MeshStandardMaterial({color:0xe0ad4c,roughness:.28,metalness:.9}),
  foil=new THREE.MeshStandardMaterial({color:0xffffff,map:ft,bumpMap:ft,bumpScale:1.2,roughness:.4,metalness:.65}),
  dark=new THREE.MeshStandardMaterial({color:0x23252f,roughness:.5,metalness:.55}),
  steel=new THREE.MeshStandardMaterial({color:0xc6cad6,roughness:.3,metalness:.92}),
  copper=new THREE.MeshStandardMaterial({color:0xc2682d,roughness:.35,metalness:.85}),
  lineM=new THREE.LineBasicMaterial({color:0xd9b25a});
 const v3=(x,y,z)=>new V3(x,y,z);
 const strut=(a,b,m,r=.03)=>{const d=b.clone().sub(a),l=d.length(),s=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,6),m);s.position.copy(a).addScaledVector(d,.5);s.quaternion.setFromUnitVectors(Y,d.normalize());vg.add(s)};
 const ad=(geo,m,pos,rot)=>{const o=new THREE.Mesh(geo,m);o.position.copy(pos);if(rot)o.rotation.set(...rot);vg.add(o);return o};
 const truss=(a,b,r,step,m)=>{const d=b.clone().sub(a),L=d.length(),dir=d.clone().normalize(),q=new THREE.Quaternion().setFromUnitVectors(Y,dir),u=v3(1,0,0).applyQuaternion(q),w=v3(0,0,1).applyQuaternion(q),
  P=[0,1,2].map(i=>u.clone().multiplyScalar(Math.cos(i*2.094)*r).addScaledVector(w,Math.sin(i*2.094)*r));
  P.forEach(o=>strut(a.clone().add(o),b.clone().add(o),m,.016));const n=Math.max(1,Math.floor(L/step)),pts=[];
  for(let k=0;k<=n;k++){const c=a.clone().addScaledVector(dir,k*L/n),c2=a.clone().addScaledVector(dir,(k+1)*L/n);for(let i=0;i<3;i++){const p1=c.clone().add(P[i]),p2=c.clone().add(P[(i+1)%3]);pts.push(p1,p2);if(k<n)pts.push(p1,c2.clone().add(P[(i+1)%3]))}}
  vg.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),lineM))};
 // 3.7 m high-gain antenna (axis +Y points at Earth)
 const pts=[];for(let i=0;i<=30;i++){const r=1.83*i/30;pts.push(new THREE.Vector2(r,.2*r*r))}
 ad(new THREE.LatheGeometry(pts,80),white,new V3());
 const rimY=.2*1.83*1.83;ad(new THREE.TorusGeometry(1.83,.035,8,80),white,v3(0,rimY,0),[Math.PI/2,0,0]);
 ad(new THREE.CylinderGeometry(.42,.42,.12,24),steel,v3(0,-.08,0));
 for(let k=0;k<12;k++){const a=k*.5236;strut(v3(Math.cos(a)*.4,-.07,Math.sin(a)*.4),v3(Math.cos(a)*1.8,rimY-.05,Math.sin(a)*1.8),steel,.016)}
 for(let k=0;k<4;k++){const a=k*1.5708+.78;strut(v3(Math.cos(a)*1.65,.2*1.65*1.65,Math.sin(a)*1.65),v3(0,1.7,0),steel,.02)}
 ad(new THREE.ConeGeometry(.2,.3,24),gold,v3(0,1.58,0));ad(new THREE.CylinderGeometry(.06,.06,.28,12),steel,v3(0,1.88,0));
 // 10-sided bus wrapped in thermal foil
 ad(new THREE.CylinderGeometry(.95,.95,.5,10),foil,v3(0,-.5,0));
 ad(new THREE.CylinderGeometry(.99,.99,.04,10),gold,v3(0,-.24,0));ad(new THREE.CylinderGeometry(.99,.99,.04,10),gold,v3(0,-.76,0));
 for(let k=0;k<5;k++){const a=k*1.257+.3;strut(v3(Math.cos(a)*.62,-.26,Math.sin(a)*.62),v3(Math.cos(a)*.95,.12,Math.sin(a)*.95),steel,.024)}
 ad(new THREE.BoxGeometry(.5,.28,.5),dark,v3(-.35,-.5,.92));ad(new THREE.BoxGeometry(.4,.3,.12),dark,v3(.4,-.5,-.95));
 // Golden Record in its cover
 ad(new THREE.CylinderGeometry(.36,.36,.035,48),steel,v3(.97,-.5,0),[0,0,Math.PI/2]);ad(new THREE.CylinderGeometry(.3,.3,.04,48),gold,v3(.985,-.5,0),[0,0,Math.PI/2]);ad(new THREE.TorusGeometry(.18,.01,6,40),steel,v3(1.01,-.5,0),[0,Math.PI/2,0]);
 // RTG boom with three finned RTGs
 truss(v3(-.95,-.5,0),v3(-5.5,-.5,0),.11,.5,steel);
 for(let k=0;k<3;k++){const x=-2.5-k*1.0;ad(new THREE.CylinderGeometry(.19,.19,.85,16),dark,v3(x,-.5,0),[0,0,Math.PI/2]);for(let j=-2;j<=2;j++)ad(new THREE.CylinderGeometry(.27,.27,.025,18),steel,v3(x+j*.17,-.5,0),[0,0,Math.PI/2])}
 // science boom and scan platform
 truss(v3(0,-.5,.95),v3(0,-.5,3.8),.1,.4,steel);
 ad(new THREE.BoxGeometry(.75,.55,.65),foil,v3(0,-.5,4.05));
 ad(new THREE.CylinderGeometry(.13,.13,.7,14),dark,v3(.38,-.2,4.45),[Math.PI/2,0,0]);ad(new THREE.CylinderGeometry(.09,.09,.4,14),dark,v3(.1,-.2,4.35),[Math.PI/2,0,0]);
 ad(new THREE.CylinderGeometry(.3,.3,.06,28),copper,v3(-.42,-.5,4.18),[Math.PI/2,0,0]);ad(new THREE.BoxGeometry(.3,.3,.4),gold,v3(-.1,-.9,4.15));
 // 13 m magnetometer boom
 truss(v3(0,-.45,-.95),v3(0,-.45,-13.9),.1,.55,gold);
 ad(new THREE.CylinderGeometry(.11,.11,.45,12),dark,v3(0,-.45,-1.1),[Math.PI/2,0,0]);ad(new THREE.BoxGeometry(.2,.2,.3),dark,v3(0,-.45,-8.4));
 ad(new THREE.CylinderGeometry(.09,.09,.5,12),dark,v3(0,-.45,-14.1),[Math.PI/2,0,0]);
 // 10 m plasma-wave antennas
 strut(v3(.6,-.6,-.6),v3(7.4,-1.1,-6.9),steel,.011);strut(v3(.6,-.6,.6),v3(7.4,-1.1,6.9),steel,.011);
 vg.quaternion.setFromUnitVectors(Y,dirE);
 const b0=v3(0,0,-1).applyQuaternion(vg.quaternion),pj=v=>v.clone().sub(dirE.clone().multiplyScalar(v.dot(dirE))).normalize(),want=pj(vRt.clone().multiplyScalar(.85).addScaledVector(vUp,.5));
 vg.rotateOnWorldAxis(dirE,Math.atan2(new V3().crossVectors(b0,want).dot(dirE),b0.dot(want)));
}
scene.add(new THREE.HemisphereLight(0x8fa8ff,0x0a0814,.3));
const sunL=new THREE.DirectionalLight(0xfff1dc,2.4);sunL.position.copy(sd).multiplyScalar(100);scene.add(sunL);
const fillL=new THREE.DirectionalLight(0x6f94d8,.55);fillL.position.copy(sd).multiplyScalar(-100).add(new V3(0,40,0));scene.add(fillL);

/* ---------- orbit controls ---------- */
const bA=sph(cA),bB=sph(camDir(1.45,.28)),rA=innerWidth<700?38:27,rB=innerWidth<700?15:11;
const OB={th:bA.th,ph:bA.ph,r:rA};let goal=null,idle=0;
const orbitPos=()=>new V3(OB.r*Math.sin(OB.ph)*Math.sin(OB.th),OB.r*Math.cos(OB.ph),OB.r*Math.sin(OB.ph)*Math.cos(OB.th));
const cv=$('#gl'),ptr=new Map();let pd=0;
cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);ptr.set(e.pointerId,e);goal=null;idle=0});
cv.addEventListener('pointermove',e=>{const o=ptr.get(e.pointerId);if(!o)return;idle=0;
 if(ptr.size===1){OB.th-=(e.clientX-o.clientX)*.006;OB.ph=clamp(OB.ph-(e.clientY-o.clientY)*.006,.25,2.9)}
 ptr.set(e.pointerId,e);if(ptr.size===2){const [a,b]=[...ptr.values()],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pd)OB.r=clamp(OB.r*pd/d,6,70);pd=d}});
const pu=e=>{ptr.delete(e.pointerId);pd=0};cv.addEventListener('pointerup',pu);cv.addEventListener('pointercancel',pu);
cv.addEventListener('wheel',e=>{e.preventDefault();OB.r=clamp(OB.r*(1+e.deltaY*.001),6,70);idle=0},{passive:false});
const tools=$('#tools'),mk=(t,fn)=>{const b=document.createElement('button');b.type='button';b.className='btn g';b.textContent=t;b.onclick=fn;tools.append(b);return b};
let close=false;const vb=mk('Close-up',()=>{close=!close;goal={...(close?bB:bA),r:close?rB:rA};vb.textContent=close?'Solar system view':'Close-up'});

/* ---------- labels ---------- */
const labs=[['Sun','',()=>SP],['Earth','24 light-hours away',()=>eP],['Jupiter','',()=>PJ.p],['Saturn','',()=>PS.p],['Neptune','',()=>PL[7].p],['Heliopause','edge of the Sun’s wind',()=>SP.clone().addScaledVector(uV,HP)]].map(([n,s,g])=>{const el=document.createElement('div');el.className='elab';el.innerHTML=n+(s?`<small>${s}</small>`:'');$('#labs').append(el);return{el,g}});

/* ---------- intro flight ---------- */
let intro=0;const INTRO=20,OFF=new V3(11,10,13),look=new V3(),tgt=new V3(0,.8,0);let ck='';
const fc=$('#flyc'),cap=(k,h)=>{if(k===ck)return;ck=k;if(k){fc.innerHTML=h;fc.classList.add('on')}else fc.classList.remove('on')};
function caption(){const d=p=>cam.position.distanceTo(p.p);
 if(d(PE)<24)return cap('e','<b>Earth</b><small>September 5, 1977 · Launch</small>');
 if(d(PJ)<90)return cap('j','<b>Jupiter</b><small>March 5, 1979 · Flyby</small>');
 if(d(PS)<90)return cap('s','<b>Saturn</b><small>November 12, 1980 · Flyby</small>');
 const q=cam.position.distanceTo(SP);if(q>HP-70&&q<HP+180)return cap('h','<b>The heliopause</b><small>August 25, 2012 · Interstellar space</small>');cap('')}
const finish=()=>{intro=INTRO;trail.geometry.setDrawRange(0,402);document.body.classList.add('on');cap('')};
$('#skip').onclick=finish;
mk('Replay flight',()=>{intro=0;goal=null;document.body.classList.remove('on')});

/* ---------- premium fireworks ---------- */
const FN=16000,F={P:new Float32Array(FN*3),C:new Float32Array(FN*3),S:new Float32Array(FN),A:new Float32Array(FN),V:new Float32Array(FN*3),L:new Float32Array(FN),M:new Float32Array(FN),G:new Float32Array(FN),D:new Float32Array(FN),K:new Uint8Array(FN),B:new Float32Array(FN),i:0,dirty:false};
const fgm=new THREE.BufferGeometry();fgm.setAttribute('position',new THREE.BufferAttribute(F.P,3));fgm.setAttribute('color',new THREE.BufferAttribute(F.C,3));fgm.setAttribute('size',new THREE.BufferAttribute(F.S,1));fgm.setAttribute('alpha',new THREE.BufferAttribute(F.A,1));
const fpts=new THREE.Points(fgm,new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:'attribute float size;attribute float alpha;attribute vec3 color;varying vec3 vC;varying float vA;void main(){vC=color;vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*'+R.getPixelRatio().toFixed(1)+'*(320./-mv.z);gl_Position=projectionMatrix*mv;}',
 fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);float a=1.-smoothstep(0.,.5,d);a*=a;gl_FragColor=vec4(vC*a*vA*2.2,a*vA);}'}));
fpts.frustumCulled=false;fpts.renderOrder=5;scene.add(fpts);
const PAL={gold:[[.95,.76,.42],[1,.88,.6],[.85,.62,.28]],ivory:[[1,.97,.9],[1,1,1],[.95,.9,.8]],steel:[[.6,.76,.95],[.82,.92,1],[.45,.62,.9]]};
function emit(x,y,z,vx,vy,vz,col,size,life,grav,drag,kind){const i=F.i=(F.i+1)%FN,j=i*3;F.P[j]=x;F.P[j+1]=y;F.P[j+2]=z;F.V[j]=vx;F.V[j+1]=vy;F.V[j+2]=vz;F.C[j]=col[0];F.C[j+1]=col[1];F.C[j+2]=col[2];F.B[i]=size;F.L[i]=F.M[i]=life;F.G[i]=grav;F.D[i]=drag;F.K[i]=kind}
const basis=()=>({f:new V3(0,0,-1).applyQuaternion(cam.quaternion),r:new V3(1,0,0).applyQuaternion(cam.quaternion),u:new V3(0,1,0).applyQuaternion(cam.quaternion)});
const rdir=()=>{const u=Math.random()*2-1,a=Math.random()*6.2832,r=Math.sqrt(1-u*u);return[r*Math.cos(a),u,r*Math.sin(a)]};
function burst(B,type,pal){const bs=basis(),pick=()=>pal[Math.random()*pal.length|0];
 emit(B.x,B.y,B.z,0,0,0,[1,.95,.82],18,.4,0,0,0);
 for(let i=0;i<70;i++){const d=rdir(),s=2+Math.random()*5;emit(B.x,B.y,B.z,d[0]*s,d[1]*s,d[2]*s,[1,.96,.85],2.2,1.1,0,2,0)}
 if(type==='peony')for(let i=0;i<460;i++){const d=rdir(),s=19+Math.random()*7;emit(B.x,B.y,B.z,d[0]*s,d[1]*s,d[2]*s,pick(),1.5,2.4+Math.random()*.7,3.2,1.1,Math.random()<.35?1:0)}
 else if(type==='ring'){for(let i=0;i<260;i++){const a=i/260*6.2832,s=25+Math.random()*1.5,x=Math.cos(a),y=Math.sin(a);emit(B.x,B.y,B.z,(bs.r.x*x+bs.u.x*y)*s,(bs.r.y*x+bs.u.y*y)*s,(bs.r.z*x+bs.u.z*y)*s,pick(),1.6,2.5,1.5,1.1,i%3?0:1)}
  for(let i=0;i<150;i++){const d=rdir(),s=5+Math.random()*7;emit(B.x,B.y,B.z,d[0]*s,d[1]*s,d[2]*s,PAL.ivory[1],1.2,1.9,2,1.2,2)}}
 else for(let i=0;i<340;i++){const d=rdir(),s=12+Math.random()*10;emit(B.x,B.y,B.z,d[0]*s,d[1]*s,d[2]*s,pick(),1.35,4.8+Math.random()*1.2,6.5,1.5,2)}}
const rockets=[];
function launch(nx,ny,D,type,pal){const bs=basis(),hh=D*Math.tan(cam.fov*Math.PI/360),hw=hh*cam.aspect,off=innerWidth>900?-.24:0;
 const B=cam.position.clone().addScaledVector(bs.f,D).addScaledVector(bs.r,(nx+off)*hw).addScaledVector(bs.u,ny*hh);
 const A=B.clone().addScaledVector(bs.u,-hh*1.6).addScaledVector(bs.r,(Math.random()-.5)*hh*.35);
 rockets.push({p:A.clone(),v:B.clone().sub(A).divideScalar(1.2),t:0,T:1.2,B,type,pal})}
function fwUpdate(dt,t){let any=rockets.length>0;
 for(let r=rockets.length;r--;){const k=rockets[r];k.t+=dt;k.p.addScaledVector(k.v,dt);for(let q=0;q<2;q++)emit(k.p.x,k.p.y,k.p.z,(Math.random()-.5)*2,(Math.random()-.5)*2-2,(Math.random()-.5)*2,[1,.82,.5],1,.55,0,1.5,0);
  if(k.t>=k.T){burst(k.B,k.type,PAL[k.pal]);rockets.splice(r,1)}}
 for(let i=0;i<FN;i++){if(F.L[i]<=0){if(F.A[i]){F.A[i]=0;F.S[i]=0;F.dirty=true}continue}any=true;const j=i*3;F.L[i]-=dt;
  if(F.L[i]<=0){F.A[i]=0;F.S[i]=0;continue}
  const k=1-F.D[i]*dt;F.V[j]*=k;F.V[j+1]=F.V[j+1]*k-F.G[i]*dt;F.V[j+2]*=k;F.P[j]+=F.V[j]*dt;F.P[j+1]+=F.V[j+1]*dt;F.P[j+2]+=F.V[j+2]*dt;
  const u=F.L[i]/F.M[i];let a=u*u;if(F.K[i]===2)a*=.5+.5*Math.sin(t*40+i*1.7);F.A[i]=a;F.S[i]=F.B[i]*(.45+.55*u);
  if(F.K[i]===1&&Math.random()<dt*10)emit(F.P[j],F.P[j+1],F.P[j+2],0,0,0,[F.C[j]*.8,F.C[j+1]*.8,F.C[j+2]*.8],F.B[i]*.55,.5,0,0,0)}
 if(any||F.dirty){['position','color','size','alpha'].forEach(n=>fgm.attributes[n].needsUpdate=true);F.dirty=any}}

/* ---------- celebration: shockwave, light bloom, choreographed salvos, cinematic camera ---------- */
const SCH=[[.5,0,.3,80,'peony','gold'],[1.6,-.5,.35,95,'ring','steel'],[1.9,.5,.35,95,'ring','steel'],[3,-.65,.5,85,'peony','ivory'],[3.3,.65,.5,85,'peony','gold'],[3.7,0,.62,100,'peony','ivory'],
 [5,-.4,.45,90,'willow','gold'],[5.2,.4,.45,90,'willow','gold'],[6,-.75,.3,80,'peony','steel'],[6.2,.75,.3,80,'peony','steel'],[6.8,0,.4,95,'ring','gold'],
 [8,-.8,.5,95,'willow','gold'],[8.15,-.4,.6,95,'willow','gold'],[8.3,0,.7,100,'willow','gold'],[8.45,.4,.6,95,'willow','gold'],[8.6,.8,.5,95,'willow','gold'],[9.4,0,.4,85,'ring','ivory'],[9.6,0,.4,85,'peony','gold']];
let cel=null;
const ft=$('#ft');ft.innerHTML=[...'One light-day.'].map((c,i)=>`<span style="--i:${i}">${c===' '?'&nbsp;':c}</span>`).join('');
function celebrate(){if(cel)return;
 const rings=[0,.35].map(d=>{const m=new THREE.Mesh(new THREE.RingGeometry(.985,1,128),new THREE.MeshBasicMaterial({color:d?0x8fb4e3:0xe3bd78,transparent:true,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false}));m.visible=false;scene.add(m);return{m,d}});
 const fl=spr(0xfff0d0,2,1);cel={t0:performance.now(),i:0,rings,fl};const fx=$('#fx');fx.hidden=true;void fx.offsetWidth;fx.hidden=false;document.body.classList.add('celebrating');if(intro<INTRO)finish();
 goal={th:OB.th+.55,ph:OB.ph,r:rA*.78};idle=0}
function stepCel(now){if(!cel)return;const a=(now-cel.t0)/1000;
 while(cel.i<SCH.length&&SCH[cel.i][0]<=a){const s=SCH[cel.i++];launch(s[1],s[2],s[3],s[4],s[5])}
 cel.rings.forEach(({m,d})=>{const k=a-d;m.visible=k>0&&k<3.4;if(m.visible){m.scale.setScalar(1+k*55);m.material.opacity=Math.pow(1-k/3.4,1.5)*.8;m.quaternion.copy(cam.quaternion)}});
 const fa=Math.max(0,1-a/1.3);cel.fl.visible=fa>0;if(fa>0){cel.fl.scale.setScalar(4+a*220);cel.fl.material.opacity=fa*fa}
 if(bloom)bloom.strength=.55+1.1*Math.exp(-a*1.1);
 if(a>15){scene.remove(...cel.rings.map(r=>r.m),cel.fl);cel=null;if(bloom)bloom.strength=.55}}
const closeFx=()=>{$('#fx').hidden=true;document.body.classList.remove('celebrating')};$('#fxc').onclick=closeFx;addEventListener('keydown',e=>{if(e.key==='Escape')closeFx()});
mk('Replay the moment',()=>{if(!cel)celebrate()});
if(reduce)finish();

/* ---------- loop ---------- */
const clk=new THREE.Clock(),wl=new V3();
(function loop(){const dt=Math.min(clk.getDelta(),.05),t=clk.elapsedTime,now=performance.now();U.t.value=t;
 PL.forEach(p=>{p.p=planetPos(p,t);p.m.position.copy(p.p);p.m.rotation.y=t*(p.earth?.05:.08);const d=cam.position.distanceTo(p.p);p.g.position.copy(p.p);p.g.material.opacity=clamp((d-p.R*25)/(p.R*70),0,1)*.85});
 eP.copy(PE.p);bp.set([eP.x,eP.y,eP.z,0,0,0]);bg.attributes.position.needsUpdate=true;
 sg.forEach((s,i)=>s.material.opacity=[.7,.16,.9][i]*clamp(cam.position.distanceTo(SP)/(i?900:450),.2,1));
 ph.forEach(q=>{q.o=(q.o+dt/10)%1;q.s.position.lerpVectors(eP,O,q.o);q.s.material.opacity=Math.sin(q.o*Math.PI)*.9});
 for(let i=pk.length;i--;){const k=pk[i];k.o+=dt/8;if(k.o>=1){scene.remove(k.s);pk.splice(i,1);continue}k.s.position.lerpVectors(eP,O,k.o);k.s.scale.setScalar(24+6*Math.sin(t*20))}
 holder.position.y=Math.sin(t*.8)*.1;holder.rotation.z=Math.sin(t*.5)*.02;holder.rotation.x=Math.cos(t*.4)*.018;
 if(goal){const w=a=>Math.atan2(Math.sin(a),Math.cos(a));OB.th+=w(goal.th-OB.th)*.05;OB.ph+=(goal.ph-OB.ph)*.05;OB.r+=(goal.r-OB.r)*.05}
 else if(intro>=INTRO){idle+=dt;if(idle>2.5)OB.th+=dt*.04}
 if(intro<INTRO){intro+=dt;const u0=clamp(intro/INTRO,0,1),u=u0<.5?4*u0*u0*u0:1-Math.pow(-2*u0+2,3)/2,p=traj.getPointAt(u),ah=traj.getPointAt(Math.min(u+.03,1)),fin=sm((u-.84)/.16);
  cam.position.lerpVectors(p.clone().addScaledVector(OFF,sm(u*7)),orbitPos(),fin);look.lerpVectors(wl.lerpVectors(eP,ah,sm(u*9)),tgt,fin);
  cam.fov=55+26*Math.sin(Math.PI*u0)*(1-fin);cam.updateProjectionMatrix();cam.lookAt(look);trail.geometry.setDrawRange(0,Math.floor(401*u)+1);caption();
  if(intro>=INTRO-3)document.body.classList.add('on');if(intro>=INTRO)finish()}
 else{cam.position.copy(orbitPos());cam.lookAt(tgt);if(cam.fov!==55){cam.fov=55;cam.updateProjectionMatrix()}}
 if(cel&&now-cel.t0<900)cam.position.x+=(Math.random()-.5)*.12;
 neb.position.copy(cam.position);sky.position.copy(cam.position);
 labs.forEach(l=>{const v=l.g().clone().project(cam);l.el.style.opacity=(intro>=INTRO&&v.z<1&&Math.abs(v.x)<1.05&&Math.abs(v.y)<1.05)?.9:0;l.el.style.left=((v.x*.5+.5)*innerWidth)+'px';l.el.style.top=((-v.y*.5+.5)*innerHeight)+'px'});
 fwUpdate(dt,t);stepCel(now);comp?comp.render():R.render(scene,cam);requestAnimationFrame(loop)})();

/* ---------- HUD ---------- */
let fired=false;
function tick(){const n=Date.now(),d=T-n,a=Math.floor(Math.abs(d)/1000);
 $('#h').textContent=pad(Math.floor(a/3600));$('#m').textContent=pad(Math.floor(a%3600/60));$('#s').textContent=pad(a%60);
 $('#odo').textContent=Math.round(KM+(n-T)/1000*VEL).toLocaleString('en-US').replace(/,/g,' ');
 const p=clamp((n-(T-DAY))/DAY,0,1);
 if(d>0){$('#ph').textContent=`The light that left Earth 24 hours ago is ${(p*100).toFixed(4)}% of the way to Voyager 1`;$('#kick').textContent='Reaching one light-day from Earth in'}
 else{document.body.classList.add('reached');$('#kick').textContent='Voyager 1 passed one light-day. Time since:';$('#ph').textContent='That light has landed. Anything you send now arrives tomorrow.';
  if(!fired){fired=true;if(n-T<120000||demo)celebrate()}}
 [...$('#fl').children].forEach(li=>{const r=Math.max(0,Math.floor((li._a-n)/1000));li.querySelector('b').textContent=`${pad(Math.floor(r/3600))}:${pad(Math.floor(r%3600/60))}:${pad(r%60)}`})}
setInterval(tick,250);tick();
const Z=[['India IST','Asia/Kolkata'],['UTC','UTC'],['New York','America/New_York'],['Los Angeles','America/Los_Angeles'],['London','Europe/London'],['Paris','Europe/Paris'],['Dubai','Asia/Dubai'],['Singapore','Asia/Singapore'],['Tokyo','Asia/Tokyo'],['Sydney','Australia/Sydney'],['São Paulo','America/Sao_Paulo']];
const row=Z.map(([n,z])=>`<span>${n}<b>${fmt(T,z,hm)}</b></span>`).join('');$('#mq').innerHTML=row+row;
$('#f').onsubmit=e=>{e.preventDefault();const v=$('#msg').value.trim().replace(/[<>&]/g,'');if(!v)return;$('#msg').value='';
 pk.push({s:spr(0xe3bd78,24),o:0});const arr=Date.now()+DAY,li=document.createElement('li');li._a=arr;
 li.innerHTML=`“${v}”: arrives in <b>24:00:00</b> · ${fmt(arr,me,{weekday:'short',...hm})} your time`+(me==='Asia/Kolkata'?'':` · ${fmt(arr,'Asia/Kolkata',hm)} IST`);
 $('#fl').prepend(li);while($('#fl').children.length>3)$('#fl').lastChild.remove()};
})();
