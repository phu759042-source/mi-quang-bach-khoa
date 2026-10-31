// ---------- WebGL ----------
const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
if (!gl) throw new Error('Không có WebGL2');
gl.getExtension('EXT_color_buffer_float');
const ANI = gl.getExtension('EXT_texture_filter_anisotropic');
const DBI = gl.getExtension('OES_draw_buffers_indexed');
const SHUT = 0.7 / 60;   // màn trập: 0,7 khung

function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src); return s }
function prog(vs, fs) {
  const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aP'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name) }
  return { p, u };
}
const HEAD = `#version 300 es
precision highp float;
`;
const COMMON = `uniform float uFocus;
float cocOf(float d){ float c = d < uFocus ? -75.0*(uFocus-d)/d : 6.0*(d-uFocus)/d; return clamp(c,-120.0,120.0); }
float sdRR(vec2 p, vec2 b, float r){ r = min(r, min(b.x,b.y)); vec2 q = abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
float erf_(float x){ float s = sign(x); x = abs(x); float a = 0.147, x2 = x*x; return s*sqrt(1.0 - exp(-x2*(1.27324 + a*x2)/(1.0 + a*x2))); }
vec2 scr(vec4 c){ return vec2(720.0 + 720.0*c.x/c.w, 576.0 - 576.0*c.y/c.w); }
`;
const VS_FULL = HEAD + `layout(location=0) in vec2 aP; void main(){ gl_Position = vec4(aP*2.0-1.0, 0.0, 1.0); }`;

// sàn + tờ trang: một lượt toàn màn hình, tia từ camera cắt mặt phẳng z = 0
const FS_BASE = HEAD + COMMON + `uniform vec3 uCam; uniform vec3 uFwd; uniform vec3 uUp; uniform mat4 uVP0; uniform mat4 uVP1;
uniform sampler2D uT0; uniform sampler2D uT1; uniform float uSplit; uniform float uPH;
uniform vec4 uMask; uniform vec2 uFade; uniform vec3 uHaze; uniform vec4 uPS;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
void main(){
  vec2 sp = vec2(gl_FragCoord.x, 1152.0 - gl_FragCoord.y);
  vec3 dir = uFwd + vec3(1.0,0.0,0.0)*(sp.x-720.0)/1880.0 + uUp*(576.0-sp.y)/1880.0;
  float tt = -uCam.z/min(dir.z, -1e-4);
  vec2 P = uCam.xy + tt*dir.xy;
  float sd = sdRR(P - vec2(720.0, uMask.x*0.5), vec2(720.0, uMask.x*0.5), uMask.y);
  vec2 dx = dFdx(P), dy = dFdy(P);
  float aa = max(length(vec2(dx.x, dy.x)) + length(vec2(dx.y, dy.y)), 1e-3)*0.5;
  float m = clamp(0.5 - sd/aa, 0.0, 1.0);
  float below = smoothstep(uMask.z-2.0, uMask.z+2.0, P.y);
  m *= 1.0 - uFade.y*below;
  vec3 col = vec3(0.0);
  if (m < 1.0) {
    vec2 q = (gl_FragCoord.xy-vec2(720.0,576.0))/vec2(720.0,576.0);
    col = mix(vec3(0.976,0.984,0.984), vec3(0.949,0.953,0.965), smoothstep(0.0,1.0,clamp(length(q)/1.41421,0.0,1.0)));
    float hh = uPS.x*0.5; float sdS = sdRR(P - vec2(720.0, hh + 22.0), vec2(720.0, hh), uPS.y);
    // bóng của tờ trang mờ theo phần trang đang tan (khi lặn vào hero)
    float belowS = smoothstep(uMask.z + 20.0, uMask.z + 160.0, P.y);
    if (sdS < 3.0*uPS.z) col = mix(col, vec3(0.102,0.129,0.2), uPS.w*0.5*(1.0 - erf_(sdS/(1.41421*uPS.z)))*(1.0 - max(uFade.x*0.85, uFade.y)*belowS));
  }
  if (m > 0.0) {
    vec3 pc;
    if (P.y < uSplit) { vec2 sc = vec2(1.0/1440.0, 1.0/uSplit); pc = textureGrad(uT0, P*sc, dx*sc, dy*sc).rgb; }
    else { vec2 sc = vec2(1.0/1440.0, 1.0/(uPH-uSplit)); pc = textureGrad(uT1, (P-vec2(0.0,uSplit))*sc, dx*sc, dy*sc).rgb; }
    pc = mix(pc, uHaze, uFade.x*below);
    col = mix(col, pc, m);
  }
  vec4 w = vec4(P, 0.0, 1.0);
  vec2 vel = scr(uVP1*w) - scr(uVP0*w);
  o0 = vec4(col, 1.0); o1 = vec4(cocOf(tt), 0.0, 0.0, 1.0); o2 = vec4(vel, 0.0, 1.0); }`;

