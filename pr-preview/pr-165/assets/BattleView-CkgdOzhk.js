import{Fn as e,Hn as t,In as n,Pn as r,Qa as i,Un as a,Vn as o,Xn as s,at as c,ei as l,er as u,gr as d,mr as f,sa as p,ut as m}from"./sound-Cwpz6VLM.js";import{F as h,It as g,L as _,M as v,N as y,U as b,ct as x}from"./ItemTooltip-_Z_WPXk9.js";import{_ as S,a as C,c as w,f as T,g as E,l as D,m as O,n as k,p as A,u as j,v as M,y as N}from"./pixi-NxSCIoZv.js";import{J as P,S as ee,_ as te,a as F,g as ne,h as re,s as I,t as L,v as R,x as ie,y as z}from"./index-COkPTxHG.js";import{n as ae,r as oe}from"./pixiPacing-Ch89od2c.js";import{t as se}from"./ArenaScene-D0m2eryD.js";import{a as B,n as V,r as H}from"./themeColors-D6OqOpGI.js";var U=i(),W=`
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
`,G=`
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
`,K=`
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
`,ce=`
precision mediump float;
varying vec2 vUV;
${K}
${G}
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
`,q=`
precision mediump float;
varying vec2 vUV;
uniform float uAspect;
uniform float uNotch;
${K}
${G}
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
`,le=`/Emberheir/pr-preview/pr-165/assets/hud-enemy-plate-Bv4CT3zO.webp`,J=`/Emberheir/pr-preview/pr-165/assets/hud-orb-ring-1uKXiEiW.webp`,Y={x:270,y:256,r:150},X={side:112,top:32,bottom:32},ue=null;function de(){return ue??=Promise.all([J,le].map(e=>A.load(e))).then(([e,t])=>e&&t?{ring:e,plate:t}:null,()=>null),ue}function fe(e,t){let n=new M(e.ring),r=(t+3)/Y.r;return n.scale.set(r),n.position.set(-Y.x*r,-Y.y*r),n}function pe(e,t,n,r,i){let a=e.plate.height-X.top-X.bottom,o=(i-2)/a,s=new k({texture:e.plate,leftWidth:X.side,rightWidth:X.side,topHeight:X.top,bottomHeight:X.bottom});return s.width=r/o+X.side*2-40,s.height=e.plate.height,s.scale.set(o),s.position.set(t-(X.side-20)*o,n+1-X.top*o),s}var Z=e=>[(e>>16&255)/255,(e>>8&255)/255,(e&255)/255],me={deep:Z(3015173),bright:Z(13637150),light:Z(16743012)},he={deep:Z(4853763),bright:Z(16738834),light:Z(16766842)},ge={deep:Z(2753286),bright:Z(12063770),light:Z(16747098)},Q=(e,t,n,r)=>e+(t-e)*(1-Math.exp(-n*r)),_e=class{renderer;view;mesh;target;u;fill=1;shield=0;threshold=-1;ready=0;low=0;stun=0;shown={fill:1,trail:1,shield:0,low:0,stun:0,ready:0};trailHold=0;slosh=0;flash=0;glow=0;constructor(e,t,n,r,i,a=!1){this.renderer=e;let o=new D({positions:new Float32Array([0,0,n,0,n,r,0,r]),uvs:new Float32Array([0,0,1,0,1,1,0,1]),indices:new Uint32Array([0,1,2,0,2,3])});this.u=new S({uTime:{value:0,type:`f32`},uFill:{value:1,type:`f32`},uTrail:{value:1,type:`f32`},uShield:{value:0,type:`f32`},uSlosh:{value:0,type:`f32`},uFlash:{value:0,type:`f32`},uGlow:{value:0,type:`f32`},uLow:{value:0,type:`f32`},uThreshold:{value:-1,type:`f32`},uReady:{value:0,type:`f32`},uStun:{value:0,type:`f32`},uDeep:{value:new Float32Array(i.deep),type:`vec3<f32>`},uBright:{value:new Float32Array(i.bright),type:`vec3<f32>`},uLight:{value:new Float32Array(i.light),type:`vec3<f32>`},uAspect:{value:n/r,type:`f32`},uNotch:{value:+!!a,type:`f32`}});let s=E.from({gl:{vertex:W,fragment:t===`orb`?ce:q},resources:{gauge:this.u}});this.mesh=new w({geometry:o,shader:s}),this.target=C.create({width:n,height:r,resolution:Math.min(1.5,e.resolution),antialias:!1}),this.view=new M(this.target)}set(e,t){let n=Math.max(0,Math.min(1,e));if(n<this.fill-.004){let e=this.fill-n;this.slosh=Math.min(1,this.slosh+e*6),this.flash=Math.min(1,this.flash+.25+e*3),this.trailHold=.45}else n>this.fill+.004&&(this.glow=Math.min(1,this.glow+.6),this.slosh=Math.min(1,this.slosh+.2));this.fill=n,this.shield=Math.max(0,Math.min(1,t))}snap(){this.shown.fill=this.fill,this.shown.trail=this.fill,this.shown.shield=this.shield}update(e,t){let n=this.shown;n.fill=Q(n.fill,this.fill,14,t),this.trailHold>0?this.trailHold-=t:n.trail=Q(n.trail,n.fill,3.2,t),n.trail<n.fill&&(n.trail=n.fill),n.shield=Q(n.shield,this.shield,8,t),n.low=Q(n.low,this.low,4,t),n.stun=Q(n.stun,this.stun,10,t),n.ready=Q(n.ready,this.ready,10,t),this.slosh=Math.max(0,this.slosh-t*.9),this.flash=Math.max(0,this.flash-t*3.5),this.glow=Math.max(0,this.glow-t*1.6);let r=this.u.uniforms;r.uTime=e,r.uFill=n.fill,r.uTrail=n.trail,r.uShield=n.shield,r.uSlosh=this.slosh,r.uFlash=this.flash,r.uGlow=this.glow,r.uLow=n.low,r.uThreshold=this.threshold,r.uReady=n.ready,r.uStun=n.stun,this.renderer.render({container:this.mesh,target:this.target,clear:!0})}destroy(){this.mesh.destroy(),this.target.destroy(!0)}get level(){return this.shown.fill}},ve=class{kind;root=new N;gauge;fx;glow=new j;frame;spawn=0;constructor(e,t){this.kind=t;let n=t===`life`?me:he,r=t===`life`?16726586:16753978,i=new j().circle(0,6,106).fill({color:0,alpha:.7});i.filters=[new T({strength:14,quality:3})],this.glow.circle(0,0,84*1.55).fill(new O({type:`radial`,center:{x:.5,y:.5},innerRadius:0,outerCenter:{x:.5,y:.5},outerRadius:.5,colorStops:[{offset:.45,color:`rgba(${n.bright.map(e=>Math.round(e*255)).join(`,`)},0.55)`},{offset:1,color:`rgba(0,0,0,0)`}],textureSpace:`local`})),this.glow.blendMode=`add`,this.glow.alpha=0,this.gauge=new _e(e.renderer,`orb`,168,168,n),this.gauge.view.position.set(-84,-84),this.fx=new L(e.renderer);let a=new N,o=new j().circle(0,0,82).fill(16777215);a.addChild(this.fx.back,this.fx.front,o),a.mask=o,this.frame=ye(84,r);let s={resolution:e.renderer.resolution,antialias:!0};i.cacheAsTexture(s),this.frame.cacheAsTexture(s),this.root.addChild(i,this.glow,this.gauge.view,a,this.frame)}paint(e){this.frame.visible=!1,this.root.addChild(fe(e,84))}update(e,t,n){this.gauge.update(e,t),this.glow.alpha=Q(this.glow.alpha,n,3,t);let r=this.gauge.level,i=84-168*r;for(this.spawn+=t*(this.kind===`heat`?6+26*r:3+7*r);this.spawn>=1&&r>.02;){--this.spawn;let e=this.fx.rand,t=e.range(Math.max(i+6,-76),74),n=Math.sqrt(Math.max(0,7056-t*t))-8;this.fx.burst(this.kind===`heat`?{x:e.range(-n,n),y:t,count:1,color:[16765562,16747050,16758858],angle:[-Math.PI/2-.35,-Math.PI/2+.35],speed:[25,70],life:[.5,1.2],size:[5,11],wobble:6}:{x:e.range(-n,n),y:t,count:1,color:[16751242,16762040],angle:[-Math.PI/2-.1,-Math.PI/2+.1],speed:[14,34],life:[.8,1.6],size:[4,8],endSize:.9,alpha:.45,wobble:4})}this.fx.update(t)}puff(e,t,n=!0){let r=84-168*this.gauge.level;this.fx.burst({x:0,y:Math.max(-64,r),count:t,color:e,spreadX:50.4,spreadY:10,angle:n?[-Math.PI/2-.8,-Math.PI/2+.8]:[0,Math.PI*2],speed:[40,140],life:[.35,.8],size:[6,14],drag:.3})}};function ye(e,t){let n=new N,r=new O({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`#f0c77a`},{offset:.35,color:`#a8732e`},{offset:.7,color:`#5e3a16`},{offset:1,color:`#2a180a`}],textureSpace:`local`}),i=new j().circle(0,0,e+15).fill(r).circle(0,0,e).cut().circle(0,0,e+15).stroke({color:1313798,width:3}).circle(0,0,e+1).stroke({color:1313798,width:3}).circle(0,0,e+8).stroke({color:16769960,width:1.2,alpha:.35});for(let t=0;t<12;t++){let n=t/12*Math.PI*2+Math.PI/12,r=Math.cos(n)*(e+8),a=Math.sin(n)*(e+8);i.circle(r,a,3.2).fill(2758666).circle(r-.8,a-.8,1.6).fill(16769184)}let a=-e-12;i.poly([-34,a+8,-20,a-14,-8,a+2,0,a-24,8,a+2,20,a-14,34,a+8]).fill(r).stroke({color:1313798,width:2.5}),i.circle(0,a-2,10).fill(1313798),i.circle(0,a-2,7.5).fill(t),i.circle(-2.5,a-4.5,2.5).fill({color:16777215,alpha:.75});let o=new j().circle(0,a-2,16).fill({color:t,alpha:.35});return o.blendMode=`add`,n.addChild(i,o),n}var be=class{app=null;destroyed=!1;layoutInfo=z(1600,900);root=new N;bar=new N;enemyPlate=new N;life=null;heat=null;enemy=null;art=null;time=0;hot=0;last=null;prevHero=null;unwatchTheme=null;paused=!1;layout(e,t){this.layoutInfo=z(e,t),this.app&&this.place()}attach(e,t,n){this.destroyed||(this.app=e,this.life=new ve(e,`life`),this.heat=new ve(e,`heat`),this.enemy=new _e(e.renderer,`bar`,R.w,R.h,ge,n),this.root.addChild(this.enemyPlate,this.bar,this.life.root,this.heat.root),t.addChild(this.root),this.place(),this.last&&this.onSnapshot(this.last,!0),e.ticker.add(this.onTick),this.unwatchTheme=B(()=>{this.app&&!this.destroyed&&this.place()}),de().then(e=>{!this.destroyed&&e&&(this.art=e,this.life?.paint(e),this.heat?.paint(e),this.place())}))}destroy(){this.destroyed=!0,this.app?.ticker?.remove(this.onTick),this.unwatchTheme?.(),this.life?.fx.destroy(),this.heat?.fx.destroy(),this.life?.gauge.destroy(),this.heat?.gauge.destroy(),this.enemy?.destroy(),this.root.destroy({children:!0}),this.app=null}onTick=e=>this.tick(e.deltaMS/1e3);place(){let e=this.layoutInfo,{w:t,h:n,cx:r}=e;this.life?.root.position.set(e.lifeOrb.x,e.lifeOrb.y),this.heat?.root.position.set(e.heatOrb.x,e.heatOrb.y);let i=H(`--hud-bar-top`,`#32271d`),a=H(`--hud-bar-bottom`,`#0c0a08`),o=H(`--hud-fade`,`rgba(0,0,0,0.55)`),s=H(`--hud-glass`,`#0e0b09`),c=V(`--hud-glass-alpha`,.72),l=H(`--edge`,`#6a4a2c`);this.bar.removeChildren().forEach(e=>e.destroy());let u=n-104,d=e.lifeOrb.x,f=e.heatOrb.x,p=new j().rect(0,u-70,t,70).fill(new O({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:`rgba(0,0,0,0)`},{offset:1,color:o}],textureSpace:`local`})),m=new O({type:`linear`,start:{x:0,y:0},end:{x:0,y:1},colorStops:[{offset:0,color:i},{offset:1,color:a}],textureSpace:`local`}),h=new j,g=e.plateHalf;h.poly([d,u,r-g-40,u,r-g,u-22,r+g,u-22,r+g+40,u,f,u,f,n,d,n]).fill(m).stroke({color:l,width:4,alignment:1}),h.poly([d,u+3,r-g-39,u+3,r-g+1,u-22+3,r+g-1,u-22+3,r+g+39,u+3,f,u+3],!1).stroke({color:14263642,width:1.5,alpha:.55});for(let e=d+120;e<f-110;e+=90)e>r-g-50&&e<r+g+50||h.circle(e,u+12,3).fill(1708554).circle(e-.7,u+11.3,1.4).fill(14263642);this.bar.addChild(p,h);let _={resolution:this.app?.renderer.resolution??1,antialias:!0};this.bar.cacheAsTexture(_),this.bar.updateCacheTexture(),this.enemyPlate.removeChildren().forEach(e=>e!==this.enemy?.view&&e.destroy());let v=r-320,y=new j().roundRect(v,70,640,124,10).fill({color:s,alpha:c}).stroke({color:l,width:2}).roundRect(v+4,74,632,116,7).stroke({color:14263642,width:1,alpha:.3}),b=e.enemyLife,x=this.art?pe(this.art,b.x,b.y,b.w,b.h):new j().roundRect(b.x-4,b.y-4,b.w+8,b.h+8,6).fill(1313798).stroke({color:12159562,width:2});this.enemyPlate.addChild(y,x),this.enemy&&(this.enemy.view.position.set(b.x,b.y),this.enemyPlate.addChild(this.enemy.view))}onSnapshot(e,t=!1){if(this.last=e,!this.life||!this.heat||!this.enemy)return;let n=e.hero,r=this.prevHero;this.life.gauge.set(n.life/n.maxLife,n.barrier/n.maxLife),this.life.gauge.low=+(n.life/n.maxLife<.3&&!e.over),this.heat.gauge.set(n.heat/n.maxHeat,0);let i=n.rotation[n.nextSlot];this.heat.gauge.threshold=i?i.threshold/n.maxHeat:-1;let a=i!==void 0&&n.heat>=i.threshold;this.heat.gauge.ready=+!!a,this.hot=.25+.5*(n.heat/n.maxHeat)+(a?.35:0),r&&!t&&this.effects(r,n),this.prevHero=n;let o=e.enemy;this.enemy.set(o.life/o.maxLife,o.barrier/o.maxLife),this.enemy.stun=+(o.stunned>0),t&&(this.life.gauge.snap(),this.heat.gauge.snap(),this.enemy.snap())}effects(e,t){this.life&&this.heat&&(t.life>e.life+.5&&this.life.puff([5234826,11075528],16),t.barrier>e.barrier+t.maxLife*.02&&this.life.puff([10477823,16777215],20,!1),t.heat<e.heat-8&&this.heat.puff([16765562,16747050,16777215],26))}tick(e){this.paused&&(e=0),this.time+=e,this.life?.update(this.time,e,.25),this.heat?.update(this.time,e,this.hot),this.enemy?.update(this.time,e)}},$=m(),xe=P(`dev`),Se=[1,4,16],Ce=30,we={cooling:`Cooling Heat`,steady:`Steady Heat`,warming:`Warming Heat`,smoldering:`Smoldering Heat`},Te=[`#5a1d08`,`#080404`];function Ee(e){let t=g.find(t=>t.id===(e.encounter?.echo??e.actId))?.arenaGradient??(d(x,e.actId)?Te:void 0);return t?{background:`linear-gradient(180deg, ${t[0]} 0%, ${t[1]} 100%)`}:void 0}function De(n,i){let s=i.encounter,c=f(x,i.actId),l=s?e(s,c,x):void 0,u=s?.echo?f(x,s.echo):void 0,p=I(n.hero.classId,n.hero.weaponId,n.hero.equipment,F(n)),m=t(n,x).weapon,h=s?r(s,x).map(({name:e,description:t})=>({name:e,description:t})):[],g={...l?{id:l.id}:{},archetype:l?.archetype??`brute`,boss:s?.boss??!1,elite:h.length>0,act:(u??c).number,ranged:l?.weapon.range===`ranged`,...s?.thief?{thief:!0}:{},...s?.gate?{gate:!0}:{},...s?.champion?{champion:!0}:{},...i.wildfire?{wildfire:i.wildfire}:{},...s?{levelGap:s.level-n.hero.level}:{}},v={name:o(n,x),sub:`${a(n,x)} · ${we[m.heatBehavior]}`,icon:`user`},y=l?.name??`Enemy`;return{act:c,heroLook:p,enemyLook:g,heroInfo:v,enemyInfo:{name:u?`Echo of ${l?.name??``}`:y,sub:`${u?`Warden Echo`:d(x,c.id)?`Last Flame`:s?.boss?`Act Boss`:_[b(l?.archetype)]} · ${l?.description??``}`,typeIcon:u?`echo`:b(l?.archetype),...s?.boss?{tag:`BOSS`}:s?.gate?{tag:`GATEKEEPER`}:s?.champion?{tag:`CHAMPION`}:h.length?{tag:`ELITE`}:{},mods:h},enemyAttackIcon:g.ranged?l?.archetype===`caster`?`bolt`:`bow`:`strike`}}function Oe(e){let[t,n]=(0,U.useState)(``);return(0,U.useEffect)(()=>{let t=0,r=performance.now(),i=0,a=()=>{t+=1,i=requestAnimationFrame(a)};i=requestAnimationFrame(a);let o=window.setInterval(()=>{let i=performance.now(),a=t*1e3/(i-r);t=0,r=i;let o=e.scene.current?.stats;n(`${a.toFixed(0)} FPS · ${o?.particles??0} particles · ${o?.floaters??0} texts`)},500);return()=>{cancelAnimationFrame(i),window.clearInterval(o)}},[e.scene]),(0,$.jsx)(`span`,{className:`dev-meter mono`,"data-testid":`dev-meter`,children:t})}var ke=()=>window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0;function Ae(e){let{state:t,run:r,game:i,settings:a}=e,o=De(t,r),[f]=(0,U.useState)(()=>n(t,x)),[m,g]=(0,U.useState)(()=>f.snapshot()),[_,b]=(0,U.useState)(null),[S,C]=(0,U.useState)(1),[w,T]=(0,U.useState)(()=>new Set),E=(0,U.useRef)(null),D=c(),O=D.w,k=D.h,A=oe(D.scale,ae[a.graphicsQuality].maxResolution),j=(0,U.useRef)(null),M=(0,U.useRef)(null),N=(0,U.useRef)(e.paused),P=(0,U.useRef)(S);(0,U.useEffect)(()=>{N.current=e.paused,E.current&&(E.current.paused=e.paused),M.current&&(M.current.paused=e.paused)},[e.paused]),(0,U.useEffect)(()=>{P.current=S,E.current&&(E.current.speed=S)},[S]),(0,U.useEffect)(()=>{let e=j.current;if(!e)return;let t=new se;t.sound=!0,t.showNumbers=a.damageNumbers,t.motion=a.screenShake&&!ke(),t.quality=a.graphicsQuality,t.layout(O,k,A,1,104),E.current=t;let n=new be;return n.layout(O,k),n.onSnapshot(f.snapshot(),!0),M.current=n,t.mount(e,o.heroLook,o.enemyLook).then(e=>{e&&n.attach(e,t.overlay,r.encounter?.boss===!0)}),()=>{n.destroy(),t.destroy(),E.current=null,M.current=null}},[]),(0,U.useEffect)(()=>{E.current?.layout(O,k,A,1,104)},[O,k,A]),(0,U.useEffect)(()=>{M.current?.layout(D.w,D.h)},[D.w,D.h]);let F=r.encounter?.boss===!0,I=(0,U.useRef)(1);(0,U.useEffect)(()=>{let e=0,t=performance.now(),n=-1/0,r=n=>{let a=Math.min(.25,(n-t)/1e3)*P.current*I.current;t=n,!N.current&&!E.current?.frozen&&i(f.advance(a),n),f.over||(e=requestAnimationFrame(r))},i=(e,t)=>{let r=f.snapshot();E.current?.onEvents(e),E.current?.onSnapshot(r),M.current?.onSnapshot(r);let i=[...e].reverse().find(e=>e.type===`skill`&&e.side===`hero`);if(i?.type===`skill`){let e=i.via===`reaction`,t=(e?r.hero.reactions:r.hero.rotation).findIndex(e=>e.name===i.skill),n=e?10+t:t;t>=0&&b(e=>({slot:n,n:(e?.n??0)+1}))}let a=e.flatMap(e=>e.type===`trigger`&&e.side===`hero`?[e.name]:[]);a.length&&T(new Set(a)),F&&(I.current=r.enemy.life/r.enemy.maxLife<.08?.35:1),(r.over||t-n>=1e3/Ce-1)&&(n=t,g(r))};return e=requestAnimationFrame(r),()=>cancelAnimationFrame(e)},[f,F]),(0,U.useEffect)(()=>{if(!w.size)return;let e=window.setTimeout(()=>T(new Set),450);return()=>window.clearTimeout(e)},[w]);let L=r.encounter,R=!!L&&!L.echo&&!d(x,r.actId),z=m.over&&m.winner===`hero`,B=R&&L?v(t,L.enemyId):void 0,V=B&&L&&z?v(t,L.enemyId,l({elite:L.eliteModifiers.length>0&&!L.boss,champion:L.champion===!0,boss:L.boss},L.hunt===!0)):B,H=B&&V&&V.tier>B.tier?V.tier:0,W=m.over;(0,U.useEffect)(()=>{if(!W)return;let e=window.setTimeout(()=>i.dispatch({type:`resolveFight`}),F&&m.winner===`hero`?2400:1600);return()=>window.clearTimeout(e)},[W,i,F,m.winner]);let G=()=>{E.current?.onEvents(f.finish()),M.current?.onSnapshot(f.snapshot(),!0),g(f.snapshot())},K=m.hero,ce=m.enemy,q=W?m.winner===`hero`?`VICTORY`:m.winner===`enemy`?`DEFEAT`:m.fled===`enemy`?`ESCAPED`:`DRAW`:null,le=r.encounter?.thief?Math.max(0,Math.ceil(p.thiefFleeSeconds-m.time)):null,J=s(t,x),Y=Math.max(u(t,x)-+!!J,t.flaskCharges);return(0,$.jsxs)(`section`,{className:`screen battle`,"aria-label":`Battle`,style:Ee(r),children:[(0,$.jsx)(`div`,{className:`arena-host`,ref:j}),(0,$.jsx)(ie,{act:o.act,stage:r.stage,cleared:!1,attributePoints:t.hero.unspentAttributePoints,skillPoints:t.hero.unspentSkillPoints,waymarks:t.progress.waymarks,prestige:t.legacy.prestige,...r.wildfire?{wildfire:r.wildfire}:{},onCharacter:e.onCharacter,onTree:e.onTree,onMenu:e.onMenu}),(0,$.jsx)(re,{enemy:ce,name:o.enemyInfo.name,sub:o.enemyInfo.sub,typeIcon:o.enemyInfo.typeIcon??`brute`,...o.enemyInfo.tag?{tag:o.enemyInfo.tag}:{},mods:o.enemyInfo.mods??[],attackIcon:o.enemyAttackIcon,thiefLeft:W?null:le,heroLevel:t.hero.level,...V?{hunt:V}:{}}),q&&(0,$.jsxs)(`div`,{className:`fight-banner ${q.toLowerCase()}${F&&m.winner===`hero`?` boss-kill`:``}`,"data-testid":`fight-result`,children:[q,H>0&&(0,$.jsx)(`span`,{className:`trail-banner title-font`,"data-testid":`trail-banner`,children:y(H)})]}),e.paused&&!q&&(0,$.jsx)(`div`,{className:`paused-tag`,"aria-live":`polite`,children:`Fight paused`}),xe&&!q&&(0,$.jsxs)(`div`,{className:`dev-tools`,children:[(0,$.jsx)(Oe,{scene:E}),Se.map(e=>(0,$.jsxs)(`button`,{type:`button`,className:S===e?`active`:``,onClick:()=>C(e),children:[e,`×`]},e)),(0,$.jsx)(`button`,{type:`button`,onClick:G,children:`Skip fight`})]}),(0,$.jsx)(ne,{hero:K,heroTitle:o.heroInfo.name,weaponIcon:te[o.heroLook.weapon]??`strike`,weaponId:o.heroLook.weapon,flaskCharges:t.flaskCharges,flaskMax:Y,draught:J,flash:_,stageW:D.w,stageH:D.h,boons:(0,$.jsx)(ee,{state:t,flash:w,className:`battle-boons`}),right:(0,$.jsxs)(`button`,{type:`button`,className:`btn hud-retreat`,disabled:W,"aria-label":`Retreat to Camp`,title:`Retreat to Camp`,onClick:()=>i.dispatch({type:`retreat`}),children:[(0,$.jsx)(h,{name:`retreat`,size:18}),`Retreat`]})})]})}export{Ae as BattleView,xe as DEV_MODE,Ee as arenaStyle};