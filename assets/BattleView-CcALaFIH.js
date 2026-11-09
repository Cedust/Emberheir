import{$n as e,Gn as t,Kn as n,Ln as r,Rn as i,Wn as a,_r as o,ct as s,eo as c,pt as l,ri as u,rr as d,t as f,ua as p,yr as m,zn as h}from"./fx-rEJQKOme.js";import{_ as g,a as _,c as v,f as y,g as b,l as x,m as S,n as C,p as w,u as T,v as E,y as D}from"./pixi-FdZGFgvR.js";import{B as ee,R as te,U as O,V as k,W as A,_ as ne,d as re,f as ie,h as j,k as M,m as N,p as ae,r as P,rt as F,t as I,v as oe,z as se}from"./index-ByeGG-r9.js";import{n as ce,r as le}from"./pixiPacing-Ch89od2c.js";import{t as ue}from"./ArenaScene-DBluxtHp.js";import{a as L,n as R,r as z}from"./themeColors-D6OqOpGI.js";var B=c(),V=`
attribute vec2 aPosition;
attribute vec2 aUV;
varying vec2 vUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vUV = aUV;
}
`,H=`
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}
/* Frost: bright crystal seams where two noise fields cross their middle. */
float frost(vec2 p) {
  float a = abs(noise(p * 7.0) - 0.5);
  float b = abs(noise(p * 13.0 + 4.0) - 0.5);
  return smoothstep(0.05, 0.0, a) * 0.7 + smoothstep(0.04, 0.0, b) * 0.5;
}
`,U=`
uniform float uTime;
uniform float uFill;
uniform float uTrail;
uniform float uShield;
uniform float uSlosh;
uniform float uFlash;
uniform float uGlow;
uniform float uLow;
uniform float uThreshold;
uniform float uReady;
uniform float uStun;
uniform vec3 uDeep;
uniform vec3 uBright;
uniform vec3 uLight;
`,W=`
precision mediump float;
varying vec2 vUV;
${U}
${H}
void main() {
  vec2 p = vUV * 2.0 - 1.0;
  float r = length(p);
  float alpha = smoothstep(1.0, 0.975, r);
  if (alpha <= 0.0) { gl_FragColor = vec4(0.0); return; }

  // Lens: the liquid behind the curved glass bulges a little.
  vec2 lp = p * (0.86 + 0.14 * r * r);

  float wave = (sin(lp.x * 5.0 + uTime * 2.2) * 0.022 + sin(lp.x * 9.0 - uTime * 3.1) * 0.01)
    * (1.0 + uSlosh * 3.0)
    + sin(lp.x * 3.4 + uTime * 7.0) * uSlosh * 0.07;
  float surf = 1.0 - 2.0 * uFill + wave;
  float liquid = smoothstep(surf - 0.015, surf + 0.015, lp.y) * step(0.001, uFill);

  float n = fbm(lp * 1.7 + vec2(uTime * 0.12, uTime * 0.32));
  float n2 = fbm(lp * 3.1 + vec2(-uTime * 0.2, uTime * 0.12) + n * 1.6);
  float depth = clamp((lp.y - surf) * 0.55, 0.0, 1.0);
  vec3 liq = mix(uBright, uDeep, 0.15 + depth * 0.85);
  liq = mix(liq, uLight, smoothstep(0.55, 0.9, n2) * 0.5);
  liq *= 0.72 + 0.55 * n;
  // Rising light from the bottom (ember glow / blood shimmer).
  liq += uBright * 0.25 * smoothstep(0.3, 1.0, lp.y) * (0.6 + 0.4 * sin(uTime * 1.7 + lp.x * 3.0));
  float meniscus = exp(-abs(lp.y - surf) * 55.0) * liquid;
  liq += uLight * meniscus * 0.9;

  vec3 empty = vec3(0.035, 0.028, 0.025) + uDeep * 0.12 + uDeep * 0.1 * fbm(lp * 2.0 - uTime * 0.05);
  vec3 col = mix(empty, liq, liquid);

  // Damage trail: a pale ghost of the Life that just drained away.
  float trailSurf = 1.0 - 2.0 * uTrail + wave * 0.5;
  float trail = smoothstep(trailSurf - 0.012, trailSurf + 0.012, lp.y) * (1.0 - liquid);
  col = mix(col, mix(uBright, vec3(1.0, 0.92, 0.85), 0.55), trail * 0.6);

  // Barrier: an ice-cold shell over the Life, like Energy Shield.
  if (uShield > 0.001) {
    float sSurf = 1.0 - 2.0 * uShield + sin(lp.x * 6.0 + uTime * 1.1) * 0.012;
    float shield = smoothstep(sSurf - 0.01, sSurf + 0.01, lp.y);
    vec3 ice = vec3(0.42, 0.78, 1.0);
    float fr = frost(lp + vec2(0.0, uTime * 0.02));
    float shimmer = 0.5 + 0.5 * sin(uTime * 2.4 + lp.y * 9.0 + lp.x * 4.0);
    vec3 iced = mix(col, ice * (0.55 + 0.35 * shimmer), 0.6) + ice * fr * 0.55;
    iced += vec3(0.8, 0.95, 1.0) * exp(-abs(lp.y - sSurf) * 70.0) * 0.9;
    col = mix(col, iced, shield);
  }

  // The next skill's Trigger Threshold as a golden line on the Heat.
  if (uThreshold >= 0.0) {
    float ty = 1.0 - 2.0 * uThreshold;
    float line = exp(-abs(p.y - ty) * 140.0) * smoothstep(1.0, 0.8, abs(p.x) + 0.2);
    float pulse = 0.55 + uReady * (0.45 + 0.35 * sin(uTime * 10.0));
    col += vec3(1.0, 0.86, 0.45) * line * pulse * 1.4;
  }

  // Stunned: the liquid freezes grey.
  col = mix(col, vec3(dot(col, vec3(0.3, 0.55, 0.15))) * 0.8, uStun * 0.7);

  // Glass: darker rim, fresnel light, highlights.
  float rim = smoothstep(0.55, 1.0, r);
  col *= 1.0 - rim * 0.6;
  col += vec3(1.0, 0.94, 0.86) * smoothstep(0.9, 0.99, r) * 0.22;
  vec2 hp = (p - vec2(-0.32, -0.48)) * vec2(1.0, 1.7);
  col += vec3(1.0) * smoothstep(0.45, 0.0, length(hp)) * 0.28;
  col += vec3(1.0) * smoothstep(0.09, 0.0, length(p - vec2(-0.48, -0.5))) * 0.55;
  col += uLight * smoothstep(0.35, 0.0, length((p - vec2(0.3, 0.72)) * vec2(1.0, 2.6))) * 0.12;

  // Hit flash, heal / ready glow, low-life heartbeat.
  col = mix(col, vec3(1.0, 0.85, 0.8), uFlash * 0.45);
  col += uBright * uGlow * 0.45 * (1.0 - r * 0.6);
  float beat = pow(max(0.0, sin(uTime * 5.5)), 6.0);
  col = mix(col, vec3(0.9, 0.05, 0.05), uLow * beat * rim * 0.75);

  gl_FragColor = vec4(col * alpha, alpha);
}
`,G=`
precision mediump float;
varying vec2 vUV;
uniform float uAspect;
uniform float uNotch;
${U}
${H}
void main() {
  vec2 uv = vUV;
  vec2 q = vec2(uv.x * uAspect, uv.y);
  float wave = sin(uv.y * 9.0 + uTime * 3.0) * 0.0025 * (1.0 + uSlosh * 6.0);
  float edge = uFill + wave;
  float liquid = smoothstep(edge + 0.002, edge - 0.002, uv.x) * step(0.0005, uFill);

  float n = fbm(q * vec2(1.4, 3.0) + vec2(-uTime * 0.35, uTime * 0.1));
  float n2 = fbm(q * vec2(2.6, 5.0) + vec2(uTime * 0.2, 0.0) + n * 1.5);
  vec3 liq = mix(uDeep, uBright, 0.35 + 0.65 * (1.0 - abs(uv.y - 0.42) * 1.6));
  liq = mix(liq, uLight, smoothstep(0.55, 0.9, n2) * 0.45);
  liq *= 0.75 + 0.5 * n;
  liq += uLight * exp(-abs(uv.x - edge) * uAspect * 40.0) * liquid * 0.9;

  vec3 empty = vec3(0.05, 0.035, 0.03) + uDeep * 0.15;
  vec3 col = mix(empty, liq, liquid);

  float trail = smoothstep(uTrail + 0.002, uTrail - 0.002, uv.x) * (1.0 - liquid);
  col = mix(col, vec3(1.0, 0.9, 0.78), trail * 0.65);

  if (uShield > 0.0005) {
    float shield = smoothstep(uShield + 0.002, uShield - 0.002, uv.x);
    vec3 ice = vec3(0.42, 0.78, 1.0);
    float fr = frost(q * vec2(0.6, 1.4) + vec2(uTime * 0.03, 0.0));
    vec3 iced = mix(col, ice * 0.75, 0.55) + ice * fr * 0.6;
    col = mix(col, iced, shield);
  }

  // Phase notches every quarter for bosses.
  float notch = 0.0;
  for (int i = 1; i < 4; i++) {
    notch += exp(-abs(uv.x - float(i) * 0.25) * uAspect * 120.0);
  }
  col = mix(col, vec3(0.0), notch * uNotch * 0.8);

  // Glass tube: dark lower lip, bright upper reflection.
  col *= 0.55 + 0.6 * smoothstep(1.0, 0.35, uv.y);
  col += vec3(1.0) * smoothstep(0.32, 0.12, abs(uv.y - 0.2)) * 0.14;
  col = mix(col, vec3(1.0, 0.85, 0.75), uFlash * 0.4);
  col = mix(col, vec3(dot(col, vec3(0.3, 0.55, 0.15))) * 0.8, uStun * 0.6);
  gl_FragColor = vec4(col, 1.0);
}
`,de=`/Emberheir/assets/hud-enemy-plate-Bv4CT3zO.webp`,K=`/Emberheir/assets/hud-orb-ring-1uKXiEiW.webp`,q={x:270,y:256,r:150},J={side:112,top:32,bottom:32},fe=null;function pe(){return fe??=Promise.all([K,de].map(e=>w.load(e))).then(([e,t])=>e&&t?{ring:e,plate:t}:null,()=>null),fe}function me(e,t){let n=new E(e.ring),r=(t+3)/q.r;return n.scale.set(r),n.position.set(-q.x*r,-q.y*r),n}function he(e,t,n,r,i){let a=e.plate.height-J.top-J.bottom,o=(i-2)/a,s=new C({texture:e.plate,leftWidth:J.side,rightWidth:J.side,topHeight:J.top,bottomHeight:J.bottom});return s.width=r/o+J.side*2-40,s.height=e.plate.height,s.scale.set(o),s.position.set(t-(J.side-20)*o,n+1-J.top*o),s}var Y=e=>[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255],ge={deep:Y(3015173),bright:Y(13637150),light:Y(16743012)},_e={deep:Y(4853763),bright:Y(16738834),light:Y(16766842)},ve={deep:Y(2753286),bright:Y(12063770),light:Y(16747098)},X=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r)),Z=class{renderer;view;mesh;target;u;fill=1;shield=0;threshold=-1;ready=0;low=0;stun=0;shown={fill:1,trail:1,shield:0,low:0,stun:0,ready:0};trailHold=0;slosh=0;flash=0;glow=0;constructor(e,t,n,r,i,a=!1){this.renderer=e;let o=new x({positions:new Float32Array([0,0,n,0,n,r,0,r]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])});this.u=new g({uTime:{value:0,type:`f32`},uFill:{value:1,type:`f32`},uTrail:{value:1,type:`f32`},uShield:{value:0,type:`f32`},uSlosh:{value:0,type:`f32`},uFlash:{value:0,type:`f32`},uGlow:{value:0,type:`f32`},uLow:{value:0,type:`f32`},uThreshold:{value:-1,type:`f32`},uReady:{value:0,type:`f32`},uStun:{value:0,type:`f32`},uDeep:{value:new Float32Array(i.deep),type:`vec3<f32>`},uBright:{value:new Float32Array(i.bright),type:`vec3<f32>`},uLight:{value:new Float32Array(i.light),type:`vec3<f32>`},uAspect:{value:n/r,type:`f32`},uNotch:{value:+!!a,type:`f32`}});let s=b.from({gl:{vertex:V,fragment:t===`orb`?W:G},resources:{gauge:this.u}});this.mesh=new v({geometry:o,shader:s}),this.target=_.create({width:n,height:r,resolution:Math.min(1.5,e.resolution),antialias:!1}),this.view=new E(this.target)}set(e,t){let n=Math.max(0,Math.min(1,e));if(n<this.fill-.004){let e=this.fill-n;this.slosh=Math.min(1,this.slosh+e*6),this.flash=Math.min(1,this.flash+.25+e*3),this.trailHold=.45}else n>this.fill+.004&&(this.glow=Math.min(1,this.glow+.6),this.slosh=Math.min(1,this.slosh+.2));this.fill=n,this.shield=Math.max(0,Math.min(1,t))}snap(){this.shown.fill=this.fill,this.shown.trail=this.fill,this.shown.shield=this.shield}update(e,t){let n=this.shown;n.fill=X(n.fill,this.fill,14,t),this.trailHold>0?this.trailHold-=t:n.trail=X(n.trail,n.fill,3.2,t),n.trail<n.fill&&(n.trail=n.fill),n.shield=X(n.shield,this.shield,8,t),n.low=X(n.low,this.low,4,t),n.stun=X(n.stun,this.stun,10,t),n.ready=X(n.ready,this.ready,10,t),this.slosh=Math.max(0,this.slosh-t*.9),this.flash=Math.max(0,this.flash-t*3.5),this.glow=Math.max(0,this.glow-t*1.6);let r=this.u.uniforms;r.uTime=e,r.uFill=n.fill,r.uTrail=n.trail,r.uShield=n.shield,r.uSlosh=this.slosh,r.uFlash=this.flash,r.uGlow=this.glow,r.uLow=n.low,r.uThreshold=this.threshold,r.uReady=n.ready,r.uStun=n.stun,this.renderer.render({container:this.mesh,target:this.target,clear:!0})}destroy(){this.mesh.destroy(),this.target.destroy(!0)}get level(){return this.shown.fill}},ye=class{kind;root=new D;gauge;fx;glow=new T;frame;spawn=0;constructor(e,t){this.kind=t;let n=t===`life`?ge:_e,r=t===`life`?16726586:16753978,i=new T().circle(0,6,106).fill({color:0,alpha:.7});i.filters=[new y({strength:14,quality:3})],this.glow.circle(0,0,84*1.55).fill(new S({type:`radial`,center:{x:.5,y:.5},innerRadius:0,outerCenter:{x:.5,y:.5},outerRadius:.5,colorStops:[{offset:.45,color:`rgba(${n.bright.map(e=>Math.round(e*255)).join(`,`)},0.55)`},{offset:1,color:`rgba(0,0,0,0)`}],textureSpace:`local`})),this.glow.blendMode=`add`,this.glow.alpha=0,this.gauge=new Z(e.renderer,`orb`,168,168,n),this.gauge.view.position.set(-84,-84),this.fx=new f(e.renderer);let a=new D,o=new T().circle(0,0,82).fill(16777215);a.addChild(this.fx.back,this.fx.front,o),a.mask=o,this.frame=be(84,r);let s={resolution:e.renderer.resolution,antialias:!0};i.cacheAsTexture(s),this.frame.cacheAsTexture(s),this.root.addChild(i,this.glow,this.gauge.view,a,this.frame)}paint(e){this.frame.visible=!1,this.root.addChild(me(e,84))}update(e,t,n){this.gauge.update(e,t),this.glow.alpha=X(this.glow.alpha,n,3,t);let r=this.gauge.level,i=84-168*r;for(this.spawn+=t*(this.kind===`heat`?6+26*r:3+7*r);this.spawn>=1&&r>.02;){--this.spawn;let e=this.fx.rand,t=e.range(Math.max(i+6,-76),74),n=Math.sqrt(Math.max(0,7056-t*t))-8;this.fx.burst(this.kind===`heat`?{x:e.range(-n,n),y:t,count:1,color:[16765562,16747050,16758858],angle:[-Math.PI/2-.35,-Math.PI/2+.35],speed:[25,70],life:[.5,1.2],size:[5,11],wobble:6}:{x:e.range(-n,n),y:t,count:1,color:[16751242,16762040],angle:[-Math.PI/2-.1,-Math.PI/2+.1],speed:[14,34],life:[.8,1.6],size:[4,8],endSize:.9,alpha:.45,wobble:4})}this.fx.update(t)}puff(e,t,n=!0){let r=84-168*this.gauge.level;this.fx.burst({x:0,y:Math.max(-64,r),count:t,color:e,spreadX:50.4,spreadY:10,angle:n?[-Math.PI/2-.8,-Math.PI/2+.8]:[0,Math.PI*2],speed:[40,140],life:[.35,.8],size:[6,14],drag:.3})}};function be(e,t){let n=new D,r=new S({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`#f0c77a`},{offset:.35,color:`#a8732e`},{offset:.7,color:`#5e3a16`},{offset:1,color:`#2a180a`}],textureSpace:`local`}),i=new T().circle(0,0,e+15).fill(r).circle(0,0,e).cut().circle(0,0,e+15).stroke({color:1313798,width:3}).circle(0,0,e+1).stroke({color:1313798,width:3}).circle(0,0,e+8).stroke({color:16769960,width:1.2,alpha:.35});for(let t=0;t<12;t++){let n=t/12*Math.PI*2+Math.PI/12,r=Math.cos(n)*(e+8),a=Math.sin(n)*(e+8);i.circle(r,a,3.2).fill(2758666).circle(r-.8,a-.8,1.6).fill(16769184)}let a=-e-12;i.poly([-34,a+8,-20,a-14,-8,a+2,0,a-24,8,a+2,20,a-14,34,a+8]).fill(r).stroke({color:1313798,width:2.5}),i.circle(0,a-2,10).fill(1313798),i.circle(0,a-2,7.5).fill(t),i.circle(-2.5,a-4.5,2.5).fill({color:16777215,alpha:.75});let o=new T().circle(0,a-2,16).fill({color:t,alpha:.35});return o.blendMode=`add`,n.addChild(i,o),n}var xe=class{app=null;destroyed=!1;layoutInfo=j(1600,900);root=new D;bar=new D;enemyPlate=new D;life=null;heat=null;enemy=null;art=null;time=0;hot=0;last=null;prevHero=null;unwatchTheme=null;paused=!1;layout(e,t){this.layoutInfo=j(e,t),this.app&&this.place()}attach(e,t,n){this.destroyed||(this.app=e,this.life=new ye(e,`life`),this.heat=new ye(e,`heat`),this.enemy=new Z(e.renderer,`bar`,N.w,N.h,ve,n),this.root.addChild(this.enemyPlate,this.bar,this.life.root,this.heat.root),t.addChild(this.root),this.place(),this.last&&this.onSnapshot(this.last,!0),e.ticker.add(this.onTick),this.unwatchTheme=L(()=>{this.app&&!this.destroyed&&this.place()}),pe().then(e=>{!this.destroyed&&e&&(this.art=e,this.life?.paint(e),this.heat?.paint(e),this.place())}))}destroy(){this.destroyed=!0,this.app?.ticker?.remove(this.onTick),this.unwatchTheme?.(),this.life?.fx.destroy(),this.heat?.fx.destroy(),this.life?.gauge.destroy(),this.heat?.gauge.destroy(),this.enemy?.destroy(),this.root.destroy({children:!0}),this.app=null}onTick=e=>this.tick(e.deltaMS/1e3);place(){let e=this.layoutInfo,{w:t,h:n,cx:r}=e;this.life?.root.position.set(e.lifeOrb.x,e.lifeOrb.y),this.heat?.root.position.set(e.heatOrb.x,e.heatOrb.y);let i=z(`--hud-bar-top`,`#32271d`),a=z(`--hud-bar-bottom`,`#0c0a08`),o=z(`--hud-fade`,`rgba(0,0,0,0.55)`),s=z(`--hud-glass`,`#0e0b09`),c=R(`--hud-glass-alpha`,.72),l=z(`--edge`,`#6a4a2c`);this.bar.removeChildren().forEach(e=>e.destroy());let u=n-104,d=e.lifeOrb.x,f=e.heatOrb.x,p=new T().rect(0,u-70,t,70).fill(new S({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`rgba(0,0,0,0)`},{offset:1,color:o}],textureSpace:`local`})),m=new S({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:i},{offset:1,color:a}],textureSpace:`local`}),h=new T,g=e.plateHalf;h.poly([d,u,r-g-40,u,r-g,u-22,r+g,u-22,r+g+40,u,f,u,f,n,d,n]).fill(m).stroke({color:l,width:4,alignment:1}),h.poly([d,u+3,r-g-39,u+3,r-g+1,u-22+3,r+g-1,u-22+3,r+g+39,u+3,f,u+3],!1).stroke({color:14263642,width:1.5,alpha:.55});for(let e=d+120;e<f-110;e+=90)e>r-g-50&&e<r+g+50||h.circle(e,u+12,3).fill(1708554).circle(e-.7,u+11.3,1.4).fill(14263642);this.bar.addChild(p,h);let _={resolution:this.app?.renderer.resolution??1,antialias:!0};this.bar.cacheAsTexture(_),this.bar.updateCacheTexture(),this.enemyPlate.removeChildren().forEach(e=>e!==this.enemy?.view&&e.destroy());let v=r-320,y=new T().roundRect(v,70,640,124,10).fill({color:s,alpha:c}).stroke({color:l,width:2}).roundRect(v+4,74,632,116,7).stroke({color:14263642,width:1,alpha:.3}),b=e.enemyLife,x=this.art?he(this.art,b.x,b.y,b.w,b.h):new T().roundRect(b.x-4,b.y-4,b.w+8,b.h+8,6).fill(1313798).stroke({color:12159562,width:2});this.enemyPlate.addChild(y,x),this.enemy&&(this.enemy.view.position.set(b.x,b.y),this.enemyPlate.addChild(this.enemy.view))}onSnapshot(e,t=!1){if(this.last=e,!this.life||!this.heat||!this.enemy)return;let n=e.hero,r=this.prevHero;this.life.gauge.set(n.life/n.maxLife,n.barrier/n.maxLife),this.life.gauge.low=+(n.life/n.maxLife<.3&&!e.over),this.heat.gauge.set(n.heat/n.maxHeat,0);let i=n.rotation[n.nextSlot];this.heat.gauge.threshold=i?i.threshold/n.maxHeat:-1;let a=i!==void 0&&n.heat>=i.threshold;this.heat.gauge.ready=+!!a,this.hot=.25+.5*(n.heat/n.maxHeat)+(a?.35:0),r&&!t&&this.effects(r,n),this.prevHero=n;let o=e.enemy;this.enemy.set(o.life/o.maxLife,o.barrier/o.maxLife),this.enemy.stun=+(o.stunned>0),t&&(this.life.gauge.snap(),this.heat.gauge.snap(),this.enemy.snap())}effects(e,t){this.life&&this.heat&&(t.life>e.life+.5&&this.life.puff([5234826,11075528],16),t.barrier>e.barrier+t.maxLife*.02&&this.life.puff([10477823,16777215],20,!1),t.heat<e.heat-8&&this.heat.puff([16765562,16747050,16777215],26))}tick(e){this.paused&&(e=0),this.time+=e,this.life?.update(this.time,e,.25),this.heat?.update(this.time,e,this.hot),this.enemy?.update(this.time,e)}},Q=l(),Se=M(`dev`),Ce=[1,4,16],we=30,Te={cooling:`Cooling Heat`,steady:`Steady Heat`,warming:`Warming Heat`,smoldering:`Smoldering Heat`},Ee=[`#5a1d08`,`#080404`];function $(e){let t=F.find(t=>t.id===(e.encounter?.echo??e.actId))?.arenaGradient??(m(A,e.actId)?Ee:void 0);return t?{background:`linear-gradient(180deg, ${t[0]} 0%, ${t[1]} 100%)`}:void 0}function De(e,s){let c=s.encounter,l=o(A,s.actId),u=c?i(c,l,A):void 0,d=c?.echo?o(A,c.echo):void 0,f=P(e.hero.classId,e.hero.weaponId,e.hero.equipment,I(e)),p=t(e,A).weapon,h=c?r(c,A).map(({name:e,description:t})=>({name:e,description:t})):[],g={...u?{id:u.id}:{},archetype:u?.archetype??`brute`,boss:c?.boss??!1,elite:h.length>0,act:(d??l).number,ranged:u?.weapon.range===`ranged`,...c?.thief?{thief:!0}:{},...c?.gate?{gate:!0}:{},...c?.champion?{champion:!0}:{},...s.wildfire?{wildfire:s.wildfire}:{},...c?{levelGap:c.level-e.hero.level}:{}},_={name:a(e,A),sub:`${n(e,A)} · ${Te[p.heatBehavior]}`,icon:`user`},v=u?.name??`Enemy`;return{act:l,heroLook:f,enemyLook:g,heroInfo:_,enemyInfo:{name:d?`Echo of ${u?.name??``}`:v,sub:`${d?`Warden Echo`:m(A,l.id)?`Last Flame`:c?.boss?`Act Boss`:k[O(u?.archetype)]} · ${u?.description??``}`,typeIcon:d?`echo`:O(u?.archetype),...c?.boss?{tag:`BOSS`}:c?.gate?{tag:`GATEKEEPER`}:c?.champion?{tag:`CHAMPION`}:h.length?{tag:`ELITE`}:{},mods:h},enemyAttackIcon:g.ranged?u?.archetype===`caster`?`bolt`:`bow`:`strike`}}function Oe(e){let[t,n]=(0,B.useState)(``);return(0,B.useEffect)(()=>{let t=0,r=performance.now(),i=0,a=()=>{t+=1,i=requestAnimationFrame(a)};i=requestAnimationFrame(a);let o=window.setInterval(()=>{let i=performance.now(),a=t*1e3/(i-r);t=0,r=i;let o=e.scene.current?.stats;n(`${a.toFixed(0)} FPS · ${o?.particles??0} particles · ${o?.floaters??0} texts`)},500);return()=>{cancelAnimationFrame(i),window.clearInterval(o)}},[e.scene]),(0,Q.jsx)(`span`,{className:`dev-meter mono`,"data-testid":`dev-meter`,children:t})}var ke=()=>window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0;function Ae(t){let{state:n,run:r,game:i,settings:a}=t,o=De(n,r),[c]=(0,B.useState)(()=>h(n,A)),[l,f]=(0,B.useState)(()=>c.snapshot()),[g,_]=(0,B.useState)(null),[v,y]=(0,B.useState)(1),[b,x]=(0,B.useState)(()=>new Set),S=(0,B.useRef)(null),C=s(),w=C.w,T=C.h,E=le(C.scale,ce[a.graphicsQuality].maxResolution),D=(0,B.useRef)(null),O=(0,B.useRef)(null),k=(0,B.useRef)(t.paused),j=(0,B.useRef)(v);(0,B.useEffect)(()=>{k.current=t.paused,S.current&&(S.current.paused=t.paused),O.current&&(O.current.paused=t.paused)},[t.paused]),(0,B.useEffect)(()=>{j.current=v,S.current&&(S.current.speed=v)},[v]),(0,B.useEffect)(()=>{let e=D.current;if(!e)return;let t=new ue;t.sound=!0,t.showNumbers=a.damageNumbers,t.motion=a.screenShake&&!ke(),t.quality=a.graphicsQuality,t.layout(w,T,E,1,104),S.current=t;let n=new xe;return n.layout(w,T),n.onSnapshot(c.snapshot(),!0),O.current=n,t.mount(e,o.heroLook,o.enemyLook).then(e=>{e&&n.attach(e,t.overlay,r.encounter?.boss===!0)}),()=>{n.destroy(),t.destroy(),S.current=null,O.current=null}},[]),(0,B.useEffect)(()=>{S.current?.layout(w,T,E,1,104)},[w,T,E]),(0,B.useEffect)(()=>{O.current?.layout(C.w,C.h)},[C.w,C.h]);let M=r.encounter?.boss===!0,N=(0,B.useRef)(1);(0,B.useEffect)(()=>{let e=0,t=performance.now(),n=-1/0,r=n=>{let a=Math.min(.25,(n-t)/1e3)*j.current*N.current;t=n,!k.current&&!S.current?.frozen&&i(c.advance(a),n),c.over||(e=requestAnimationFrame(r))},i=(e,t)=>{let r=c.snapshot();S.current?.onEvents(e),S.current?.onSnapshot(r),O.current?.onSnapshot(r);let i=[...e].reverse().find(e=>e.type===`skill`&&e.side===`hero`);if(i?.type===`skill`){let e=i.via===`reaction`,t=(e?r.hero.reactions:r.hero.rotation).findIndex(e=>e.name===i.skill),n=e?10+t:t;t>=0&&_(e=>({slot:n,n:(e?.n??0)+1}))}let a=e.flatMap(e=>e.type===`trigger`&&e.side===`hero`?[e.name]:[]);a.length&&x(new Set(a)),M&&(N.current=r.enemy.life/r.enemy.maxLife<.08?.35:1),(r.over||t-n>=1e3/we-1)&&(n=t,f(r))};return e=requestAnimationFrame(r),()=>cancelAnimationFrame(e)},[c,M]),(0,B.useEffect)(()=>{if(!b.size)return;let e=window.setTimeout(()=>x(new Set),450);return()=>window.clearTimeout(e)},[b]);let P=r.encounter,F=!!P&&!P.echo&&!m(A,r.actId),I=l.over&&l.winner===`hero`,L=F&&P?te(n,P.enemyId):void 0,R=L&&P&&I?te(n,P.enemyId,u({elite:P.eliteModifiers.length>0&&!P.boss,champion:P.champion===!0,boss:P.boss},P.hunt===!0)):L,z=L&&R&&R.tier>L.tier?R.tier:0,V=l.over;(0,B.useEffect)(()=>{if(!V)return;let e=window.setTimeout(()=>i.dispatch({type:`resolveFight`}),M&&l.winner===`hero`?2400:1600);return()=>window.clearTimeout(e)},[V,i,M,l.winner]);let H=()=>{S.current?.onEvents(c.finish()),O.current?.onSnapshot(c.snapshot(),!0),f(c.snapshot())},U=l.hero,W=l.enemy,G=V?l.winner===`hero`?`VICTORY`:l.winner===`enemy`?`DEFEAT`:l.fled===`enemy`?`ESCAPED`:`DRAW`:null,de=r.encounter?.thief?Math.max(0,Math.ceil(p.thiefFleeSeconds-l.time)):null,K=e(n,A),q=Math.max(d(n,A)-+!!K,n.flaskCharges);return(0,Q.jsxs)(`section`,{className:`screen battle`,"aria-label":`Battle`,style:$(r),children:[(0,Q.jsx)(`div`,{className:`arena-host`,ref:D}),(0,Q.jsx)(ne,{act:o.act,stage:r.stage,cleared:!1,attributePoints:n.hero.unspentAttributePoints,skillPoints:n.hero.unspentSkillPoints,waymarks:n.progress.waymarks,prestige:n.legacy.prestige,...r.wildfire?{wildfire:r.wildfire}:{},onCharacter:t.onCharacter,onTree:t.onTree,onMenu:t.onMenu}),(0,Q.jsx)(re,{enemy:W,name:o.enemyInfo.name,sub:o.enemyInfo.sub,typeIcon:o.enemyInfo.typeIcon??`brute`,...o.enemyInfo.tag?{tag:o.enemyInfo.tag}:{},mods:o.enemyInfo.mods??[],attackIcon:o.enemyAttackIcon,thiefLeft:V?null:de,heroLevel:n.hero.level,...R?{hunt:R}:{}}),G&&(0,Q.jsxs)(`div`,{className:`fight-banner ${G.toLowerCase()}${M&&l.winner===`hero`?` boss-kill`:``}`,"data-testid":`fight-result`,children:[G,z>0&&(0,Q.jsx)(`span`,{className:`trail-banner title-font`,"data-testid":`trail-banner`,children:se(z)})]}),t.paused&&!G&&(0,Q.jsx)(`div`,{className:`paused-tag`,"aria-live":`polite`,children:`Fight paused`}),Se&&!G&&(0,Q.jsxs)(`div`,{className:`dev-tools`,children:[(0,Q.jsx)(Oe,{scene:S}),Ce.map(e=>(0,Q.jsxs)(`button`,{type:`button`,className:v===e?`active`:``,onClick:()=>y(e),children:[e,`×`]},e)),(0,Q.jsx)(`button`,{type:`button`,onClick:H,children:`Skip fight`})]}),(0,Q.jsx)(ie,{hero:U,heroTitle:o.heroInfo.name,weaponIcon:ae[o.heroLook.weapon]??`strike`,weaponId:o.heroLook.weapon,flaskCharges:n.flaskCharges,flaskMax:q,draught:K,flash:g,stageW:C.w,stageH:C.h,boons:(0,Q.jsx)(oe,{state:n,flash:b,className:`battle-boons`}),right:(0,Q.jsxs)(`button`,{type:`button`,className:`btn hud-retreat`,disabled:V,"aria-label":`Retreat to Camp`,title:`Retreat to Camp`,onClick:()=>i.dispatch({type:`retreat`}),children:[(0,Q.jsx)(ee,{name:`retreat`,size:18}),`Retreat`]})})]})}export{Ae as BattleView,Se as DEV_MODE,$ as arenaStyle};