// mảnh nổi / ô logo: tấm phẳng dựng đứng quanh trục giữa, có vận tốc từ trạng thái lúc t-Δ và t+Δ
const VS_PIECE = HEAD + `layout(location=0) in vec2 aP;
uniform mat4 uVP; uniform mat4 uVP0; uniform mat4 uVP1; uniform vec3 uCam; uniform vec3 uFwd; uniform vec2 uHalf; uniform float uExt;
uniform vec4 uS;  uniform vec2 uSR;    // trạng thái lúc t:   (cx,cy,cz,góc), (cỡ, xoay)
uniform vec4 uS0; uniform vec2 uSR0;   // lúc t - Δ
uniform vec4 uS1; uniform vec2 uSR1;   // lúc t + Δ
out vec2 vUV; out float vDepth; out vec4 vC0; out vec4 vC1;
vec3 place(vec4 s, vec2 sr){ vec2 l = (aP-0.5)*2.0*uHalf*sr.x;
  float cr = cos(sr.y), sn = sin(sr.y); l = vec2(cr*l.x - sn*l.y, sn*l.x + cr*l.y);
  float ca = cos(s.w), sa = sin(s.w); vec3 n = vec3(0.0, sa, ca);
  return s.xyz + vec3(l.x, l.y*ca, -l.y*sa) - n*uExt; }
void main(){ vec3 w = place(uS, uSR);
  vUV = aP; vDepth = dot(w-uCam, uFwd);
  vC0 = uVP0*vec4(place(uS0, uSR0), 1.0); vC1 = uVP1*vec4(place(uS1, uSR1), 1.0);
  gl_Position = uVP*vec4(w,1.0); }`;
const FS_PIECE = HEAD + COMMON + `in vec2 vUV; in float vDepth; in vec4 vC0; in vec4 vC1;
uniform sampler2D uTex; uniform vec4 uTint; uniform float uOp; uniform float uHazeAmt; uniform vec3 uHaze;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
void main(){ vec4 c = texture(uTex, vUV);
  vec3 rgb = mix(c.rgb, uTint.rgb*c.a, uTint.a);
  rgb = mix(rgb, uHaze*c.a, uHazeAmt);
  float a = c.a*uOp; rgb *= uOp;
  vec2 vel = scr(vC1) - scr(vC0);
  o0 = vec4(rgb, a); o1 = vec4(cocOf(vDepth)*a, 0.0, 0.0, a); o2 = vec4(vel*a, 0.0, a); }`;

// bóng mềm trên mặt phẳng z = 0 (chỉ ghi màu)
const VS_SHADOW = HEAD + `layout(location=0) in vec2 aP; uniform mat4 uVP; uniform vec4 uRect; out vec2 vPage;
void main(){ vec2 p = uRect.xy + aP*uRect.zw; vPage = p; gl_Position = uVP*vec4(p, 0.0, 1.0); }`;
const FS_SHADOW = HEAD + COMMON + `in vec2 vPage;
uniform vec2 uSC; uniform vec2 uSH; uniform float uSR; uniform float uSig; uniform float uSOp;
layout(location=0) out vec4 o0; layout(location=1) out vec4 o1; layout(location=2) out vec4 o2;
void main(){ float a = uSOp*0.5*(1.0 - erf_(sdRR(vPage-uSC, uSH, uSR)/(1.41421*uSig)));
  o0 = vec4(vec3(0.102,0.129,0.2)*a, a); o1 = vec4(0.0); o2 = vec4(0.0); }`;

