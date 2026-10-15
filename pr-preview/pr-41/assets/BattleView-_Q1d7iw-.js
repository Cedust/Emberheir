import{$ as e,At as t,Kr as n,Mt as r,Yr as i,ct as a,et as o,mt as s,n as c,ot as l,pt as u,r as d,sr as f,st as p,tt as m}from"./Stage-BbgXQHex.js";import{T as h,i as g}from"./src-CjzAJZp2.js";import{A as _,c as v,i as y,j as b,l as x,n as S,o as C,s as w}from"./index-BJ_69xD7.js";import{a as T,c as E,f as D,h as O,m as k,o as A,p as j,r as M,s as N,u as P}from"./pixi-Cs-2KjqM.js";import{a as ee,t as F}from"./fx-DnKIs7c8.js";import{t as te}from"./ArenaScene-lM2ctUgL.js";var I=i(),L=`
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
`,R=`
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
`,z=`
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
`,B=`
precision mediump float;
varying vec2 vUV;
${z}
${R}
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
`,V=`
precision mediump float;
varying vec2 vUV;
uniform float uAspect;
uniform float uNotch;
${z}
${R}
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
`,H={x:20,y:40,w:600,h:24};function U(e,t){let n=e/2,r=Math.min(700,e/2-84-22),i=t-100,a=n-320;return{w:e,h:t,cx:n,orbDx:r,lifeOrb:{x:n-r,y:i},heatOrb:{x:n+r,y:i},enemyLife:{x:a+H.x,y:70+H.y,w:H.w,h:H.h}}}var W=e=>[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255],ne={deep:W(3015173),bright:W(13637150),light:W(16743012)},re={deep:W(4853763),bright:W(16738834),light:W(16766842)},ie={deep:W(2753286),bright:W(12063770),light:W(16747098)},G=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r)),K=class{renderer;view;mesh;target;u;fill=1;shield=0;threshold=-1;ready=0;low=0;stun=0;shown={fill:1,trail:1,shield:0,low:0,stun:0,ready:0};trailHold=0;slosh=0;flash=0;glow=0;constructor(e,t,n,r,i,a=!1){this.renderer=e;let o=new A({positions:new Float32Array([0,0,n,0,n,r,0,r]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])});this.u=new j({uTime:{value:0,type:`f32`},uFill:{value:1,type:`f32`},uTrail:{value:1,type:`f32`},uShield:{value:0,type:`f32`},uSlosh:{value:0,type:`f32`},uFlash:{value:0,type:`f32`},uGlow:{value:0,type:`f32`},uLow:{value:0,type:`f32`},uThreshold:{value:-1,type:`f32`},uReady:{value:0,type:`f32`},uStun:{value:0,type:`f32`},uDeep:{value:new Float32Array(i.deep),type:`vec3<f32>`},uBright:{value:new Float32Array(i.bright),type:`vec3<f32>`},uLight:{value:new Float32Array(i.light),type:`vec3<f32>`},uAspect:{value:n/r,type:`f32`},uNotch:{value:+!!a,type:`f32`}});let s=D.from({gl:{vertex:L,fragment:t===`orb`?B:V},resources:{gauge:this.u}});this.mesh=new T({geometry:o,shader:s}),this.target=M.create({width:n,height:r,resolution:Math.min(1.5,e.resolution),antialias:!1}),this.view=new k(this.target)}set(e,t){let n=Math.max(0,Math.min(1,e));if(n<this.fill-.004){let e=this.fill-n;this.slosh=Math.min(1,this.slosh+e*6),this.flash=Math.min(1,this.flash+.25+e*3),this.trailHold=.45}else n>this.fill+.004&&(this.glow=Math.min(1,this.glow+.6),this.slosh=Math.min(1,this.slosh+.2));this.fill=n,this.shield=Math.max(0,Math.min(1,t))}snap(){this.shown.fill=this.fill,this.shown.trail=this.fill,this.shown.shield=this.shield}update(e,t){let n=this.shown;n.fill=G(n.fill,this.fill,14,t),this.trailHold>0?this.trailHold-=t:n.trail=G(n.trail,n.fill,3.2,t),n.trail<n.fill&&(n.trail=n.fill),n.shield=G(n.shield,this.shield,8,t),n.low=G(n.low,this.low,4,t),n.stun=G(n.stun,this.stun,10,t),n.ready=G(n.ready,this.ready,10,t),this.slosh=Math.max(0,this.slosh-t*.9),this.flash=Math.max(0,this.flash-t*3.5),this.glow=Math.max(0,this.glow-t*1.6);let r=this.u.uniforms;r.uTime=e,r.uFill=n.fill,r.uTrail=n.trail,r.uShield=n.shield,r.uSlosh=this.slosh,r.uFlash=this.flash,r.uGlow=this.glow,r.uLow=n.low,r.uThreshold=this.threshold,r.uReady=n.ready,r.uStun=n.stun,this.renderer.render({container:this.mesh,target:this.target,clear:!0})}destroy(){this.mesh.destroy(),this.target.destroy(!0)}get level(){return this.shown.fill}},q=class{kind;root=new O;gauge;fx;glow=new N;spawn=0;constructor(e,t){this.kind=t;let n=t===`life`?ne:re,r=t===`life`?16726586:16753978,i=new N().circle(0,6,106).fill({color:0,alpha:.7});i.filters=[new E({strength:14,quality:3})],this.glow.circle(0,0,84*1.55).fill(new P({type:`radial`,center:{x:.5,y:.5},innerRadius:0,outerCenter:{x:.5,y:.5},outerRadius:.5,colorStops:[{offset:.45,color:`rgba(${n.bright.map(e=>Math.round(e*255)).join(`,`)},0.55)`},{offset:1,color:`rgba(0,0,0,0)`}],textureSpace:`local`})),this.glow.blendMode=`add`,this.glow.alpha=0,this.gauge=new K(e.renderer,`orb`,168,168,n),this.gauge.view.position.set(-84,-84),this.fx=new F(e.renderer);let a=new O,o=new N().circle(0,0,82).fill(16777215);a.addChild(this.fx.back,this.fx.front,o),a.mask=o;let s=ae(84,r),c={resolution:e.renderer.resolution,antialias:!0};i.cacheAsTexture(c),s.cacheAsTexture(c),this.root.addChild(i,this.glow,this.gauge.view,a,s)}update(e,t,n){this.gauge.update(e,t),this.glow.alpha=G(this.glow.alpha,n,3,t);let r=this.gauge.level,i=84-168*r;for(this.spawn+=t*(this.kind===`heat`?6+26*r:3+7*r);this.spawn>=1&&r>.02;){--this.spawn;let e=this.fx.rand,t=e.range(Math.max(i+6,-76),74),n=Math.sqrt(Math.max(0,7056-t*t))-8;this.fx.burst(this.kind===`heat`?{x:e.range(-n,n),y:t,count:1,color:[16765562,16747050,16758858],angle:[-Math.PI/2-.35,-Math.PI/2+.35],speed:[25,70],life:[.5,1.2],size:[5,11],wobble:6}:{x:e.range(-n,n),y:t,count:1,color:[16751242,16762040],angle:[-Math.PI/2-.1,-Math.PI/2+.1],speed:[14,34],life:[.8,1.6],size:[4,8],endSize:.9,alpha:.45,wobble:4})}this.fx.update(t)}puff(e,t,n=!0){let r=84-168*this.gauge.level;this.fx.burst({x:0,y:Math.max(-64,r),count:t,color:e,spreadX:50.4,spreadY:10,angle:n?[-Math.PI/2-.8,-Math.PI/2+.8]:[0,Math.PI*2],speed:[40,140],life:[.35,.8],size:[6,14],drag:.3})}};function ae(e,t){let n=new O,r=new P({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`#f0c77a`},{offset:.35,color:`#a8732e`},{offset:.7,color:`#5e3a16`},{offset:1,color:`#2a180a`}],textureSpace:`local`}),i=new N().circle(0,0,e+15).fill(r).circle(0,0,e).cut().circle(0,0,e+15).stroke({color:1313798,width:3}).circle(0,0,e+1).stroke({color:1313798,width:3}).circle(0,0,e+8).stroke({color:16769960,width:1.2,alpha:.35});for(let t=0;t<12;t++){let n=t/12*Math.PI*2+Math.PI/12,r=Math.cos(n)*(e+8),a=Math.sin(n)*(e+8);i.circle(r,a,3.2).fill(2758666).circle(r-.8,a-.8,1.6).fill(16769184)}let a=-e-12;i.poly([-34,a+8,-20,a-14,-8,a+2,0,a-24,8,a+2,20,a-14,34,a+8]).fill(r).stroke({color:1313798,width:2.5}),i.circle(0,a-2,10).fill(1313798),i.circle(0,a-2,7.5).fill(t),i.circle(-2.5,a-4.5,2.5).fill({color:16777215,alpha:.75});let o=new N().circle(0,a-2,16).fill({color:t,alpha:.35});return o.blendMode=`add`,n.addChild(i,o),n}function J(e,t){return getComputedStyle(document.documentElement).getPropertyValue(e).trim()||t}var oe=class{app=null;destroyed=!1;layoutInfo=U(1600,900);root=new O;bar=new O;enemyPlate=new O;life=null;heat=null;enemy=null;time=0;hot=0;last=null;prevHero=null;paused=!1;layout(e,t){this.layoutInfo=U(e,t),this.app&&this.place()}attach(e,t,n){this.destroyed||(this.app=e,this.life=new q(e,`life`),this.heat=new q(e,`heat`),this.enemy=new K(e.renderer,`bar`,600,24,ie,n),this.root.addChild(this.enemyPlate,this.bar,this.life.root,this.heat.root),t.addChild(this.root),this.place(),this.last&&this.onSnapshot(this.last,!0),e.ticker.add(this.onTick))}destroy(){this.destroyed=!0,this.app?.ticker?.remove(this.onTick),this.life?.fx.destroy(),this.heat?.fx.destroy(),this.life?.gauge.destroy(),this.heat?.gauge.destroy(),this.enemy?.destroy(),this.root.destroy({children:!0}),this.app=null}onTick=e=>this.tick(e.deltaMS/1e3);place(){let e=this.layoutInfo,{w:t,h:n,cx:r}=e;this.life?.root.position.set(e.lifeOrb.x,e.lifeOrb.y),this.heat?.root.position.set(e.heatOrb.x,e.heatOrb.y);let i=J(`--slot-bg`,`#32271d`),a=J(`--edge`,`#6a4a2c`);this.bar.removeChildren().forEach(e=>e.destroy());let o=n-104,s=e.lifeOrb.x,c=e.heatOrb.x,l=new N().rect(0,o-70,t,70).fill(new P({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`rgba(0,0,0,0)`},{offset:1,color:`rgba(0,0,0,0.55)`}],textureSpace:`local`})),u=new P({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:i},{offset:1,color:`#0c0a08`}],textureSpace:`local`}),d=new N,f=Math.min(400,(c-s)/2-150);d.poly([s,o,r-f-40,o,r-f,o-22,r+f,o-22,r+f+40,o,c,o,c,n,s,n]).fill(u).stroke({color:a,width:4,alignment:1}),d.poly([s,o+3,r-f-39,o+3,r-f+1,o-22+3,r+f-1,o-22+3,r+f+39,o+3,c,o+3],!1).stroke({color:14263642,width:1.5,alpha:.55});for(let e=s+120;e<c-110;e+=90)e>r-f-50&&e<r+f+50||d.circle(e,o+12,3).fill(1708554).circle(e-.7,o+11.3,1.4).fill(14263642);this.bar.addChild(l,d);let p={resolution:this.app?.renderer.resolution??1,antialias:!0};this.bar.cacheAsTexture(p),this.bar.updateCacheTexture(),this.enemyPlate.removeChildren().forEach(e=>e.destroy());let m=r-320,h=new N().roundRect(m,70,640,124,10).fill({color:920329,alpha:.72}).stroke({color:a,width:2}).roundRect(m+4,74,632,116,7).stroke({color:14263642,width:1,alpha:.3}),g=e.enemyLife,_=new N().roundRect(g.x-4,g.y-4,g.w+8,g.h+8,6).fill(1313798).stroke({color:12159562,width:2});this.enemyPlate.addChild(h,_),this.enemy&&(this.enemy.view.position.set(g.x,g.y),this.enemyPlate.addChild(this.enemy.view))}onSnapshot(e,t=!1){if(this.last=e,!this.life||!this.heat||!this.enemy)return;let n=e.hero,r=this.prevHero;this.life.gauge.set(n.life/n.maxLife,n.barrier/n.maxLife),this.life.gauge.low=+(n.life/n.maxLife<.3&&!e.over),this.heat.gauge.set(n.heat/n.maxHeat,0);let i=n.rotation[n.nextSlot];this.heat.gauge.threshold=i?i.threshold/n.maxHeat:-1;let a=i!==void 0&&n.heat>=i.threshold;this.heat.gauge.ready=+!!a,this.hot=.25+.5*(n.heat/n.maxHeat)+(a?.35:0),r&&!t&&this.effects(r,n),this.prevHero=n;let o=e.enemy;this.enemy.set(o.life/o.maxLife,o.barrier/o.maxLife),this.enemy.stun=+(o.stunned>0),t&&(this.life.gauge.snap(),this.heat.gauge.snap(),this.enemy.snap())}effects(e,t){this.life&&this.heat&&(t.life>e.life+.5&&this.life.puff([5234826,11075528],16),t.barrier>e.barrier+t.maxLife*.02&&this.life.puff([10477823,16777215],20,!1),t.heat<e.heat-8&&this.heat.puff([16765562,16747050,16777215],26))}tick(e){this.paused&&(e=0),this.time+=e,this.life?.update(this.time,e,.25),this.heat?.update(this.time,e,this.hot),this.enemy?.update(this.time,e)}},Y=d(),X=e=>`Heavy Attack: ${e}. Hits hard, but never more than ${Math.round(n.heavyHitCap*100)} % of your Life + Barrier.`,Z=4,se={burn:`fire`,chill:`snow`,shock:`bolt`,bleed:`drop`,poison:`venom`,corruption:`void`},ce={burn:`Burn`,chill:`Chill`,shock:`Shock`,bleed:`Bleed`,poison:`Poison`,corruption:`Corruption`};function le(e){let t=e.toLowerCase();return t.includes(`bleed`)?`drop`:t.includes(`poison`)?`venom`:t.includes(`burn`)||t.includes(`fire`)?`fire`:t.includes(`chill`)||t.includes(`cold`)?`snow`:t.includes(`shock`)||t.includes(`lightning`)?`bolt`:t.includes(`armor`)||t.includes(`block`)||t.includes(`resist`)?`shield`:t.includes(`speed`)?`flurry`:t.includes(`crit`)?`execute`:t.includes(`heat`)?`flame`:t.includes(`evasion`)?`skirmisher`:`strike`}var ue={sword:`sword`,wand:`wand`,axe:`axe`,dagger:`dagger`,bow:`bow`,crossbow:`crossbow`,mace:`hammer`,staff:`wand`};function de(e){let t=[];e.stunned>0&&t.push({key:`stun`,icon:`stun`,name:`Stunned`,kind:`stun`,remaining:e.stunned});for(let n of e.ailments)t.push({key:n.type,icon:se[n.type]??`warning`,name:ce[n.type]??n.type,kind:`ailment-${n.type}`,...n.stacks&&n.stacks>1?{stacks:n.stacks}:{},remaining:n.remaining});for(let n of e.curses)t.push({key:`c-${n.name}`,icon:n.armor?`hammer`:`curse`,name:n.name,kind:`curse`,remaining:n.remaining});for(let n of e.buffs)t.push({key:`b-${n.name}`,icon:le(n.stat),name:n.name,kind:`buff`,...n.stacks>1?{stacks:n.stacks}:{},remaining:n.remaining});return t}function Q(e){let t=de(e.fighter);return(0,Y.jsx)(`div`,{className:`hud-status ${e.className??``}`,style:e.style,children:t.map(e=>(0,Y.jsxs)(`span`,{className:`hud-status-icon ${e.kind}${e.remaining<1.5?` fading`:``}`,title:e.name,children:[(0,Y.jsx)(b,{name:e.icon,size:18,color:`#fff6e4`}),e.stacks&&(0,Y.jsx)(`b`,{className:`mono`,children:e.stacks}),(0,Y.jsx)(`i`,{className:`mono`,children:e.remaining<10?e.remaining.toFixed(1):Math.ceil(e.remaining)})]},e.key))})}function fe(e){return(0,Y.jsxs)(`svg`,{className:`hud-flask ${e.full?`full`:``}`,viewBox:`0 0 32 44`,"aria-hidden":`true`,children:[(0,Y.jsxs)(`defs`,{children:[(0,Y.jsxs)(`radialGradient`,{id:`potion-liquid`,cx:`40%`,cy:`35%`,r:`70%`,children:[(0,Y.jsx)(`stop`,{offset:`0`,stopColor:`#ff6a5a`}),(0,Y.jsx)(`stop`,{offset:`0.55`,stopColor:`#c4161c`}),(0,Y.jsx)(`stop`,{offset:`1`,stopColor:`#4a0308`})]}),(0,Y.jsx)(`clipPath`,{id:`potion-bulb`,children:(0,Y.jsx)(`circle`,{cx:`16`,cy:`29`,r:`12`})})]}),(0,Y.jsx)(`rect`,{x:`11.5`,y:`2`,width:`9`,height:`6`,rx:`1.5`,fill:`#8a5a26`,stroke:`#2a180a`}),(0,Y.jsx)(`path`,{d:`M12.5 8h7v7.4a12.5 12.5 0 1 1-7 0z`,fill:`rgb(20 12 8 / 0.65)`,stroke:`#d9a55a`,strokeWidth:`1.6`}),e.full&&(0,Y.jsxs)(`g`,{clipPath:`url(#potion-bulb)`,children:[(0,Y.jsx)(`rect`,{x:`2`,y:`21`,width:`28`,height:`22`,fill:`url(#potion-liquid)`}),(0,Y.jsx)(`ellipse`,{cx:`16`,cy:`21`,rx:`12`,ry:`1.6`,fill:`#ff9a8a`,opacity:`0.8`})]}),(0,Y.jsx)(`path`,{d:`M9 24a8 8 0 0 1 5-5`,stroke:`#fff`,strokeWidth:`1.6`,fill:`none`,opacity:`0.55`,strokeLinecap:`round`})]})}function $(e){let t=e.rotation[e.nextSlot];return t!==void 0&&e.heat>=t.threshold}function pe(e){let t=e.fighter,n=e.width,r=e=>Math.min(e,Z)/Z*n,i=Math.max(.05,t.attackRate||t.stats.attackSpeed),a=t.attackRate>0?t.attackProgress/t.attackRate:1,o=Math.max(0,1-a/.35),s=t.stunned>0?t.stunned:t.telegraph?.remaining??0,c=t.nextHeavy?t.nextHeavy.in:null,l=[];for(let e=1;l.length<12;e++){let n=s+(e-t.attackProgress)/i;if(c!==null&&n>c&&(n+=t.nextHeavy?.windup??0),n>Z)break;l.push(n)}let u=$(t),d=t.rotation[t.nextSlot],f=u&&d?C(d.skillId):e.attackIcon;return(0,Y.jsxs)(`div`,{className:`rhythm${t.stunned>0?` stunned`:``}${t.telegraph?` winding`:``}${e.enemy?` enemy`:``}`,style:{width:n},"aria-hidden":`true`,children:[(0,Y.jsx)(`div`,{className:`rhythm-groove`}),t.stunned>0&&(0,Y.jsx)(`div`,{className:`rhythm-hold stun`,style:{width:r(t.stunned)},children:(0,Y.jsx)(b,{name:`stun`,size:12,color:`#e8e2d6`})}),t.telegraph&&(0,Y.jsx)(`div`,{className:`rhythm-hold heavy`,style:{width:r(t.telegraph.remaining)},children:(0,Y.jsx)(`span`,{children:t.telegraph.skill})}),c!==null&&t.nextHeavy&&c<Z&&(0,Y.jsx)(`div`,{className:`rhythm-heavy`,style:{left:r(c),width:Math.max(10,r(c+t.nextHeavy.windup)-r(c))},title:X(t.nextHeavy.skill),children:(0,Y.jsx)(b,{name:`warning`,size:12,color:`#ffd9bf`})}),c!==null&&t.nextHeavy&&c>=Z&&(0,Y.jsxs)(`div`,{className:`rhythm-heavy later`,title:X(t.nextHeavy.skill),children:[(0,Y.jsx)(b,{name:`warning`,size:11,color:`#ffd9bf`}),Math.ceil(c),`s`]}),l.map((e,t)=>(0,Y.jsx)(`span`,{className:`rhythm-beat${t===0?` first`:``}${t===0&&u?` skill`:``}`,style:{left:r(e)},children:t===0&&(0,Y.jsx)(b,{name:f,size:12,color:`#fff6e4`})},t)),(0,Y.jsx)(`span`,{className:`rhythm-now`,style:{transform:`scaleY(${1+.7*o})`}})]})}function me(e,t){if(t)return{"--swing":`${Math.round(e.attackProgress*360)}deg`}}function he(e){let{hero:t}=e,n=U(e.stageW,e.stageH),r=t.stunned>0,i=$(t),a=Math.round(t.life/t.maxLife*100),o=n.lifeOrb.x+84+30,s=e.stageW-(n.heatOrb.x-84-30),c=t.rotation[t.nextSlot];return(0,Y.jsxs)(`div`,{className:`hud-hero`,style:{"--bar-h":`104px`},children:[(0,Y.jsxs)(`div`,{className:`orb-readout life`,style:{left:n.lifeOrb.x-84,top:n.lifeOrb.y-84},role:`meter`,"aria-label":`Life`,"aria-valuemin":0,"aria-valuemax":t.maxLife,"aria-valuenow":Math.round(t.life),title:`${e.heroTitle} · Life ${a} %`,children:[(0,Y.jsx)(`span`,{className:`orb-num title-font`,children:_(t.life)}),(0,Y.jsxs)(`span`,{className:`orb-max mono`,children:[`/ `,_(t.maxLife)]}),t.barrier>0&&(0,Y.jsxs)(`span`,{className:`orb-shield mono`,children:[`+`,_(t.barrier)]}),(0,Y.jsx)(`span`,{className:`orb-level title-font`,children:t.level})]}),(0,Y.jsxs)(`div`,{className:`orb-readout heat${i?` ready`:``}`,style:{left:n.heatOrb.x-84,top:n.heatOrb.y-84},role:`meter`,"aria-label":`Heat`,"aria-valuemin":0,"aria-valuemax":t.maxHeat,"aria-valuenow":Math.round(t.heat),title:c?`Heat · ${c.name} at ${c.threshold}`:`Heat`,children:[(0,Y.jsx)(`span`,{className:`orb-num title-font`,children:Math.floor(t.heat)}),c&&(0,Y.jsxs)(`span`,{className:`orb-max mono`,children:[`/ `,c.threshold]})]}),(0,Y.jsx)(Q,{fighter:t,className:`hero`,style:{left:o}}),(0,Y.jsx)(`div`,{className:`hud-boons-wrap`,style:{right:s},children:e.boons}),(0,Y.jsxs)(`div`,{className:`hud-flasks`,style:{left:o},title:`Ember Flask: between stages`,children:[Array.from({length:e.flaskMax},(t,n)=>(0,Y.jsx)(fe,{full:n<e.flaskCharges},n)),(0,Y.jsxs)(`span`,{className:`hud-flask-count mono`,children:[e.flaskCharges,`/`,e.flaskMax]})]}),(0,Y.jsxs)(`div`,{className:`hud-center`,children:[(0,Y.jsx)(pe,{fighter:t,width:420,attackIcon:e.weaponIcon}),(0,Y.jsxs)(`div`,{className:`skillbar`,"aria-label":`Battle Plan`,children:[(0,Y.jsxs)(`div`,{className:`skill-slot-wrap`,title:`${t.defaultAttack} · Default Attack`,children:[(0,Y.jsxs)(`div`,{className:`skill-slot attack${i?``:` next swing`}${r?` stunned`:``}`,style:me(t,!i),"data-testid":`attack-slot`,children:[(0,Y.jsx)(b,{name:e.weaponIcon,size:30,color:`#fff6e4`}),r&&(0,Y.jsx)(`span`,{className:`stun-mark mono`,children:t.stunned.toFixed(1)})]}),(0,Y.jsx)(`span`,{className:`skill-caption${i?``:` next`}`,children:t.defaultAttack})]}),t.rotation.length>0&&(0,Y.jsx)(`span`,{className:`skillbar-divider`,"aria-hidden":`true`}),t.rotation.map((n,a)=>{let o=a===t.nextSlot,s=o&&i,c=o?Math.min(100,t.heat/n.threshold*100):0;return(0,Y.jsxs)(`div`,{className:`skill-slot-wrap`,title:`${n.name} · ${n.heatCost} Heat`,children:[(0,Y.jsxs)(`div`,{className:`skill-slot ${o?`next`:``}${s?` ready swing`:``}${r&&s?` stunned`:``} ${e.flash?.slot===a?`fired-${e.flash.n%2}`:``}`,style:{background:w(n.skillId),...me(t,s)},"data-testid":`skill-slot`,children:[(0,Y.jsx)(`div`,{className:`heat-fill`,style:{height:`${c}%`}}),(0,Y.jsx)(b,{name:C(n.skillId),size:30,color:`#fff6e4`}),(0,Y.jsx)(`span`,{className:`pos mono`,children:a+1}),(0,Y.jsx)(`span`,{className:`corner mono`,children:o?`${Math.floor(t.heat)}/${n.threshold}`:n.heatCost})]}),(0,Y.jsx)(`span`,{className:`skill-caption ${o?`next`:``}`,children:n.name})]},n.skillId)}),t.reactions.length>0&&(0,Y.jsx)(`span`,{className:`skillbar-divider`,"aria-hidden":`true`}),t.reactions.map((t,n)=>(0,Y.jsxs)(`div`,{className:`skill-slot-wrap reaction`,title:`Reaction: ${t.name} · ${t.heatCost} Heat`,children:[(0,Y.jsxs)(`div`,{className:`skill-slot reaction ${t.cooldownLeft>0?`cooling`:``}${t.pending?` pending`:``} ${e.flash?.slot===10+n?`fired-${e.flash.n%2}`:``}`,style:{background:w(t.skillId)},"data-testid":`reaction-slot`,children:[(0,Y.jsx)(b,{name:C(t.skillId),size:24,color:`#fff6e4`}),(0,Y.jsxs)(`span`,{className:`pos mono`,children:[`R`,n+1]}),t.cooldownLeft>0&&(0,Y.jsx)(`span`,{className:`cooldown mono`,children:Math.ceil(t.cooldownLeft)})]}),(0,Y.jsx)(`span`,{className:`skill-caption`,children:t.name})]},`r-${t.skillId}`))]})]}),(0,Y.jsx)(`div`,{className:`hud-right`,style:{right:o},children:e.right})]})}function ge(e){return e>=5?`lv-deadly`:e>=2?`lv-hard`:e<=-5?`lv-trivial`:``}function _e(e){return e>=2?`${e} levels above you`:e<=-5?`${-e} levels below you`:`About your level`}var ve=`Gatekeeper: an Elite that guards this Waymark of the newest act. Much tougher than the road so far. Farm a few levels if it stops you.`,ye=`Champion: a named Elite with three modifiers and its own hoard (a sure Epic, a chance of a Legendary).`;function be(e){let t=e.enemy,n=e.tag===`BOSS`?`boss`:e.tag===`ELITE`?`elite`:e.tag===`GATEKEEPER`?`elite gate`:e.tag===`CHAMPION`?`elite champion`:``;return(0,Y.jsxs)(`section`,{className:`hud-enemy ${n}${t.telegraph?` charging`:``}`,style:{top:70,width:640,marginLeft:-320},"aria-label":`${e.name} plaque`,children:[(0,Y.jsxs)(`div`,{className:`hud-enemy-head`,title:e.sub,children:[(0,Y.jsx)(b,{name:e.icon,size:20,color:`#f3e6c8`}),e.tag&&(0,Y.jsx)(`span`,{className:`rank-tag title-font ${n}`,title:e.tag===`GATEKEEPER`?ve:e.tag===`CHAMPION`?ye:void 0,children:e.tag}),(0,Y.jsx)(`span`,{className:`hud-enemy-name title-font`,children:e.name}),(0,Y.jsx)(`span`,{className:`hud-enemy-kind`,children:e.sub.split(` · `)[0]}),(0,Y.jsxs)(`span`,{className:`hud-enemy-level title-font ${ge(t.level-e.heroLevel)}`,title:_e(t.level-e.heroLevel),children:[`Lv `,t.level]})]}),(0,Y.jsx)(`div`,{className:`hud-enemy-life`,style:{left:H.x,top:H.y,width:H.w,height:H.h},role:`meter`,"aria-label":`Life`,"aria-valuemin":0,"aria-valuemax":t.maxLife,"aria-valuenow":Math.round(t.life),children:(0,Y.jsxs)(`span`,{className:`mono`,children:[_(t.life),` / `,_(t.maxLife),t.barrier>0?` · +${_(t.barrier)}`:``]})}),(0,Y.jsx)(`div`,{className:`hud-enemy-heat${t.telegraph?` charging`:``}`,role:`meter`,"aria-label":`Heat`,"aria-valuemin":0,"aria-valuemax":t.maxHeat,"aria-valuenow":Math.round(t.heat),children:(0,Y.jsx)(`div`,{className:`fill`,style:{width:`${t.heat/t.maxHeat*100}%`}})}),(0,Y.jsxs)(`div`,{className:`hud-enemy-rhythm`,children:[(0,Y.jsx)(pe,{fighter:t,width:440,attackIcon:e.attackIcon,enemy:!0}),(0,Y.jsx)(`div`,{className:`hud-enemy-skills`,children:t.rotation.map((e,n)=>(0,Y.jsx)(`div`,{className:`enemy-slot ${n===t.nextSlot?`next`:``}`,title:`${e.name} · ${e.heatCost} Heat`,style:{background:w(e.skillId)},children:(0,Y.jsx)(b,{name:C(e.skillId),size:18,color:`#fff6e4`})},e.skillId))})]}),(0,Y.jsxs)(`div`,{className:`hud-enemy-below`,children:[e.mods.map(e=>(0,Y.jsx)(`span`,{className:`mod-chip`,children:e},e)),e.thiefLeft!==null&&(0,Y.jsxs)(`span`,{className:`thief-timer${e.thiefLeft<=5?` hurry`:``}`,role:`timer`,"data-testid":`thief-timer`,children:[(0,Y.jsx)(b,{name:`retreat`,size:16,color:`#ffd84a`}),(0,Y.jsxs)(`span`,{children:[`Flees in `,e.thiefLeft,`s`]})]}),(0,Y.jsx)(Q,{fighter:t,className:`enemy`})]})]})}var xe=new URLSearchParams(window.location.search).has(`dev`),Se=[1,4,16],Ce={cooling:`Cooling Heat`,steady:`Steady Heat`,warming:`Warming Heat`,smoldering:`Smoldering Heat`},we={brute:`Brute`,skirmisher:`Skirmisher`,caster:`Caster`,afflicter:`Afflicter`,warden:`Warden`,thornback:`Thornback`},Te=[`#5a1d08`,`#080404`];function Ee(e){let t=h.find(t=>t.id===(e.encounter?.echo??e.actId))?.arenaGradient??(r(g,e.actId)?Te:void 0);return t?{background:`linear-gradient(180deg, ${t[0]} 0%, ${t[1]} 100%)`}:void 0}function De(n,i){let c=i.encounter,d=t(g,i.actId),f=c?o(c,d,g):void 0,m=c?.echo?t(g,c.echo):void 0,h=s(n,g),_={...y(n.hero.classId,n.hero.weaponId,n.hero.equipment,u(n,g)?.def.color,S(n)),...h?{draught:h.color}:{}},v=p(n,g).weapon,b=c?e(c,g).map(e=>e.name):[],x={archetype:f?.archetype??`brute`,boss:c?.boss??!1,elite:b.length>0,act:(m??d).number,ranged:f?.weapon.range===`ranged`,...c?.thief?{thief:!0}:{},...c?.gate?{gate:!0}:{},...c?.champion?{champion:!0}:{},...i.wildfire?{wildfire:i.wildfire}:{},...c?{levelGap:c.level-n.hero.level}:{}},C={name:`${n.hero.name} · ${l(n,g)}`,sub:`${a(n,g)} · ${Ce[v.heatBehavior]}`,icon:`user`},w=f?.name??`Enemy`,T=b.length&&!c?.boss&&!c?.gate?`${b[0]} ${w}`:w;return{act:d,heroLook:_,enemyLook:x,heroInfo:C,enemyInfo:{name:m?`Echo of ${f?.name??``}`:T,sub:`${m?`Warden Echo`:r(g,d.id)?`Last Flame`:c?.boss?`Act Boss`:we[f?.archetype??``]??``} · ${f?.description??``}`,icon:c?.boss?`boss`:f?.archetype??`brute`,...c?.boss?{tag:`BOSS`}:c?.gate?{tag:`GATEKEEPER`}:c?.champion?{tag:`CHAMPION`}:b.length?{tag:`ELITE`}:{},mods:b},enemyAttackIcon:x.ranged?f?.archetype===`caster`?`bolt`:`bow`:`strike`}}var Oe=()=>window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0;function ke(e){let{state:t,run:n,game:r,settings:i}=e,a=De(t,n),[o]=(0,I.useState)(()=>m(t,g)),[s,l]=(0,I.useState)(()=>o.snapshot()),[u,d]=(0,I.useState)(null),[p,h]=(0,I.useState)(1),[_,y]=(0,I.useState)(()=>new Set),S=(0,I.useRef)(null),C=c(),w=C.w,T=C.h,E=ee(C.scale),D=(0,I.useRef)(null),O=(0,I.useRef)(null),k=(0,I.useRef)(e.paused),A=(0,I.useRef)(p);(0,I.useEffect)(()=>{k.current=e.paused,S.current&&(S.current.paused=e.paused),O.current&&(O.current.paused=e.paused)},[e.paused]),(0,I.useEffect)(()=>{A.current=p,S.current&&(S.current.speed=p)},[p]),(0,I.useEffect)(()=>{let e=D.current;if(!e)return;let t=new te;t.showNumbers=i.damageNumbers,t.motion=i.screenShake&&!Oe(),t.layout(w,T,E,1,104),S.current=t;let r=new oe;return r.layout(w,T),r.onSnapshot(o.snapshot(),!0),O.current=r,t.mount(e,a.heroLook,a.enemyLook).then(e=>{e&&r.attach(e,t.overlay,n.encounter?.boss===!0)}),()=>{r.destroy(),t.destroy(),S.current=null,O.current=null}},[]),(0,I.useEffect)(()=>{S.current?.layout(w,T,E,1,104)},[w,T,E]),(0,I.useEffect)(()=>{O.current?.layout(C.w,C.h)},[C.w,C.h]);let j=n.encounter?.boss===!0,M=(0,I.useRef)(1);(0,I.useEffect)(()=>{let e=0,t=performance.now(),n=i=>{let a=Math.min(.25,(i-t)/1e3)*A.current*M.current;t=i,!k.current&&!S.current?.frozen&&r(o.advance(a)),o.over||(e=requestAnimationFrame(n))},r=e=>{let t=o.snapshot();S.current?.onEvents(e),S.current?.onSnapshot(t),O.current?.onSnapshot(t);let n=[...e].reverse().find(e=>e.type===`skill`&&e.side===`hero`);if(n?.type===`skill`){let e=n.via===`reaction`,r=(e?t.hero.reactions:t.hero.rotation).findIndex(e=>e.name===n.skill),i=e?10+r:r;r>=0&&d(e=>({slot:i,n:(e?.n??0)+1}))}let r=e.flatMap(e=>e.type===`trigger`&&e.side===`hero`?[e.name]:[]);r.length&&y(new Set(r)),j&&(M.current=t.enemy.life/t.enemy.maxLife<.08?.35:1),l(t)};return e=requestAnimationFrame(n),()=>cancelAnimationFrame(e)},[o,j]),(0,I.useEffect)(()=>{if(!_.size)return;let e=window.setTimeout(()=>y(new Set),450);return()=>window.clearTimeout(e)},[_]);let N=s.over;(0,I.useEffect)(()=>{if(!N)return;let e=window.setTimeout(()=>r.dispatch({type:`resolveFight`}),j&&s.winner===`hero`?2400:1600);return()=>window.clearTimeout(e)},[N,r,j,s.winner]);let P=()=>{S.current?.onEvents(o.finish()),O.current?.onSnapshot(o.snapshot(),!0),l(o.snapshot())},F=s.hero,L=s.enemy,R=N?s.winner===`hero`?`VICTORY`:s.winner===`enemy`?`DEFEAT`:s.fled===`enemy`?`ESCAPED`:`DRAW`:null,z=n.encounter?.thief?Math.max(0,Math.ceil(f.thiefFleeSeconds-s.time)):null,B=Math.max(f.flaskStartCharges,t.flaskCharges),V=a.act.stages;return(0,Y.jsxs)(`section`,{className:`screen battle`,"aria-label":`Battle`,style:Ee(n),children:[(0,Y.jsx)(`div`,{className:`arena-host`,ref:D}),(0,Y.jsx)(v,{act:a.act,stage:n.stage,sub:`Stage ${n.stage} / ${V}`,cleared:!1,attributePoints:t.hero.unspentAttributePoints,skillPoints:t.hero.unspentSkillPoints,waymarks:t.progress.waymarks,prestige:t.legacy.prestige,...n.wildfire?{wildfire:n.wildfire}:{},onCharacter:e.onCharacter,onTree:e.onTree,onMenu:e.onMenu}),(0,Y.jsx)(be,{enemy:L,name:a.enemyInfo.name,sub:a.enemyInfo.sub,icon:a.enemyInfo.icon,...a.enemyInfo.tag?{tag:a.enemyInfo.tag}:{},mods:a.enemyInfo.mods??[],attackIcon:a.enemyAttackIcon,thiefLeft:N?null:z,heroLevel:t.hero.level}),R&&(0,Y.jsx)(`div`,{className:`fight-banner ${R.toLowerCase()}${j&&s.winner===`hero`?` boss-kill`:``}`,"data-testid":`fight-result`,children:R}),e.paused&&!R&&(0,Y.jsx)(`div`,{className:`paused-tag`,"aria-live":`polite`,children:`Fight paused`}),(0,Y.jsx)(he,{hero:F,heroTitle:a.heroInfo.name,weaponIcon:ue[a.heroLook.weapon]??`strike`,flaskCharges:t.flaskCharges,flaskMax:B,flash:u,stageW:C.w,stageH:C.h,boons:(0,Y.jsx)(x,{state:t,flash:_,className:`battle-boons`}),right:(0,Y.jsxs)(Y.Fragment,{children:[xe&&!R&&(0,Y.jsxs)(`div`,{className:`dev-tools`,children:[Se.map(e=>(0,Y.jsxs)(`button`,{type:`button`,className:p===e?`active`:``,onClick:()=>h(e),children:[e,`×`]},e)),(0,Y.jsx)(`button`,{type:`button`,onClick:P,children:`Skip fight`})]}),(0,Y.jsxs)(`button`,{type:`button`,className:`btn hud-retreat`,disabled:N,"aria-label":`Retreat to Camp`,title:`Retreat to Camp`,onClick:()=>r.dispatch({type:`retreat`}),children:[(0,Y.jsx)(b,{name:`retreat`,size:18}),`Retreat`]})]})})]})}export{ke as BattleView,xe as DEV_MODE};