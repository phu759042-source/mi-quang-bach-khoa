// ---------- một khung ----------
let TAPS = 40, MBMAX = 32;
function fullPass(pg, fb, w, h, binds) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.useProgram(pg.p);
  binds.forEach(([name, tex], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(pg.u[name], i) });
}
function renderFrame(t, opt = {}) {
  renderScene(t);
  gl.bindVertexArray(quad); gl.disable(gl.BLEND);
  fullPass(PG.pack, RT.combF, W, HT, [['uS0', RT.s0], ['uS1', RT.s1]]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // nhoè chuyển động
  const mm = maxMotion(t), n = opt.mb === 0 ? 1 : clamp(Math.ceil(mm / 1.1), 4, opt.mbMax || MBMAX);
  let src = RT.comb;
  if (n > 1 && mm > 0.6) {
    fullPass(PG.mb, RT.mbF, W, HT, [['uC', RT.comb], ['uV', RT.s2]]); gl.uniform1i(PG.mb.u.uN, n); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    src = RT.mb;
  }
  // nửa độ phân giải + mipmap
  fullPass(PG.half, RT.halfF, 720, 576, [['uAcc', src]]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.bindTexture(gl.TEXTURE_2D, RT.half); gl.generateMipmap(gl.TEXTURE_2D);
  // bán kính nhoè vùng gần, nới rộng ra xung quanh
  fullPass(PG.near, RT.n0F, 180, 144, [['uAcc', src]]); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fullPass(PG.dil, RT.n1F, 180, 144, [['uIn', RT.n0]]); gl.uniform2i(PG.dil.u.uDir, 1, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  fullPass(PG.dil, RT.n2F, 180, 144, [['uIn', RT.n1]]); gl.uniform2i(PG.dil.u.uDir, 0, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // độ sâu trường ảnh
  fullPass(PG.dof, RT.dofF, 720, 576, [['uHalf', RT.half], ['uNear', RT.n2]]); gl.uniform1i(PG.dof.u.uTaps, opt.taps || TAPS); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // chữ màn cuối
  const on = drawOverlay(t);
  if (on) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, RT.over); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, ovc); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false) }
  // ghép → canvas
  fullPass(PG.comp, null, W, HT, [['uAcc', src], ['uDof', RT.dof], ['uNear', RT.n2], ['uOver', RT.over]]);
  gl.uniform1f(PG.comp.u.uOverOn, on ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return { mb: n, motion: mm };
}
const PIX = new Uint8Array(W * HT * 4);
function readB64() {
  gl.readPixels(0, 0, W, HT, gl.RGBA, gl.UNSIGNED_BYTE, PIX);
  return new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.slice(r.result.indexOf(',') + 1)); r.readAsDataURL(new Blob([PIX])) });
}

// ---------- khởi động ----------
async function boot() {
  J = await (await fetch(ROOT + 'cap/trang.json')).json();
  PH = J.H;
  const hero = J.sections.find(s => s.tag === 'section' && /hero/.test(s.cls)); HERO_B = hero.y + hero.h;
  const h2 = J.sections.filter(s => s.tag === 'h2');
  const y2 = h2.find(s => s.text.startsWith('Đua điểm')), yF = h2.find(s => s.text.startsWith('Bán thử'));
  buildTables();
  W82 = look(tabW, 8.2); R925 = look(tabR, 9.25);
  CRUISE = ((yF.y + yF.h / 2) - (y2.y + y2.h / 2)) / (V(8.0) - V(1.6));
  LY0 = (y2.y + y2.h / 2) - CRUISE * V(1.6);
  S_OVER = (HT - 84) / PH; D_OVER = FOC / S_OVER;
  RMAX = (Math.log(D_OVER) - Math.log(1700)) / R925;
  setupPieces();
  for (let k = 0; k < 4; k++) { const L = J.layers.find(l => l.name === 'hero-tile-' + (k + 1)); TILE0.push([L.x + L.w / 2, L.y + L.h / 2]) }
  initGL(); initRT();
  const fonts = [new FontFace('GeistFilm', `url(${ROOT}tex/Geist-500.ttf)`, { weight: '500' }),
    new FontFace('NewsreaderFilm', `url(${ROOT}tex/Newsreader-Italic-72.ttf)`, { style: 'italic', weight: '400' })];
  for (const f of fonts) { await f.load(); document.fonts.add(f) }
  const imgs = await Promise.all([loadImg(ROOT + 'tex/nen-0.png'), loadImg(ROOT + 'tex/nen-1.png'),
    ...['navy', 'chili', 'leaf', 'turmeric'].map(k => loadImg(`${ROOT}tex/logo-${k}.png`)),
    ...pieces.map(P => loadImg(ROOT + 'cap/' + P.file))]);
  pageTex = [{ tex: imgTex(imgs[0]), y0: 0, y1: J.split }, { tex: imgTex(imgs[1]), y0: J.split, y1: PH }];
  ['navy', 'chili', 'leaf', 'turmeric'].forEach((k, i) => tileTex[k] = imgTex(imgs[2 + i]));
  logoImg = imgs[2];
  pieces.forEach((P, i) => P.tex = imgTex(imgs[6 + i]));
  window.FILM.info = { PH, HERO_B, LY0, CRUISE, S_OVER, D_OVER, RMAX, pieces: pieces.map(P => [P.name, +P.tc.toFixed(3)]) };
  window.FILM.ready = true;
}
window.FILM = {
  ready: false, camera, project, focusAt, tileState, maxMotion,
  frame: async (t, opt) => { const r = renderFrame(t, opt || {}); const b = await readB64(); return { b64: b, ...r } },
  time: (t, opt) => { const a = performance.now(); const r = renderFrame(t, opt || {}); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); return { ms: Math.round(performance.now() - a), ...r } },
  sample: (name, t) => { const P = pieces.find(p => p.name === name); const st = pieceState(P, t); const cam = camera(t);
    return { st, scr: project(cam, st.c), corners: [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => {
      const l = [a * P.w / 2, b * P.h / 2]; return project(cam, [st.c[0] + l[0], st.c[1] + l[1] * Math.cos(st.a), st.c[2] - l[1] * Math.sin(st.a)]) }) } },
  tileScr: (k, t) => { const st = tileState(k, t); if (!st) return null; const cam = camera(t); const p = project(cam, st.c); return { st, scr: p, size: st.s * 32 * FOC / p[2] } },
  profile: (t) => {
    const fin = () => { const f = gl.getParameter(gl.FRAMEBUFFER_BINDING); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); gl.bindFramebuffer(gl.FRAMEBUFFER, f) };
    fin(); let a = performance.now(); const T = {}; const mark = k => { fin(); const b = performance.now(); T[k] = Math.round(b - a); a = b };
    renderScene(t); mark('scene'); renderFrame(t); mark('frame');
    return T;
  },
};
boot().catch(e => { window.FILM.error = String(e && e.stack || e); console.error(e) });