// gộp màu + CoC vào một ảnh
const FS_PACK = HEAD + `uniform sampler2D uS0; uniform sampler2D uS1; out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); o = vec4(texelFetch(uS0, p, 0).rgb, texelFetch(uS1, p, 0).r); }`;
// nhoè chuyển động: lấy N mẫu dọc vận tốc của điểm ảnh trong 0,7 khung
const FS_MB = HEAD + `uniform sampler2D uC; uniform sampler2D uV; uniform int uN; out vec4 o;
void main(){ vec2 px = gl_FragCoord.xy; vec2 res = vec2(1440.0,1152.0);
  vec4 v4 = texelFetch(uV, ivec2(px), 0); vec2 v = v4.xy/max(v4.w, 1e-3); v.y = -v.y;   // màn hình (y xuống) → texture (y lên)
  float L = length(v);
  if (L < 0.5) { o = texelFetch(uC, ivec2(px), 0); return; }
  vec4 acc = vec4(0.0); float fn = float(uN);
  for (int i=0;i<48;i++){ if (i >= uN) break;
    acc += texture(uC, (px + v*((float(i)+0.5)/fn - 0.5))/res); }
  o = acc/fn; }`;
const FS_HALF = HEAD + `uniform sampler2D uAcc; out vec4 o;
void main(){ ivec2 b = ivec2(gl_FragCoord.xy)*2;
  vec4 c = 0.25*(texelFetch(uAcc, b, 0) + texelFetch(uAcc, b+ivec2(1,0), 0) + texelFetch(uAcc, b+ivec2(0,1), 0) + texelFetch(uAcc, b+ivec2(1,1), 0));
  o = vec4(c.rgb, clamp(c.a/240.0 + 0.5, 0.0, 1.0)); }`;
const FS_NEARTILE = HEAD + `uniform sampler2D uAcc; out vec4 o;
void main(){ ivec2 b = ivec2(gl_FragCoord.xy)*8; float m = 0.0;
  for(int j=0;j<8;j++) for(int i=0;i<8;i++){ float c = texelFetch(uAcc, min(b+ivec2(i,j), ivec2(1439,1151)), 0).a; m = max(m, -c); }
  o = vec4(m,0.0,0.0,1.0); }`;
const FS_DIL = HEAD + `uniform sampler2D uIn; uniform ivec2 uDir; out vec4 o;
void main(){ ivec2 p = ivec2(gl_FragCoord.xy); ivec2 sz = textureSize(uIn, 0); float m = 0.0;
  for(int k=-16;k<=16;k++){ ivec2 q = clamp(p + uDir*k, ivec2(0), sz-1); float r = texelFetch(uIn, q, 0).r;
    float reach = max(0.0, float(abs(k))*8.0 - 8.0); if(r >= reach) m = max(m, r); }
  o = vec4(m,0.0,0.0,1.0); }`;
// độ sâu trường ảnh: gom 40 mẫu trên đĩa góc vàng ở nửa độ phân giải, mỗi mẫu đọc ở mức mip hợp với độ nhoè
const FS_DOF = HEAD + `uniform sampler2D uHalf; uniform sampler2D uNear; uniform vec2 uOff[40]; uniform int uTaps;
out vec4 o;
void main(){ vec2 px = gl_FragCoord.xy; vec2 res = vec2(720.0,576.0); vec2 uv = px/res;
  vec4 c0 = texelFetch(uHalf, ivec2(px), 0); float cc = (c0.a - 0.5)*120.0;
  float R = max(abs(cc), texture(uNear, uv).r*0.5);
  vec3 col = c0.rgb;
  if (R >= 0.6) {
    float fN = float(uTaps); float lod = max(0.0, log2(R*0.28) + 0.5);
    vec3 bs = c0.rgb; float bw = 1.0; vec3 fs = vec3(0.0); float fw = 0.0;
    for (int i=0;i<40;i++){ if (i >= uTaps) break;
      vec2 off = uOff[i]*R; float r = length(off);
      vec4 s = textureLod(uHalf, (px+off)/res, lod);
      float ci = (s.a - 0.5)*120.0, rI = abs(ci);
      float fg = clamp((cc - ci - 1.0), 0.0, 1.0);
      float wF = fg*clamp(rI - r + 1.0, 0.0, 1.0)*(R*R)/max(rI*rI, 0.25);
      float wB = (1.0-fg)*clamp(abs(cc) - r + 1.0, 0.0, 1.0);
      fs += s.rgb*wF; fw += wF; bs += s.rgb*wB; bw += wB; }
    float aF = clamp(fw/fN, 0.0, 1.0); vec3 bg = bs/bw; vec3 fgc = fw > 0.0 ? fs/fw : bg;
    col = mix(bg, fgc, aF);
  }
  o = vec4(col, 1.0); }`;
