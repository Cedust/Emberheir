import{F as e,M as t,N as n,T as r,Xn as i,g as a,ir as o,j as s,n as c,r as l,tt as u,v as d,y as f,yn as p}from"./Stage-Bbn1Hjxa.js";import{T as m,i as h}from"./src-DeN8BFnO.js";import{c as g,g as _,h as v,i as y,l as ee,n as b,o as x,s as S}from"./index-IfIQOC--.js";import{a as C,c as w,d as T,f as E,l as D,m as O,o as k,p as A,r as j,s as M}from"./pixi-hz5uMv2X.js";import{i as N,n as te}from"./pixiPacing-0TWD5jI1.js";import{t as ne}from"./ArenaScene-SZG2O-56.js";var P=o(),F=`
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
`,I=`
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
`,L=`
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
`,R=`
precision mediump float;
varying vec2 vUV;
${L}
${I}
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
`,z=`
precision mediump float;
varying vec2 vUV;
uniform float uAspect;
uniform float uNotch;
${L}
${I}
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
`,B={x:20,y:40,w:600,h:24};function V(e,t){let n=e/2,r=Math.min(700,e/2-84-22),i=t-100,a=n-320;return{w:e,h:t,cx:n,orbDx:r,lifeOrb:{x:n-r,y:i},heatOrb:{x:n+r,y:i},enemyLife:{x:a+B.x,y:70+B.y,w:B.w,h:B.h}}}var H=e=>[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255],re={deep:H(3015173),bright:H(13637150),light:H(16743012)},ie={deep:H(4853763),bright:H(16738834),light:H(16766842)},ae={deep:H(2753286),bright:H(12063770),light:H(16747098)},U=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r)),W=class{renderer;view;mesh;target;u;fill=1;shield=0;threshold=-1;ready=0;low=0;stun=0;shown={fill:1,trail:1,shield:0,low:0,stun:0,ready:0};trailHold=0;slosh=0;flash=0;glow=0;constructor(e,t,n,r,i,a=!1){this.renderer=e;let o=new k({positions:new Float32Array([0,0,n,0,n,r,0,r]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])});this.u=new E({uTime:{value:0,type:`f32`},uFill:{value:1,type:`f32`},uTrail:{value:1,type:`f32`},uShield:{value:0,type:`f32`},uSlosh:{value:0,type:`f32`},uFlash:{value:0,type:`f32`},uGlow:{value:0,type:`f32`},uLow:{value:0,type:`f32`},uThreshold:{value:-1,type:`f32`},uReady:{value:0,type:`f32`},uStun:{value:0,type:`f32`},uDeep:{value:new Float32Array(i.deep),type:`vec3<f32>`},uBright:{value:new Float32Array(i.bright),type:`vec3<f32>`},uLight:{value:new Float32Array(i.light),type:`vec3<f32>`},uAspect:{value:n/r,type:`f32`},uNotch:{value:+!!a,type:`f32`}});let s=T.from({gl:{vertex:F,fragment:t===`orb`?R:z},resources:{gauge:this.u}});this.mesh=new C({geometry:o,shader:s}),this.target=j.create({width:n,height:r,resolution:Math.min(1.5,e.resolution),antialias:!1}),this.view=new A(this.target)}set(e,t){let n=Math.max(0,Math.min(1,e));if(n<this.fill-.004){let e=this.fill-n;this.slosh=Math.min(1,this.slosh+e*6),this.flash=Math.min(1,this.flash+.25+e*3),this.trailHold=.45}else n>this.fill+.004&&(this.glow=Math.min(1,this.glow+.6),this.slosh=Math.min(1,this.slosh+.2));this.fill=n,this.shield=Math.max(0,Math.min(1,t))}snap(){this.shown.fill=this.fill,this.shown.trail=this.fill,this.shown.shield=this.shield}update(e,t){let n=this.shown;n.fill=U(n.fill,this.fill,14,t),this.trailHold>0?this.trailHold-=t:n.trail=U(n.trail,n.fill,3.2,t),n.trail<n.fill&&(n.trail=n.fill),n.shield=U(n.shield,this.shield,8,t),n.low=U(n.low,this.low,4,t),n.stun=U(n.stun,this.stun,10,t),n.ready=U(n.ready,this.ready,10,t),this.slosh=Math.max(0,this.slosh-t*.9),this.flash=Math.max(0,this.flash-t*3.5),this.glow=Math.max(0,this.glow-t*1.6);let r=this.u.uniforms;r.uTime=e,r.uFill=n.fill,r.uTrail=n.trail,r.uShield=n.shield,r.uSlosh=this.slosh,r.uFlash=this.flash,r.uGlow=this.glow,r.uLow=n.low,r.uThreshold=this.threshold,r.uReady=n.ready,r.uStun=n.stun,this.renderer.render({container:this.mesh,target:this.target,clear:!0})}destroy(){this.mesh.destroy(),this.target.destroy(!0)}get level(){return this.shown.fill}},G=class{kind;root=new O;gauge;fx;glow=new M;spawn=0;constructor(e,t){this.kind=t;let n=t===`life`?re:ie,r=t===`life`?16726586:16753978,i=new M().circle(0,6,106).fill({color:0,alpha:.7});i.filters=[new w({strength:14,quality:3})],this.glow.circle(0,0,84*1.55).fill(new D({type:`radial`,center:{x:.5,y:.5},innerRadius:0,outerCenter:{x:.5,y:.5},outerRadius:.5,colorStops:[{offset:.45,color:`rgba(${n.bright.map(e=>Math.round(e*255)).join(`,`)},0.55)`},{offset:1,color:`rgba(0,0,0,0)`}],textureSpace:`local`})),this.glow.blendMode=`add`,this.glow.alpha=0,this.gauge=new W(e.renderer,`orb`,168,168,n),this.gauge.view.position.set(-84,-84),this.fx=new N(e.renderer);let a=new O,o=new M().circle(0,0,82).fill(16777215);a.addChild(this.fx.back,this.fx.front,o),a.mask=o;let s=oe(84,r),c={resolution:e.renderer.resolution,antialias:!0};i.cacheAsTexture(c),s.cacheAsTexture(c),this.root.addChild(i,this.glow,this.gauge.view,a,s)}update(e,t,n){this.gauge.update(e,t),this.glow.alpha=U(this.glow.alpha,n,3,t);let r=this.gauge.level,i=84-168*r;for(this.spawn+=t*(this.kind===`heat`?6+26*r:3+7*r);this.spawn>=1&&r>.02;){--this.spawn;let e=this.fx.rand,t=e.range(Math.max(i+6,-76),74),n=Math.sqrt(Math.max(0,7056-t*t))-8;this.fx.burst(this.kind===`heat`?{x:e.range(-n,n),y:t,count:1,color:[16765562,16747050,16758858],angle:[-Math.PI/2-.35,-Math.PI/2+.35],speed:[25,70],life:[.5,1.2],size:[5,11],wobble:6}:{x:e.range(-n,n),y:t,count:1,color:[16751242,16762040],angle:[-Math.PI/2-.1,-Math.PI/2+.1],speed:[14,34],life:[.8,1.6],size:[4,8],endSize:.9,alpha:.45,wobble:4})}this.fx.update(t)}puff(e,t,n=!0){let r=84-168*this.gauge.level;this.fx.burst({x:0,y:Math.max(-64,r),count:t,color:e,spreadX:50.4,spreadY:10,angle:n?[-Math.PI/2-.8,-Math.PI/2+.8]:[0,Math.PI*2],speed:[40,140],life:[.35,.8],size:[6,14],drag:.3})}};function oe(e,t){let n=new O,r=new D({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`#f0c77a`},{offset:.35,color:`#a8732e`},{offset:.7,color:`#5e3a16`},{offset:1,color:`#2a180a`}],textureSpace:`local`}),i=new M().circle(0,0,e+15).fill(r).circle(0,0,e).cut().circle(0,0,e+15).stroke({color:1313798,width:3}).circle(0,0,e+1).stroke({color:1313798,width:3}).circle(0,0,e+8).stroke({color:16769960,width:1.2,alpha:.35});for(let t=0;t<12;t++){let n=t/12*Math.PI*2+Math.PI/12,r=Math.cos(n)*(e+8),a=Math.sin(n)*(e+8);i.circle(r,a,3.2).fill(2758666).circle(r-.8,a-.8,1.6).fill(16769184)}let a=-e-12;i.poly([-34,a+8,-20,a-14,-8,a+2,0,a-24,8,a+2,20,a-14,34,a+8]).fill(r).stroke({color:1313798,width:2.5}),i.circle(0,a-2,10).fill(1313798),i.circle(0,a-2,7.5).fill(t),i.circle(-2.5,a-4.5,2.5).fill({color:16777215,alpha:.75});let o=new M().circle(0,a-2,16).fill({color:t,alpha:.35});return o.blendMode=`add`,n.addChild(i,o),n}function K(e,t){return getComputedStyle(document.documentElement).getPropertyValue(e).trim()||t}var se=class{app=null;destroyed=!1;layoutInfo=V(1600,900);root=new O;bar=new O;enemyPlate=new O;life=null;heat=null;enemy=null;time=0;hot=0;last=null;prevHero=null;paused=!1;layout(e,t){this.layoutInfo=V(e,t),this.app&&this.place()}attach(e,t,n){this.destroyed||(this.app=e,this.life=new G(e,`life`),this.heat=new G(e,`heat`),this.enemy=new W(e.renderer,`bar`,600,24,ae,n),this.root.addChild(this.enemyPlate,this.bar,this.life.root,this.heat.root),t.addChild(this.root),this.place(),this.last&&this.onSnapshot(this.last,!0),e.ticker.add(this.onTick))}destroy(){this.destroyed=!0,this.app?.ticker?.remove(this.onTick),this.life?.fx.destroy(),this.heat?.fx.destroy(),this.life?.gauge.destroy(),this.heat?.gauge.destroy(),this.enemy?.destroy(),this.root.destroy({children:!0}),this.app=null}onTick=e=>this.tick(e.deltaMS/1e3);place(){let e=this.layoutInfo,{w:t,h:n,cx:r}=e;this.life?.root.position.set(e.lifeOrb.x,e.lifeOrb.y),this.heat?.root.position.set(e.heatOrb.x,e.heatOrb.y);let i=K(`--slot-bg`,`#32271d`),a=K(`--edge`,`#6a4a2c`);this.bar.removeChildren().forEach(e=>e.destroy());let o=n-104,s=e.lifeOrb.x,c=e.heatOrb.x,l=new M().rect(0,o-70,t,70).fill(new D({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`rgba(0,0,0,0)`},{offset:1,color:`rgba(0,0,0,0.55)`}],textureSpace:`local`})),u=new D({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:i},{offset:1,color:`#0c0a08`}],textureSpace:`local`}),d=new M,f=Math.min(400,(c-s)/2-150);d.poly([s,o,r-f-40,o,r-f,o-22,r+f,o-22,r+f+40,o,c,o,c,n,s,n]).fill(u).stroke({color:a,width:4,alignment:1}),d.poly([s,o+3,r-f-39,o+3,r-f+1,o-22+3,r+f-1,o-22+3,r+f+39,o+3,c,o+3],!1).stroke({color:14263642,width:1.5,alpha:.55});for(let e=s+120;e<c-110;e+=90)e>r-f-50&&e<r+f+50||d.circle(e,o+12,3).fill(1708554).circle(e-.7,o+11.3,1.4).fill(14263642);this.bar.addChild(l,d);let p={resolution:this.app?.renderer.resolution??1,antialias:!0};this.bar.cacheAsTexture(p),this.bar.updateCacheTexture(),this.enemyPlate.removeChildren().forEach(e=>e.destroy());let m=r-320,h=new M().roundRect(m,70,640,124,10).fill({color:920329,alpha:.72}).stroke({color:a,width:2}).roundRect(m+4,74,632,116,7).stroke({color:14263642,width:1,alpha:.3}),g=e.enemyLife,_=new M().roundRect(g.x-4,g.y-4,g.w+8,g.h+8,6).fill(1313798).stroke({color:12159562,width:2});this.enemyPlate.addChild(h,_),this.enemy&&(this.enemy.view.position.set(g.x,g.y),this.enemyPlate.addChild(this.enemy.view))}onSnapshot(e,t=!1){if(this.last=e,!this.life||!this.heat||!this.enemy)return;let n=e.hero,r=this.prevHero;this.life.gauge.set(n.life/n.maxLife,n.barrier/n.maxLife),this.life.gauge.low=+(n.life/n.maxLife<.3&&!e.over),this.heat.gauge.set(n.heat/n.maxHeat,0);let i=n.rotation[n.nextSlot];this.heat.gauge.threshold=i?i.threshold/n.maxHeat:-1;let a=i!==void 0&&n.heat>=i.threshold;this.heat.gauge.ready=+!!a,this.hot=.25+.5*(n.heat/n.maxHeat)+(a?.35:0),r&&!t&&this.effects(r,n),this.prevHero=n;let o=e.enemy;this.enemy.set(o.life/o.maxLife,o.barrier/o.maxLife),this.enemy.stun=+(o.stunned>0),t&&(this.life.gauge.snap(),this.heat.gauge.snap(),this.enemy.snap())}effects(e,t){this.life&&this.heat&&(t.life>e.life+.5&&this.life.puff([5234826,11075528],16),t.barrier>e.barrier+.5&&this.life.puff([10477823,16777215],20,!1),t.heat<e.heat-8&&this.heat.puff([16765562,16747050,16777215],26))}tick(e){this.paused&&(e=0),this.time+=e,this.life?.update(this.time,e,.25),this.heat?.update(this.time,e,this.hot),this.enemy?.update(this.time,e)}},q=l(),J=4,ce={burn:`fire`,chill:`snow`,shock:`bolt`,bleed:`drop`,poison:`venom`,corruption:`void`},le={burn:`Burn`,chill:`Chill`,shock:`Shock`,bleed:`Bleed`,poison:`Poison`,corruption:`Corruption`};function ue(e){let t=e.toLowerCase();return t.includes(`bleed`)?`drop`:t.includes(`poison`)?`venom`:t.includes(`burn`)||t.includes(`fire`)?`fire`:t.includes(`chill`)||t.includes(`cold`)?`snow`:t.includes(`shock`)||t.includes(`lightning`)?`bolt`:t.includes(`armor`)||t.includes(`block`)||t.includes(`resist`)?`shield`:t.includes(`speed`)?`flurry`:t.includes(`crit`)?`execute`:t.includes(`heat`)?`flame`:t.includes(`evasion`)?`skirmisher`:`strike`}var de={sword:`sword`,wand:`wand`,axe:`axe`,dagger:`dagger`,bow:`bow`,crossbow:`crossbow`,mace:`hammer`,staff:`wand`};function fe(e){let t=[];e.stunned>0&&t.push({key:`stun`,icon:`stun`,name:`Stunned`,kind:`stun`,remaining:e.stunned});for(let n of e.ailments)t.push({key:n.type,icon:ce[n.type]??`warning`,name:le[n.type]??n.type,kind:`ailment-${n.type}`,...n.stacks&&n.stacks>1?{stacks:n.stacks}:{},remaining:n.remaining});for(let n of e.curses)t.push({key:`c-${n.name}`,icon:n.armor?`hammer`:`curse`,name:n.name,kind:`curse`,remaining:n.remaining});for(let n of e.buffs)t.push({key:`b-${n.name}`,icon:ue(n.stat),name:n.name,kind:`buff`,...n.stacks>1?{stacks:n.stacks}:{},remaining:n.remaining});return t}function Y(e){let t=fe(e.fighter);return(0,q.jsx)(`div`,{className:`hud-status ${e.className??``}`,style:e.style,children:t.map(e=>(0,q.jsxs)(`span`,{className:`hud-status-icon ${e.kind}${e.remaining<1.5?` fading`:``}`,title:e.name,children:[(0,q.jsx)(_,{name:e.icon,size:18,color:`#fff6e4`}),e.stacks&&(0,q.jsx)(`b`,{className:`mono`,children:e.stacks}),(0,q.jsx)(`i`,{className:`mono`,children:e.remaining<10?e.remaining.toFixed(1):Math.ceil(e.remaining)})]},e.key))})}function pe(e){return(0,q.jsxs)(`svg`,{className:`hud-flask ${e.full?`full`:``}`,viewBox:`0 0 32 44`,"aria-hidden":`true`,children:[(0,q.jsxs)(`defs`,{children:[(0,q.jsxs)(`radialGradient`,{id:`potion-liquid`,cx:`40%`,cy:`35%`,r:`70%`,children:[(0,q.jsx)(`stop`,{offset:`0`,stopColor:`#ff6a5a`}),(0,q.jsx)(`stop`,{offset:`0.55`,stopColor:`#c4161c`}),(0,q.jsx)(`stop`,{offset:`1`,stopColor:`#4a0308`})]}),(0,q.jsx)(`clipPath`,{id:`potion-bulb`,children:(0,q.jsx)(`circle`,{cx:`16`,cy:`29`,r:`12`})})]}),(0,q.jsx)(`rect`,{x:`11.5`,y:`2`,width:`9`,height:`6`,rx:`1.5`,fill:`#8a5a26`,stroke:`#2a180a`}),(0,q.jsx)(`path`,{d:`M12.5 8h7v7.4a12.5 12.5 0 1 1-7 0z`,fill:`rgb(20 12 8 / 0.65)`,stroke:`#d9a55a`,strokeWidth:`1.6`}),e.full&&(0,q.jsxs)(`g`,{clipPath:`url(#potion-bulb)`,children:[(0,q.jsx)(`rect`,{x:`2`,y:`21`,width:`28`,height:`22`,fill:`url(#potion-liquid)`}),(0,q.jsx)(`ellipse`,{cx:`16`,cy:`21`,rx:`12`,ry:`1.6`,fill:`#ff9a8a`,opacity:`0.8`})]}),(0,q.jsx)(`path`,{d:`M9 24a8 8 0 0 1 5-5`,stroke:`#fff`,strokeWidth:`1.6`,fill:`none`,opacity:`0.55`,strokeLinecap:`round`})]})}function X(e){let t=e.rotation[e.nextSlot];return t!==void 0&&e.heat>=t.threshold}function Z(e){let t=e.fighter,n=e.width,r=e=>Math.min(e,J)/J*n,i=Math.max(.05,t.attackRate||t.stats.attackSpeed),a=t.attackRate>0?t.attackProgress/t.attackRate:1,o=Math.max(0,1-a/.35),s=t.stunned>0?t.stunned:t.telegraph?.remaining??0,c=t.nextHeavy?t.nextHeavy.in:null,l=[];for(let e=1;l.length<12;e++){let n=s+(e-t.attackProgress)/i;if(c!==null&&n>c&&(n+=t.nextHeavy?.windup??0),n>J)break;l.push(n)}let u=X(t),d=t.rotation[t.nextSlot],f=u&&d?x(d.skillId):e.attackIcon;return(0,q.jsxs)(`div`,{className:`rhythm${t.stunned>0?` stunned`:``}${t.telegraph?` winding`:``}${e.enemy?` enemy`:``}`,style:{width:n},"aria-hidden":`true`,children:[(0,q.jsx)(`div`,{className:`rhythm-groove`}),t.stunned>0&&(0,q.jsx)(`div`,{className:`rhythm-hold stun`,style:{width:r(t.stunned)},children:(0,q.jsx)(_,{name:`stun`,size:12,color:`#e8e2d6`})}),t.telegraph&&(0,q.jsx)(`div`,{className:`rhythm-hold heavy`,style:{width:r(t.telegraph.remaining)},children:(0,q.jsx)(`span`,{children:t.telegraph.skill})}),c!==null&&t.nextHeavy&&c<J&&(0,q.jsx)(`div`,{className:`rhythm-heavy`,style:{left:r(c),width:Math.max(10,r(c+t.nextHeavy.windup)-r(c))},title:`Heavy Attack: ${t.nextHeavy.skill}`,children:(0,q.jsx)(_,{name:`warning`,size:12,color:`#ffd9bf`})}),c!==null&&t.nextHeavy&&c>=J&&(0,q.jsxs)(`div`,{className:`rhythm-heavy later`,title:`Heavy Attack: ${t.nextHeavy.skill}`,children:[(0,q.jsx)(_,{name:`warning`,size:11,color:`#ffd9bf`}),Math.ceil(c),`s`]}),l.map((e,t)=>(0,q.jsx)(`span`,{className:`rhythm-beat${t===0?` first`:``}${t===0&&u?` skill`:``}`,style:{left:r(e)},children:t===0&&(0,q.jsx)(_,{name:f,size:12,color:`#fff6e4`})},t)),(0,q.jsx)(`span`,{className:`rhythm-now`,style:{transform:`scaleY(${1+.7*o})`}})]})}function Q(e,t){if(t)return{"--swing":`${Math.round(e.attackProgress*360)}deg`}}function me(e){let{hero:t}=e,n=V(e.stageW,e.stageH),r=t.stunned>0,i=X(t),a=Math.round(t.life/t.maxLife*100),o=n.lifeOrb.x+84+30,s=e.stageW-(n.heatOrb.x-84-30),c=t.rotation[t.nextSlot];return(0,q.jsxs)(`div`,{className:`hud-hero`,style:{"--bar-h":`104px`},children:[(0,q.jsxs)(`div`,{className:`orb-readout life`,style:{left:n.lifeOrb.x-84,top:n.lifeOrb.y-84},role:`meter`,"aria-label":`Life`,"aria-valuemin":0,"aria-valuemax":t.maxLife,"aria-valuenow":Math.round(t.life),title:`${e.heroTitle} · Life ${a} %`,children:[(0,q.jsx)(`span`,{className:`orb-num title-font`,children:v(t.life)}),(0,q.jsxs)(`span`,{className:`orb-max mono`,children:[`/ `,v(t.maxLife)]}),t.barrier>0&&(0,q.jsxs)(`span`,{className:`orb-shield mono`,children:[`+`,v(t.barrier)]}),(0,q.jsx)(`span`,{className:`orb-level title-font`,children:t.level})]}),(0,q.jsxs)(`div`,{className:`orb-readout heat${i?` ready`:``}`,style:{left:n.heatOrb.x-84,top:n.heatOrb.y-84},role:`meter`,"aria-label":`Heat`,"aria-valuemin":0,"aria-valuemax":t.maxHeat,"aria-valuenow":Math.round(t.heat),title:c?`Heat · ${c.name} at ${c.threshold}`:`Heat`,children:[(0,q.jsx)(`span`,{className:`orb-num title-font`,children:Math.floor(t.heat)}),c&&(0,q.jsxs)(`span`,{className:`orb-max mono`,children:[`/ `,c.threshold]})]}),(0,q.jsx)(Y,{fighter:t,className:`hero`,style:{left:o}}),(0,q.jsx)(`div`,{className:`hud-boons-wrap`,style:{right:s},children:e.boons}),(0,q.jsxs)(`div`,{className:`hud-flasks`,style:{left:o},title:`Ember Flask: between stages`,children:[Array.from({length:e.flaskMax},(t,n)=>(0,q.jsx)(pe,{full:n<e.flaskCharges},n)),(0,q.jsxs)(`span`,{className:`hud-flask-count mono`,children:[e.flaskCharges,`/`,e.flaskMax]})]}),(0,q.jsxs)(`div`,{className:`hud-center`,children:[(0,q.jsx)(Z,{fighter:t,width:420,attackIcon:e.weaponIcon}),(0,q.jsxs)(`div`,{className:`skillbar`,"aria-label":`Battle Plan`,children:[(0,q.jsxs)(`div`,{className:`skill-slot-wrap`,title:`${t.defaultAttack} · Default Attack`,children:[(0,q.jsxs)(`div`,{className:`skill-slot attack${i?``:` next swing`}${r?` stunned`:``}`,style:Q(t,!i),"data-testid":`attack-slot`,children:[(0,q.jsx)(_,{name:e.weaponIcon,size:30,color:`#fff6e4`}),r&&(0,q.jsx)(`span`,{className:`stun-mark mono`,children:t.stunned.toFixed(1)})]}),(0,q.jsx)(`span`,{className:`skill-caption${i?``:` next`}`,children:t.defaultAttack})]}),t.rotation.length>0&&(0,q.jsx)(`span`,{className:`skillbar-divider`,"aria-hidden":`true`}),t.rotation.map((n,a)=>{let o=a===t.nextSlot,s=o&&i,c=o?Math.min(100,t.heat/n.threshold*100):0;return(0,q.jsxs)(`div`,{className:`skill-slot-wrap`,title:`${n.name} · ${n.heatCost} Heat`,children:[(0,q.jsxs)(`div`,{className:`skill-slot ${o?`next`:``}${s?` ready swing`:``}${r&&s?` stunned`:``} ${e.flash?.slot===a?`fired-${e.flash.n%2}`:``}`,style:{background:S(n.skillId),...Q(t,s)},"data-testid":`skill-slot`,children:[(0,q.jsx)(`div`,{className:`heat-fill`,style:{height:`${c}%`}}),(0,q.jsx)(_,{name:x(n.skillId),size:30,color:`#fff6e4`}),(0,q.jsx)(`span`,{className:`pos mono`,children:a+1}),(0,q.jsx)(`span`,{className:`corner mono`,children:o?`${Math.floor(t.heat)}/${n.threshold}`:n.heatCost})]}),(0,q.jsx)(`span`,{className:`skill-caption ${o?`next`:``}`,children:n.name})]},n.skillId)}),t.reactions.length>0&&(0,q.jsx)(`span`,{className:`skillbar-divider`,"aria-hidden":`true`}),t.reactions.map((t,n)=>(0,q.jsxs)(`div`,{className:`skill-slot-wrap reaction`,title:`Reaction: ${t.name} · ${t.heatCost} Heat`,children:[(0,q.jsxs)(`div`,{className:`skill-slot reaction ${t.cooldownLeft>0?`cooling`:``}${t.pending?` pending`:``} ${e.flash?.slot===10+n?`fired-${e.flash.n%2}`:``}`,style:{background:S(t.skillId)},"data-testid":`reaction-slot`,children:[(0,q.jsx)(_,{name:x(t.skillId),size:24,color:`#fff6e4`}),(0,q.jsxs)(`span`,{className:`pos mono`,children:[`R`,n+1]}),t.cooldownLeft>0&&(0,q.jsx)(`span`,{className:`cooldown mono`,children:Math.ceil(t.cooldownLeft)})]}),(0,q.jsx)(`span`,{className:`skill-caption`,children:t.name})]},`r-${t.skillId}`))]})]}),(0,q.jsx)(`div`,{className:`hud-right`,style:{right:o},children:e.right})]})}function he(e){return e>=5?`lv-deadly`:e>=2?`lv-hard`:e<=-5?`lv-trivial`:``}function ge(e){return e>=2?`${e} levels above you`:e<=-5?`${-e} levels below you`:`About your level`}function _e(e){let t=e.enemy,n=e.tag===`BOSS`?`boss`:e.tag===`ELITE`?`elite`:``;return(0,q.jsxs)(`section`,{className:`hud-enemy ${n}${t.telegraph?` charging`:``}`,style:{top:70,width:640,marginLeft:-320},"aria-label":`${e.name} plaque`,children:[(0,q.jsxs)(`div`,{className:`hud-enemy-head`,title:e.sub,children:[(0,q.jsx)(_,{name:e.icon,size:20,color:`#f3e6c8`}),e.tag&&(0,q.jsx)(`span`,{className:`rank-tag title-font ${n}`,children:e.tag}),(0,q.jsx)(`span`,{className:`hud-enemy-name title-font`,children:e.name}),(0,q.jsx)(`span`,{className:`hud-enemy-kind`,children:e.sub.split(` · `)[0]}),(0,q.jsxs)(`span`,{className:`hud-enemy-level title-font ${he(t.level-e.heroLevel)}`,title:ge(t.level-e.heroLevel),children:[`Lv `,t.level]})]}),(0,q.jsx)(`div`,{className:`hud-enemy-life`,style:{left:B.x,top:B.y,width:B.w,height:B.h},role:`meter`,"aria-label":`Life`,"aria-valuemin":0,"aria-valuemax":t.maxLife,"aria-valuenow":Math.round(t.life),children:(0,q.jsxs)(`span`,{className:`mono`,children:[v(t.life),` / `,v(t.maxLife),t.barrier>0?` · +${v(t.barrier)}`:``]})}),(0,q.jsx)(`div`,{className:`hud-enemy-heat${t.telegraph?` charging`:``}`,role:`meter`,"aria-label":`Heat`,"aria-valuemin":0,"aria-valuemax":t.maxHeat,"aria-valuenow":Math.round(t.heat),children:(0,q.jsx)(`div`,{className:`fill`,style:{width:`${t.heat/t.maxHeat*100}%`}})}),(0,q.jsxs)(`div`,{className:`hud-enemy-rhythm`,children:[(0,q.jsx)(Z,{fighter:t,width:440,attackIcon:e.attackIcon,enemy:!0}),(0,q.jsx)(`div`,{className:`hud-enemy-skills`,children:t.rotation.map((e,n)=>(0,q.jsx)(`div`,{className:`enemy-slot ${n===t.nextSlot?`next`:``}`,title:`${e.name} · ${e.heatCost} Heat`,style:{background:S(e.skillId)},children:(0,q.jsx)(_,{name:x(e.skillId),size:18,color:`#fff6e4`})},e.skillId))})]}),(0,q.jsxs)(`div`,{className:`hud-enemy-below`,children:[e.mods.map(e=>(0,q.jsx)(`span`,{className:`mod-chip`,children:e},e)),e.thiefLeft!==null&&(0,q.jsxs)(`span`,{className:`thief-timer${e.thiefLeft<=5?` hurry`:``}`,role:`timer`,"data-testid":`thief-timer`,children:[(0,q.jsx)(_,{name:`retreat`,size:16,color:`#ffd84a`}),(0,q.jsxs)(`span`,{children:[`Flees in `,e.thiefLeft,`s`]})]}),(0,q.jsx)(Y,{fighter:t,className:`enemy`})]})]})}var $=new URLSearchParams(window.location.search).has(`dev`),ve=[1,4,16],ye={cooling:`Cooling Heat`,steady:`Steady Heat`,warming:`Warming Heat`,smoldering:`Smoldering Heat`},be={brute:`Brute`,skirmisher:`Skirmisher`,caster:`Caster`,afflicter:`Afflicter`,warden:`Warden`,thornback:`Thornback`},xe=[`#5a1d08`,`#080404`];function Se(t){let n=m.find(e=>e.id===(t.encounter?.echo??t.actId))?.arenaGradient??(e(h,t.actId)?xe:void 0);return n?{background:`linear-gradient(180deg, ${n[0]} 0%, ${n[1]} 100%)`}:void 0}function Ce(i,a){let o=a.encounter,c=r(h,a.actId),l=o?f(o,c,h):void 0,p=o?.echo?r(h,o.echo):void 0,m=y(i.hero.classId,i.hero.weaponId,i.hero.equipment,u(i,h)?.def.color,b(i)),g=t(i,h).weapon,_=o?d(o,h).map(e=>e.name):[],v={archetype:l?.archetype??`brute`,boss:o?.boss??!1,elite:_.length>0,act:(p??c).number,ranged:l?.weapon.range===`ranged`,...o?.thief?{thief:!0}:{},...o?{levelGap:o.level-i.hero.level}:{}};return{act:c,heroLook:m,enemyLook:v,heroInfo:{name:`${i.hero.name} · ${s(i,h)}`,sub:`${n(i,h)} · ${ye[g.heatBehavior]}`,icon:`user`},enemyInfo:{name:p?`Echo of ${l?.name??``}`:l?.name??`Enemy`,sub:`${p?`Warden Echo`:e(h,c.id)?`Last Flame`:o?.boss?`Act Boss`:be[l?.archetype??``]??``} · ${l?.description??``}`,icon:o?.boss?`boss`:l?.archetype??`brute`,...o?.boss?{tag:`BOSS`}:_.length?{tag:`ELITE`}:{},mods:_},enemyAttackIcon:v.ranged?l?.archetype===`caster`?`bolt`:`bow`:`strike`}}var we=()=>window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0;function Te(e){let{state:t,run:n,game:r,settings:o}=e,s=Ce(t,n),[l]=(0,P.useState)(()=>{let e=a(t,h);return new i(e.hero,e.enemy,e.seed)}),[u,d]=(0,P.useState)(()=>l.snapshot()),[f,m]=(0,P.useState)(null),[v,y]=(0,P.useState)(1),[b,x]=(0,P.useState)(()=>new Set),S=(0,P.useRef)(null),C=c(),w=C.w,T=C.h,E=te(C.scale),D=(0,P.useRef)(null),O=(0,P.useRef)(null),k=(0,P.useRef)(e.paused),A=(0,P.useRef)(v);(0,P.useEffect)(()=>{k.current=e.paused,S.current&&(S.current.paused=e.paused),O.current&&(O.current.paused=e.paused)},[e.paused]),(0,P.useEffect)(()=>{A.current=v,S.current&&(S.current.speed=v)},[v]),(0,P.useEffect)(()=>{let e=D.current;if(!e)return;let t=new ne;t.showNumbers=o.damageNumbers,t.motion=o.screenShake&&!we(),t.layout(w,T,E,1,104),S.current=t;let r=new se;return r.layout(w,T),r.onSnapshot(l.snapshot(),!0),O.current=r,t.mount(e,s.heroLook,s.enemyLook).then(e=>{e&&r.attach(e,t.overlay,n.encounter?.boss===!0)}),()=>{r.destroy(),t.destroy(),S.current=null,O.current=null}},[]),(0,P.useEffect)(()=>{S.current?.layout(w,T,E,1,104)},[w,T,E]),(0,P.useEffect)(()=>{O.current?.layout(C.w,C.h)},[C.w,C.h]);let j=n.encounter?.boss===!0,M=(0,P.useRef)(1);(0,P.useEffect)(()=>{let e=0,t=performance.now(),n=i=>{let a=Math.min(.25,(i-t)/1e3)*A.current*M.current;if(t=i,!k.current&&!S.current?.frozen){let e=l.events.length;l.advance(a),r(l.events.slice(e))}l.over||(e=requestAnimationFrame(n))},r=e=>{let t=l.snapshot();S.current?.onEvents(e),S.current?.onSnapshot(t),O.current?.onSnapshot(t);let n=[...e].reverse().find(e=>e.type===`skill`&&e.side===`hero`);if(n?.type===`skill`){let e=n.via===`reaction`,r=(e?t.hero.reactions:t.hero.rotation).findIndex(e=>e.name===n.skill),i=e?10+r:r;r>=0&&m(e=>({slot:i,n:(e?.n??0)+1}))}let r=e.flatMap(e=>e.type===`trigger`&&e.side===`hero`?[e.name]:[]);r.length&&x(new Set(r)),j&&(M.current=t.enemy.life/t.enemy.maxLife<.08?.35:1),d(t)};return e=requestAnimationFrame(n),()=>cancelAnimationFrame(e)},[l,j]),(0,P.useEffect)(()=>{if(!b.size)return;let e=window.setTimeout(()=>x(new Set),450);return()=>window.clearTimeout(e)},[b]);let N=u.over;(0,P.useEffect)(()=>{if(!N)return;let e=window.setTimeout(()=>r.dispatch({type:`resolveFight`}),j&&u.winner===`hero`?2400:1600);return()=>window.clearTimeout(e)},[N,r,j,u.winner]);let F=()=>{let e=l.events.length;l.runToEnd(),S.current?.onEvents(l.events.slice(e)),O.current?.onSnapshot(l.snapshot(),!0),d(l.snapshot())},I=u.hero,L=u.enemy,R=N?u.winner===`hero`?`VICTORY`:u.winner===`enemy`?`DEFEAT`:u.fled===`enemy`?`ESCAPED`:`DRAW`:null,z=n.encounter?.thief?Math.max(0,Math.ceil(p.thiefFleeSeconds-u.time)):null,B=Math.max(p.flaskStartCharges,t.flaskCharges),V=s.act.stages;return(0,q.jsxs)(`section`,{className:`screen battle`,"aria-label":`Battle`,style:Se(n),children:[(0,q.jsx)(`div`,{className:`arena-host`,ref:D}),(0,q.jsx)(ee,{act:s.act,stage:n.stage,sub:`Stage ${n.stage} / ${V}`,cleared:!1,attributePoints:t.hero.unspentAttributePoints,skillPoints:t.hero.unspentSkillPoints,waymarks:t.progress.waymarks,onCharacter:e.onCharacter,onTree:e.onTree,onMenu:e.onMenu}),(0,q.jsx)(_e,{enemy:L,name:s.enemyInfo.name,sub:s.enemyInfo.sub,icon:s.enemyInfo.icon,...s.enemyInfo.tag?{tag:s.enemyInfo.tag}:{},mods:s.enemyInfo.mods??[],attackIcon:s.enemyAttackIcon,thiefLeft:N?null:z,heroLevel:t.hero.level}),R&&(0,q.jsx)(`div`,{className:`fight-banner ${R.toLowerCase()}${j&&u.winner===`hero`?` boss-kill`:``}`,"data-testid":`fight-result`,children:R}),e.paused&&!R&&(0,q.jsx)(`div`,{className:`paused-tag`,"aria-live":`polite`,children:`Fight paused`}),(0,q.jsx)(me,{hero:I,heroTitle:s.heroInfo.name,weaponIcon:de[s.heroLook.weapon]??`strike`,flaskCharges:t.flaskCharges,flaskMax:B,flash:f,stageW:C.w,stageH:C.h,boons:(0,q.jsx)(g,{state:t,flash:b,className:`battle-boons`}),right:(0,q.jsxs)(q.Fragment,{children:[$&&!R&&(0,q.jsxs)(`div`,{className:`dev-tools`,children:[ve.map(e=>(0,q.jsxs)(`button`,{type:`button`,className:v===e?`active`:``,onClick:()=>y(e),children:[e,`×`]},e)),(0,q.jsx)(`button`,{type:`button`,onClick:F,children:`Skip fight`})]}),(0,q.jsxs)(`button`,{type:`button`,className:`btn hud-retreat`,disabled:N,"aria-label":`Retreat to Camp`,title:`Retreat to Camp`,onClick:()=>r.dispatch({type:`retreat`}),children:[(0,q.jsx)(_,{name:`retreat`,size:18}),`Retreat`]})]})})]})}export{Te as BattleView,$ as DEV_MODE};