const FS_COMP = HEAD + `uniform sampler2D uAcc; uniform sampler2D uDof; uniform sampler2D uNear; uniform sampler2D uOver; uniform float uOverOn;
out vec4 o;
void main(){ vec2 px = gl_FragCoord.xy; vec2 uv = px/vec2(1440.0,1152.0);
  vec4 c0 = texelFetch(uAcc, ivec2(px), 0);
  float R = max(abs(c0.a), texture(uNear, uv).r);
  vec3 col = mix(c0.rgb, texture(uDof, uv).rgb, smoothstep(0.75, 2.5, R));
  vec4 ov = texture(uOver, vec2(uv.x, 1.0-uv.y))*uOverOn;
  col = col*(1.0-ov.a) + ov.rgb;
  float n = fract(sin(dot(px, vec2(12.9898,78.233)))*43758.5453) - 0.5;
  o = vec4(col + n/255.0, 1.0); }`;

let PG = {}, RT = {};
const quad = gl.createVertexArray();
function initGL() {
  PG.base = prog(VS_FULL, FS_BASE); PG.piece = prog(VS_PIECE, FS_PIECE); PG.shadow = prog(VS_SHADOW, FS_SHADOW);
  PG.pack = prog(VS_FULL, FS_PACK); PG.mb = prog(VS_FULL, FS_MB); PG.half = prog(VS_FULL, FS_HALF);
  PG.near = prog(VS_FULL, FS_NEARTILE); PG.dil = prog(VS_FULL, FS_DIL); PG.dof = prog(VS_FULL, FS_DOF); PG.comp = prog(VS_FULL, FS_COMP);
  const off = []; for (let i = 0; i < 40; i++) { const r = Math.sqrt((i + 0.5) / 40), th = (i + 0.5) * 2.39996323; off.push(Math.cos(th) * r, Math.sin(th) * r) }
  gl.useProgram(PG.dof.p); gl.uniform2fv(PG.dof.u.uOff, new Float32Array(off));
  gl.bindVertexArray(quad);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}
function rtTex(w, h, fmt, levels = 1, minf) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, levels, fmt, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minf || (levels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function fbo(texs) {
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
  gl.drawBuffers(texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
  const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('FBO ' + st);
  return f;
}
function initRT() {
  RT.s0 = rtTex(W, HT, gl.RGBA16F); RT.s1 = rtTex(W, HT, gl.RGBA16F); RT.s2 = rtTex(W, HT, gl.RGBA16F);
  RT.scene = fbo([RT.s0, RT.s1, RT.s2]);
  RT.comb = rtTex(W, HT, gl.RGBA16F); RT.combF = fbo([RT.comb]);
  RT.mb = rtTex(W, HT, gl.RGBA16F); RT.mbF = fbo([RT.mb]);
  RT.half = rtTex(720, 576, gl.RGBA8, 10, gl.LINEAR_MIPMAP_NEAREST); RT.halfF = fbo([RT.half]);
  RT.dof = rtTex(720, 576, gl.RGBA16F); RT.dofF = fbo([RT.dof]);
  RT.n0 = rtTex(180, 144, gl.RGBA16F); RT.n0F = fbo([RT.n0]);
  RT.n1 = rtTex(180, 144, gl.RGBA16F); RT.n1F = fbo([RT.n1]);
  RT.n2 = rtTex(180, 144, gl.RGBA16F); RT.n2F = fbo([RT.n2]);
  RT.over = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, RT.over);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, HT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}
function imgTex(img) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  if (ANI) gl.texParameterf(gl.TEXTURE_2D, ANI.TEXTURE_MAX_ANISOTROPY_EXT, 16);
  return t;
}
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('ảnh ' + src)); i.src = src });

// ---------- vẽ cảnh ở thời điểm t (một lần), kèm vận tốc màn hình trong khoảng màn trập ----------
let pageTex = [], tileTex = {};
function mat(cam) {
  const { R, U, F, C } = cam, n = 4, f = 1e6;
  const Vm = [R[0], U[0], -F[0], 0, R[1], U[1], -F[1], 0, R[2], U[2], -F[2], 0, -v3.dot(R, C), -v3.dot(U, C), v3.dot(F, C), 1];
  const P = [FOC / CX, 0, 0, 0, 0, FOC / CY, 0, 0, 0, 0, -(f + n) / (f - n), -1, 0, 0, -2 * f * n / (f - n), 0];
  const M = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + r] * Vm[c * 4 + k]; M[c * 4 + r] = s }
  return M;
}
let FR = null;   // khung đang vẽ: {cam, VP, VP0, VP1, focus}
function setCommon(pg) {
  const u = pg.u;
  if (u.uVP) gl.uniformMatrix4fv(u.uVP, false, FR.VP);
  if (u.uVP0) gl.uniformMatrix4fv(u.uVP0, false, FR.VP0);
  if (u.uVP1) gl.uniformMatrix4fv(u.uVP1, false, FR.VP1);
  if (u.uCam) gl.uniform3fv(u.uCam, FR.cam.C);
  if (u.uFwd) gl.uniform3fv(u.uFwd, FR.cam.F);
  if (u.uFocus) gl.uniform1f(u.uFocus, FR.focus);
  if (u.uHaze) gl.uniform3fv(u.uHaze, HAZE);
}
function onScreen(cam, c, rad) {
  const p = project(cam, c); if (p[2] < 20) return false;
  const r = rad * FOC / p[2] + 140;
  return p[0] > -r && p[0] < W + r && p[1] > -r && p[1] < HT + r;
}
function drawShadow(cx, cy, hw, hh, r, z, op) {
  if (op <= 0.002) return;
  const sig = 7 + 0.5 * z, ox = 0.10 * z, oy = 4 + 0.36 * z, m = sig * 2.6 + 4;   // bóng: dời (0,10z; 4+0,36z), nhoè 7+0,5z, 26%
  const u = PG.shadow.u;
  gl.uniform4f(u.uRect, cx + ox - hw - m, cy + oy - hh - m, 2 * (hw + m), 2 * (hh + m));
  gl.uniform2f(u.uSC, cx + ox, cy + oy); gl.uniform2f(u.uSH, hw, hh);
  gl.uniform1f(u.uSR, r); gl.uniform1f(u.uSig, sig); gl.uniform1f(u.uSOp, 0.26 * op);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
function drawObj(o) {
  const cam = FR.cam, { st, s0, s1, tex, hw, hh, pad, radius, edge } = o;
  if (!onScreen(cam, st.c, Math.hypot(hw, hh) * st.s)) return;
  const ca = Math.cos(st.a);
  // bóng
  gl.useProgram(PG.shadow.p); setCommon(PG.shadow);
  DBI.colorMaskiOES(1, false, false, false, false); DBI.colorMaskiOES(2, false, false, false, false);
  drawShadow(st.c[0], st.c[1], (hw - pad) * st.s, (hh - pad) * st.s * ca, radius * st.s, st.c[2], st.op * (1 - st.haze));
  DBI.colorMaskiOES(1, true, true, true, true); DBI.colorMaskiOES(2, true, true, true, true);
  // tấm
  gl.useProgram(PG.piece.p); setCommon(PG.piece);
  const u = PG.piece.u;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uTex, 0);
  gl.uniform2f(u.uHalf, hw, hh);
  gl.uniform4f(u.uS, st.c[0], st.c[1], st.c[2], st.a); gl.uniform2f(u.uSR, st.s, st.roll || 0);
  gl.uniform4f(u.uS0, s0.c[0], s0.c[1], s0.c[2], s0.a); gl.uniform2f(u.uSR0, s0.s, s0.roll || 0);
  gl.uniform4f(u.uS1, s1.c[0], s1.c[1], s1.c[2], s1.a); gl.uniform2f(u.uSR1, s1.s, s1.roll || 0);
  gl.uniform1f(u.uOp, st.op); gl.uniform1f(u.uHazeAmt, st.haze);
  const T = st.ext || 0;
  if (T > 0.5 && edge) {
    // độ dày: chồng nhiều lớp bóng hình lùi theo pháp tuyến, chỉ vẽ trong dải mép dưới (scissor)
    const sa = Math.sin(st.a), n3 = [0, sa, ca], sc = st.s, cr = Math.cos(st.roll || 0), sr = Math.sin(st.roll || 0);
    const pts = [];
    for (const [lx, ly] of [[-hw, hh], [hw, hh], [-hw, -hh], [hw, -hh]]) for (const e of [0, T]) {
      const x = (cr * lx - sr * ly) * sc, y = (sr * lx + cr * ly) * sc;
      pts.push(project(cam, v3.sub([st.c[0] + x, st.c[1] + y * ca, st.c[2] - y * sa], v3.mul(n3, e))));
    }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]) }
    const bottomY = Math.min(pts[0][1], pts[2][1]);
    const rpx = (radius + pad + 2) * sc * FOC / Math.max(50, pts[0][2]);
    const sy0 = Math.max(y0, bottomY - rpx - 4);
    const n = Math.max(8, Math.min(32, Math.ceil(T / 1.6)));
    const X0 = Math.floor(clamp(x0, 0, W)), X1 = Math.ceil(clamp(x1, 0, W)), Y0 = Math.floor(clamp(sy0, 0, HT)), Y1 = Math.ceil(clamp(y1, 0, HT));
    if (X1 > X0 && Y1 > Y0) {
      gl.enable(gl.SCISSOR_TEST); gl.scissor(X0, HT - Y1, X1 - X0, Y1 - Y0);
      for (let i = n; i >= 1; i--) {
        const f = i / n, shd = lerp(edge[3], edge[4], f);
        gl.uniform1f(u.uExt, T * f); gl.uniform4f(u.uTint, edge[0] * shd, edge[1] * shd, edge[2] * shd, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      gl.disable(gl.SCISSOR_TEST);
    }
  }
  gl.uniform1f(u.uExt, 0); gl.uniform4f(u.uTint, 0, 0, 0, 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
const fixOp = st => st.op < 1 ? { ...st, haze: Math.max(st.haze, 1 - st.op), op: Math.min(1, st.op * 1.6) } : st;
function renderScene(t) {
  const cam = camera(t), c0 = camera(t - SHUT / 2), c1 = camera(t + SHUT / 2);
  FR = { cam, VP: mat(cam), VP0: mat(c0), VP1: mat(c1), focus: focusAt(t) };
  gl.bindFramebuffer(gl.FRAMEBUFFER, RT.scene); gl.viewport(0, 0, W, HT);
  gl.bindVertexArray(quad);
  const mu = ss5(9.55, 9.97, t);
  const maskB = lerp(PH, HERO_B, mu), maskR = lerp(24, 38 / S_CARD, mu);
  // sàn + tờ trang (không blend)
  gl.disable(gl.BLEND);
  gl.useProgram(PG.base.p); setCommon(PG.base); const ub = PG.base.u;
  gl.uniform3fv(ub.uUp, cam.U);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pageTex[0].tex); gl.uniform1i(ub.uT0, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pageTex[1].tex); gl.uniform1i(ub.uT1, 1);
  gl.uniform1f(ub.uSplit, J.split); gl.uniform1f(ub.uPH, PH);
  gl.uniform4f(ub.uMask, maskB, maskR, HERO_B, 0); gl.uniform2f(ub.uFade, DIVE_HAZE(t), DIVE_CUT(t));
  gl.uniform4f(ub.uPS, maskB, maskR, 46, 0.15);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.activeTexture(gl.TEXTURE0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  // mảnh nổi + ô logo, thấp vẽ trước
  const objs = [], ta = t - SHUT / 2, tb = t + SHUT / 2;
  for (const P of pieces) {
    const st = pieceState(P, t); if (st.op <= 0.001) continue;
    objs.push({ st: fixOp(st), s0: pieceState(P, ta), s1: pieceState(P, tb), tex: P.tex, hw: P.iw / 2, hh: P.ih / 2, pad: J.pad,
      radius: P.radius, edge: P.cfg.ext ? [1, 1, 1, 1.0, 0.86] : null, z: st.c[2] });
  }
  for (let k = 0; k < 5; k++) {
    const st = tileState(k, t); if (!st || st.op <= 0.001) continue;
    const s0 = tileState(k, ta) || st, s1 = tileState(k, tb) || st, e = TILE_EDGE[k];
    objs.push({ st: fixOp(st), s0, s1, tex: tileTex[TILE_COL[k]], hw: 16, hh: 16, pad: 0, radius: 7.25, edge: [e[0], e[1], e[2], 1.0, 0.8], z: st.c[2] });
  }
  objs.sort((a, b) => a.z - b.z);
  for (const o of objs) drawObj(o);
  gl.disable(gl.BLEND);
}
// độ dài vệt chuyển động lớn nhất trên màn (px) để chọn số mẫu
function maxMotion(t) {
  const c0 = camera(t - SHUT / 2), c1 = camera(t + SHUT / 2); let m = 0;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
    const sx = i * W / 6, sy = j * HT / 6, cam = camera(t);
    const d = (() => { const v = unproject(cam, sx, sy, 1000); const dir = v3.sub(v, cam.C); const tt = -cam.C[2] / dir[2]; return tt > 0 ? v3.add(cam.C, v3.mul(dir, tt)) : null })();
    if (!d) continue; const a = project(c0, d), b = project(c1, d); m = Math.max(m, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  return m;
}
