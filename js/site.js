/* Cabanas Meio do Mato — movimento do site.
   1) filme: os quadros do reel desenhados num canvas, avançando com a rolagem (GSAP ScrollTrigger)
   2) seções que sobem por cima, cartões que empilham, cenas em tela cheia
   3) reserva que monta a mensagem do WhatsApp
   ?movimento no endereço força o movimento completo mesmo com "menos movimento" ligado no sistema. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const raiz = document.documentElement;
  const params = new URLSearchParams(location.search);
  const reduz = !params.has('movimento') && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const toque = matchMedia('(hover: none), (pointer: coarse)').matches;
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const suave = x => x * x * (3 - 2 * x);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  if (reduz) raiz.classList.add('reduz');

  /* ---------- eventos (GA4/GTM e Meta Pixel, quando instalados) ---------- */
  function evento(nome, dados = {}) {
    try { (window.dataLayer = window.dataLayer || []).push({ event: nome, ...dados }); if (window.fbq) window.fbq('trackCustom', nome, dados); } catch (e) { /* sem analytics */ }
  }
  $$('[data-ev]').forEach(el => el.addEventListener('click', () => evento(el.dataset.ev, { origem: (el.closest('section, header, footer') || {}).id || el.className })));

  /* ---------- reserva (funciona mesmo sem GSAP) ---------- */
  const Reserva = (() => {
    const WHATS = '5521996273547';
    const PRECO = { aurora: 1440, concept: 1440 }; // valor de referência, a confirmar com o anfitrião
    const NOME = { aurora: 'Cabana Aurora', concept: 'Cabana Concept' };
    const AIRBNB = { aurora: 'https://www.airbnb.com.br/rooms/1597457829082281356', concept: 'https://www.airbnb.com.br/rooms/1597493917478918893' };
    const TAXA_PET = 200;
    const fEnt = $('#entrada'), fSai = $('#saida'), fPet = $('#pet'), saidaHosp = $('#hospedes');
    const zap = $('#btnZap'), estD = $('#estDetalhe'), estT = $('#estTotal'), linkAb = $('#linkAirbnb'), seg = $('#segCabana');
    const btMenos = $('[data-passo="-1"]'), btMais = $('[data-passo="1"]');
    let cabana = 'aurora', hosp = 2;
    const totalAnim = { v: 2880 };
    const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dia = s => new Date(s + 'T12:00:00');
    const br = s => { const [, m, d] = s.split('-'); return `${d}/${m}`; };
    const brl = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR');

    (function datasIniciais() {
      const hoje = new Date(); const sexta = new Date(hoje);
      sexta.setDate(hoje.getDate() + (((5 - hoje.getDay() + 7) % 7) || 7));
      const domingo = new Date(sexta); domingo.setDate(sexta.getDate() + 2);
      fEnt.value = iso(sexta); fSai.value = iso(domingo); fEnt.min = iso(hoje);
      const amanha = new Date(sexta); amanha.setDate(sexta.getDate() + 1); fSai.min = iso(amanha);
    })();

    function atualiza() {
      seg.classList.toggle('dir', cabana === 'concept');
      linkAb.href = AIRBNB[cabana];
      saidaHosp.textContent = hosp;
      btMenos.disabled = hosp <= 1; btMais.disabled = hosp >= 2;
      const n = fEnt.value && fSai.value ? Math.round((dia(fSai.value) - dia(fEnt.value)) / 864e5) : 0;
      if (!(n > 0)) {
        estD.textContent = 'Escolha uma saída depois da chegada.'; estT.textContent = '—';
        zap.setAttribute('aria-disabled', 'true'); return;
      }
      zap.removeAttribute('aria-disabled');
      const pet = fPet.checked ? TAXA_PET : 0, total = n * PRECO[cabana] + pet;
      estD.textContent = `${n} ${n > 1 ? 'noites' : 'noite'} × ${brl(PRECO[cabana])}${pet ? ' + pet ' + brl(pet) : ''}`;
      if (window.gsap && !reduz) gsap.to(totalAnim, { v: total, duration: .7, ease: 'power3.out', overwrite: true, onUpdate: () => { estT.textContent = brl(totalAnim.v); } });
      else { totalAnim.v = total; estT.textContent = brl(total); }
      const msg = `Olá! Quero reservar a ${NOME[cabana]} de ${br(fEnt.value)} a ${br(fSai.value)} (${n} ${n > 1 ? 'noites' : 'noite'}) para ${hosp} ${hosp === 1 ? 'pessoa' : 'pessoas'}${pet ? ', com meu pet' : ''}. Vi no site.`;
      zap.href = `https://wa.me/${WHATS}?text=${encodeURIComponent(msg)}`;
    }
    function escolhe(c) { cabana = c; const r = $(`input[name="cabana"][value="${c}"]`); if (r) r.checked = true; atualiza(); }

    $$('input[name="cabana"]').forEach(r => r.addEventListener('change', () => escolhe(r.value)));
    fEnt.addEventListener('change', () => {
      const prox = dia(fEnt.value); prox.setDate(prox.getDate() + 1); fSai.min = iso(prox);
      if (!fSai.value || dia(fSai.value) <= dia(fEnt.value)) { const d = dia(fEnt.value); d.setDate(d.getDate() + 2); fSai.value = iso(d); }
      atualiza();
    });
    [fSai, fPet].forEach(el => el.addEventListener('change', atualiza));
    [btMenos, btMais].forEach(b => b.addEventListener('click', () => { hosp = clamp(hosp + (+b.dataset.passo), 1, 2); atualiza(); }));
    zap.addEventListener('click', e => { if (zap.getAttribute('aria-disabled')) { e.preventDefault(); return; } evento('clique_whatsapp', { cabana }); });
    linkAb.addEventListener('click', () => evento('clique_airbnb', { cabana }));
    $('#formReserva').addEventListener('submit', e => e.preventDefault());
    atualiza();
    return { escolhe };
  })();

  /* ---------- galeria: setas e arrastar com o mouse ---------- */
  (() => {
    const gal = $('#galeria'); if (!gal) return;
    let ini = null, moveu = false;
    gal.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; ini = { x: e.clientX, s: gal.scrollLeft }; moveu = false; gal.classList.add('arrastando'); });
    addEventListener('pointermove', e => { if (!ini) return; const dx = e.clientX - ini.x; if (Math.abs(dx) > 3) moveu = true; gal.scrollLeft = ini.s - dx; });
    addEventListener('pointerup', () => {
      if (!ini) return; ini = null; gal.classList.remove('arrastando');
      const f = gal.querySelector('figure'); const passo = f.offsetWidth + 10;
      gal.scrollTo({ left: Math.round(gal.scrollLeft / passo) * passo, behavior: 'smooth' });
    });
    gal.addEventListener('click', e => { if (moveu) e.preventDefault(); }, true);
    $$('[data-gal]').forEach(b => b.addEventListener('click', () => { const f = gal.querySelector('figure'); gal.scrollBy({ left: (+b.dataset.gal) * (f.offsetWidth + 10), behavior: 'smooth' }); }));
  })();

  /* ---------- sem GSAP (CDN fora do ar): site parado, mas completo ---------- */
  if (!window.gsap || !window.ScrollTrigger) {
    raiz.classList.add('sem-gsap'); document.body.classList.remove('is-loading');
    const l = $('#loader'); if (l) l.remove();
    const c = $('#filmeCanvas'); if (c) c.style.background = 'url(media/heroi/m/q143.webp) center / cover';
    $$('.cena video').forEach(v => { v.poster = v.dataset.poster; v.src = v.closest('.cena').dataset.src; });
    const f = $('.reserva-fundo'); if (f) { f.poster = f.dataset.poster; f.src = f.dataset.src; }
    $$('[data-escolhe]').forEach(b => b.addEventListener('click', () => { Reserva.escolhe(b.dataset.escolhe); $('#reserva').scrollIntoView(); }));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const temSplit = !!window.SplitText;
  if (temSplit) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  ScrollTrigger.clearScrollMemory('manual');
  const hashInicial = location.hash && location.hash.length > 1 ? location.hash : '';
  scrollTo(0, 0);

  /* ---------- rolagem suave (computador; no toque fica a rolagem nativa) ---------- */
  let lenis = null;
  if (!reduz && !toque && window.Lenis) {
    lenis = new Lenis({ lerp: .085, wheelMultiplier: .95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    if (params.has('teste')) window.__lenis = lenis;
  }
  const travaRolagem = on => { if (lenis) on ? lenis.stop() : lenis.start(); document.body.style.overflow = on ? 'hidden' : ''; };

  function vaiPara(alvo, imediato = false) {
    const el = typeof alvo === 'string' ? $(alvo) : alvo; if (!el) return;
    const y = el.id === 'inicio' ? 0 : el.getBoundingClientRect().top + scrollY;
    if (lenis) lenis.scrollTo(y, { immediate: imediato, duration: 1.6, easing: t => 1 - Math.pow(1 - t, 4), force: true });
    else scrollTo({ top: y, behavior: imediato || reduz ? 'auto' : 'smooth' });
  }

  /* =========================================================
     1. FILME — a abertura avança com a rolagem, desenhada num canvas
     Motor principal: o vídeo (H.264 cru + índice de quadros) é decodificado pelo próprio site
     com WebCodecs, usando o chip de vídeo do aparelho: 30 quadros por segundo, de 12 em 12
     (um "grupo" começa sempre num quadro-chave), guardando só os grupos perto da posição atual.
     Reserva: se o navegador não tiver WebCodecs ou algo falhar, troca sozinho para a sequência
     de fotos (media/heroi/m e d).
     ========================================================= */
  const Filme = (() => {
    const cv = $('#filmeCanvas'), ctx = cv.getContext('2d', { alpha: false });
    const conj = Math.min(innerWidth, innerHeight * 1.2) >= 900 || innerWidth >= 1100 ? 'd' : 'm';
    const DUR = 13.666; // segundos do vídeo da abertura (as legendas usam esta escala)
    const tiny = document.createElement('canvas'); tiny.width = 18; tiny.height = 32;
    const tctx = tiny.getContext('2d');
    const estado = { t: 0 };
    let W = 0, H = 0, dpr = 0, painel = false, P = null, sujo = true, ultimoT = -1, ativo = true, ultimoFundo = 0;
    let motor = null, avisaProgresso = () => {}, resolvePronto;
    const contagem = params.has('teste') ? { exato: 0, perto: 0 } : null;
    const pronto = new Promise(r => { resolvePronto = r; });

    /* --- desenho comum --- */
    function medidas(forca) {
      const r = cv.getBoundingClientRect();
      const nd = Math.min(motor && motor.dprMax ? motor.dprMax : 2, devicePixelRatio || 1);
      if (!forca && Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 1 && nd === dpr) return;
      W = r.width; H = r.height; dpr = nd;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
      painel = W / H > 1.02 && W >= 900;
      if (painel) { const h = Math.min(H * .88, 1080), w = h * 9 / 16; P = { w, h, x: W * .69 - w / 2, y: (H - h) / 2 }; }
      sujo = true;
    }
    function cobre(src, sw, sh, x, y, w, h, z) {
      const s = Math.max(w / sw, h / sh) * z, dw = sw * s, dh = sh * s;
      ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
    function pinta(im, alfa, z) {
      if (!im || alfa <= .002) return;
      const iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
      ctx.globalAlpha = alfa;
      if (painel) {
        // fundo desfocado: atualizado no máximo 5 vezes por segundo (copiar um quadro do chip de vídeo
        // para o canvas pequeno é lento, e ninguém percebe a diferença num fundo tão borrado)
        const agora = performance.now();
        if (alfa === 1 && agora - ultimoFundo > 200) {
          ultimoFundo = agora;
          tctx.globalAlpha = 1; tctx.drawImage(im, 0, 0, tiny.width, tiny.height);
          tctx.fillStyle = 'rgba(8,11,9,.5)'; tctx.fillRect(0, 0, tiny.width, tiny.height);
        }
        cobre(tiny, tiny.width, tiny.height, 0, 0, W, H, 1.2);
        ctx.save(); ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(P.x, P.y, P.w, P.h, 14); else ctx.rect(P.x, P.y, P.w, P.h);
        ctx.clip(); cobre(im, iw, ih, P.x, P.y, P.w, P.h, z); ctx.restore();
      } else cobre(im, iw, ih, 0, 0, W, H, z);
      ctx.globalAlpha = 1;
    }

    /* =========== motor 1: vídeo decodificado com WebCodecs =========== */
    function motorVideo() {
      let meta, dados, dec, F, FPS, alvo = 0, dir = 1, ocupado = false, morto = false;
      let recebidos = 0, completo = false;
      const LIMIAR = .55; // abre a página com pouco mais da metade do vídeo; o resto chega enquanto assiste
      const inicios = [];          // primeiro quadro de cada grupo (sempre quadro-chave)
      const cache = new Map();     // quadro → ImageBitmap
      const prontos = new Set(), pendentes = [];
      const grupoDe = i => { let g = 0; while (g + 1 < inicios.length && inicios[g + 1] <= i) g++; return g; };
      // aparelhos com até 4 GB guardam 3 grupos prontos (36 quadros); os demais, 4 grupos
      const pouca = params.has('pouca') || (navigator.deviceMemory || 8) <= 4;
      const vizinhos = c => (pouca ? [c, c + dir, c - dir] : [c, c + dir, c + 2 * dir, c - dir]);
      const quer = g => vizinhos(grupoDe(alvo)).includes(g);

      // baixa em pedaços: cada grupo de quadros pode ser decodificado assim que os bytes dele chegam
      async function baixa(url, total, aviso) {
        const r = await fetch(url); if (!r.ok) throw new Error('download ' + r.status);
        if (!r.body || !r.body.getReader) { dados = new Uint8Array(await r.arrayBuffer()); recebidos = dados.length; completo = true; aviso(); return; }
        dados = new Uint8Array(total); const leitor = r.body.getReader();
        for (;;) {
          const { done, value } = await leitor.read(); if (done) break;
          if (recebidos + value.length > dados.length) { const maior = new Uint8Array((recebidos + value.length) * 1.2 | 0); maior.set(dados.subarray(0, recebidos)); dados = maior; }
          dados.set(value, recebidos); recebidos += value.length; aviso();
        }
        completo = true; aviso();
      }
      const fimDoGrupo = g => { const q = meta.frames[(g + 1 < inicios.length ? inicios[g + 1] : F) - 1]; return q[0] + q[1]; };
      const disponivel = g => completo || fimDoGrupo(g) <= recebidos;
      function saida(frame) {
        const i = Math.round(frame.timestamp * FPS / 1e6);
        if (morto || !quer(grupoDe(i))) { frame.close(); return; }
        // cópia sem redimensionar: pedir tamanho menor aqui força a placa de vídeo a parar a cada grupo
        const p = createImageBitmap(frame).then(b => {
          frame.close();
          if (morto || !quer(grupoDe(i))) { b.close(); return; }
          const velho = cache.get(i); if (velho) velho.close();
          cache.set(i, b); sujo = true;
        }, e => { frame.close(); throw e; });
        pendentes.push(p);
      }
      async function decodifica(g) {
        ocupado = true;
        const a = inicios[g], b = g + 1 < inicios.length ? inicios[g + 1] : F;
        for (let i = a; i < b; i++) {
          const [off, len] = meta.frames[i];
          dec.decode(new EncodedVideoChunk({ type: i === a ? 'key' : 'delta', timestamp: Math.round(i * 1e6 / FPS), data: dados.subarray(off, off + len) }));
        }
        await dec.flush();
        await Promise.all(pendentes.splice(0));
        ocupado = false;
        if (quer(g)) prontos.add(g);
        else for (let i = a; i < b; i++) { const bm = cache.get(i); if (bm) { bm.close(); cache.delete(i); } }
      }
      async function bombeia() {
        if (ocupado || morto || !dec) return;
        const c = grupoDe(alvo);
        const fila = vizinhos(c).filter(g => g >= 0 && g < inicios.length && !prontos.has(g) && disponivel(g));
        if (!fila.length) return;
        try { await decodifica(fila[0]); } catch (e) { return falha(e); }
        bombeia();
      }
      function libera() {
        for (const g of [...prontos]) {
          if (quer(g)) continue;
          prontos.delete(g);
          const a = inicios[g], b = g + 1 < inicios.length ? inicios[g + 1] : F;
          for (let i = a; i < b; i++) { const bm = cache.get(i); if (bm) { bm.close(); cache.delete(i); } }
        }
      }
      function falha(e) {
        if (morto) return; morto = true;
        try { dec && dec.state !== 'closed' && dec.close(); } catch (x) { /* já fechado */ }
        cache.forEach(b => b.close()); cache.clear();
        console.warn('Abertura: WebCodecs indisponível, usando as fotos.', e && e.message);
        trocaMotor(motorImagens());
      }
      return {
        dprMax: conj === 'm' ? 2 : 1.5,
        async inicia() {
          if (!('VideoDecoder' in window) || !('EncodedVideoChunk' in window)) throw new Error('sem WebCodecs');
          meta = await (await fetch('media/heroi/video.json')).json();
          const sup = await VideoDecoder.isConfigSupported({ codec: meta.codec, optimizeForLatency: true });
          if (!sup.supported) throw new Error('codec ' + meta.codec);
          FPS = meta.fps; F = meta.frames.length;
          meta.frames.forEach((q, i) => { if (q[2]) inicios.push(i); });
          let comeca; const podeComecar = new Promise(r => { comeca = r; });
          baixa('media/heroi/video.h264', meta.bytes, () => {
            avisaProgresso(Math.min(1, recebidos / (meta.bytes * LIMIAR)) * .96);
            if (completo || recebidos >= meta.bytes * LIMIAR) comeca();
            bombeia();
          }).catch(falha);
          await podeComecar;
          if (morto) return;
          dec = new VideoDecoder({ output: saida, error: falha });
          dec.configure({ codec: meta.codec, optimizeForLatency: true });
          await decodifica(0);
          if (!cache.size) throw new Error('nenhum quadro decodificado');
          avisaProgresso(1); bombeia();
        },
        desenha(t) {
          if (morto) return;
          const i = clamp(Math.round(t * FPS), 0, F - 1);
          if (i !== alvo) { dir = i > alvo ? 1 : -1; alvo = i; libera(); bombeia(); }
          let im = cache.get(i);
          if (contagem) contagem[im ? 'exato' : 'perto']++;
          for (let d = 1; !im && d < 48; d++) im = cache.get(i - d * dir) || cache.get(i + d * dir);
          if (!im && cache.size) im = cache.values().next().value;
          pinta(im, 1, 1);
        },
        get morto() { return morto; },
        falha,
      };
    }

    /* =========== motor 2 (reserva): sequência de fotos =========== */
    function motorImagens() {
      const N = 149;
      // uma tomada contínua (porta → deck → piscina → cabana) e a vista final, que entra por fusão
      const SEG = [{ a: 1, b: 142, w: 7.6, z0: 1, z1: 1 }, { a: 143, b: 149, w: 1.4, z0: 1.16, z1: 1 }];
      let acc = 0; SEG.forEach(s => { s.s = acc; acc += s.w; s.e = acc; });
      const TOTAL = acc, FUNDE = .35, FRENTE = conj === 'm' ? 30 : 40, TRAS = 14, INICIAIS = 40;
      const ancora = n => n % 6 === 1 || n === N || SEG.some(s => n === s.a || n === s.b);
      const url = n => `media/heroi/${conj}/q${String(n).padStart(3, '0')}.webp`;
      const blobs = new Array(N + 1), bmps = new Array(N + 1), falhou = new Uint8Array(N + 1);
      const baixando = new Set(), decod = new Set();
      let alvo = 1, dir = 1, iBase = 0, fim = () => {};
      const base = [];
      { const vis = new Set(), poe = n => { if (!vis.has(n)) { vis.add(n); base.push(n); } };
        for (let n = 1; n <= INICIAIS; n++) poe(n);
        for (let n = 1; n <= N; n++) if (ancora(n)) poe(n);
        for (let n = 1; n <= N; n++) poe(n); }
      const essenciais = new Set(); for (let n = 1; n <= N; n++) if (n <= INICIAIS || ancora(n)) essenciais.add(n);
      const totalEss = essenciais.size;
      const confere = () => { avisaProgresso(1 - essenciais.size / totalEss); if (!essenciais.size && bmps[1]) fim(); };
      function proximo() {
        for (let k = 0; k <= FRENTE; k++) { const n = alvo + dir * k; if (n < 1 || n > N) break; if (!blobs[n] && !falhou[n] && !baixando.has(n)) return n; }
        while (iBase < base.length) { const n = base[iBase++]; if (!blobs[n] && !falhou[n] && !baixando.has(n)) return n; }
        return 0;
      }
      function bombeia() {
        while (baixando.size < 6) {
          const n = proximo(); if (!n) return;
          baixando.add(n);
          fetch(url(n)).then(r => (r.ok ? r.blob() : Promise.reject(r.status)))
            .then(b => { blobs[n] = b; }, () => { falhou[n] = 1; })
            .finally(() => { baixando.delete(n); essenciais.delete(n); agenda(); confere(); bombeia(); });
        }
      }
      function imagem(b) {
        return new Promise((res, rej) => {
          const im = new Image(); im.onerror = rej;
          im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => res(im));
          im.src = URL.createObjectURL(b);
        });
      }
      const criaBitmap = window.createImageBitmap ? b => createImageBitmap(b).catch(() => imagem(b)) : imagem;
      const quer = n => ancora(n) || (dir > 0 ? n >= alvo - TRAS && n <= alvo + FRENTE : n >= alvo - FRENTE && n <= alvo + TRAS);
      function agenda() {
        for (let n = 1; n <= N; n++) if (bmps[n] && !quer(n)) { if (bmps[n].close) bmps[n].close(); bmps[n] = null; }
        const fila = [alvo];
        for (let k = 1; k <= 10; k++) fila.push(alvo + dir * k);
        for (let k = 1; k <= 5; k++) fila.push(alvo - dir * k);
        for (let k = 11; k <= FRENTE; k++) fila.push(alvo + dir * k);
        for (let k = 6; k <= TRAS; k++) fila.push(alvo - dir * k);
        for (let n = 1; n <= N; n++) if (ancora(n)) fila.push(n);
        for (const n of fila) {
          if (decod.size >= 3) break;
          if (n < 1 || n > N || bmps[n] || decod.has(n) || !blobs[n]) continue;
          decod.add(n);
          criaBitmap(blobs[n])
            .then(b => { if (quer(n)) { bmps[n] = b; sujo = true; } else if (b.close) b.close(); }, () => {})
            .finally(() => { decod.delete(n); confere(); agenda(); });
        }
      }
      function perto(n, s) {
        if (bmps[n]) return bmps[n];
        for (let d = 1; d < N; d++) {
          const a = n - d, b = n + d;
          if (a >= s.a && bmps[a]) return bmps[a];
          if (b <= s.b && bmps[b]) return bmps[b];
          if (a < s.a && b > s.b) break;
        }
        for (let d = 1; d < N; d++) { if (n - d >= 1 && bmps[n - d]) return bmps[n - d]; if (n + d <= N && bmps[n + d]) return bmps[n + d]; }
        return null;
      }
      function segmento(i, u, alfa, principal) {
        const s = SEG[i], pos = s.a + u * (s.b - s.a), f0 = Math.floor(pos), fr = pos - f0;
        if (principal && f0 !== alvo) { dir = f0 > alvo ? 1 : -1; alvo = f0; agenda(); bombeia(); }
        const z = s.z0 + (s.z1 - s.z0) * suave(u);
        pinta(perto(f0, s), alfa, z);
        if (fr > .03 && f0 < s.b && bmps[f0] && bmps[f0 + 1]) pinta(bmps[f0 + 1], alfa * fr, z);
      }
      return {
        dprMax: conj === 'm' ? 1.4 : 1.6,
        inicia() { return new Promise(r => { fim = r; bombeia(); }); },
        desenha(t) {
          const tt = clamp(t / DUR) * TOTAL;
          let i = SEG.findIndex(s => tt < s.e); if (i < 0) i = SEG.length - 1;
          const s = SEG[i], u = clamp((tt - s.s) / s.w);
          segmento(i, u, 1, true);
          if (i < SEG.length - 1 && tt > s.e - FUNDE) segmento(i + 1, 0, suave((tt - (s.e - FUNDE)) / FUNDE), false);
        },
      };
    }

    /* --- escolha do motor --- */
    function trocaMotor(m) {
      motor = m; medidas(true);
      m.inicia().then(resolvePronto, e => { console.warn(e); resolvePronto(); });
    }
    function desenha() {
      ctx.fillStyle = '#0b0f0c'; ctx.fillRect(0, 0, W, H);
      if (motor) motor.desenha(clamp(estado.t, 0, DUR));
    }
    function tick() {
      if (!ativo) return;
      if (sujo || estado.t !== ultimoT) { ultimoT = estado.t; sujo = false; desenha(); }
    }
    const usaVideo = 'VideoDecoder' in window && !params.has('fotos');
    if (contagem) window.__abertura = { contagem, motor: () => (motor && motor.dprMax === 2 || motor && motor.falha ? 'video' : 'fotos') };
    if (usaVideo) {
      const mv = motorVideo(); motor = mv; medidas(true);
      mv.inicia().then(resolvePronto, e => mv.falha(e));
    } else trocaMotor(motorImagens());
    gsap.ticker.add(tick);
    return {
      TOTAL: DUR, estado, pronto,
      medidas: () => medidas(false),
      onProgresso: f => { avisaProgresso = f; },
      ativa: v => { ativo = v; if (v) sujo = true; },
    };
  })();

  // o resto monta depois das fontes: separar o texto em palavras antes delas carregarem erra as medidas
  const fontes = document.fonts ? Promise.race([document.fonts.ready, espera(3000)]) : Promise.resolve();
  fontes.then(() => {

  /* ---------- texto em palavras com máscara ---------- */
  const palavras = (el, chars = false) => {
    if (!temSplit || !el) return null;
    return SplitText.create(el, { type: chars ? 'words,chars' : 'words', mask: 'words', wordsClass: 'pal' });
  };

  /* =========================================================
     Carregando → entrada
     ========================================================= */
  const loader = $('#loader'), lNum = $('#loaderNum'), lLinha = $('#loaderLinha');
  const prog = { v: 0 };
  const mostraProgresso = p => gsap.to(prog, { v: p * 100, duration: .5, ease: 'power2.out', overwrite: true, onUpdate: () => { lNum.textContent = Math.round(prog.v); lLinha.style.transform = `scaleX(${prog.v / 100})`; } });
  Filme.onProgresso(p => mostraProgresso(p * .96));

  const tituloSplit = palavras($('#titulo'), true);

  function entrada() {
    const tl = gsap.timeline();
    if (reduz) {
      tl.from('#capTitulo > *, #topo, #dica > *', { autoAlpha: 0, duration: .8, clearProps: 'opacity,visibility' });
      return tl;
    }
    tl.fromTo('#filmeCanvas', { scale: 1.14 }, { scale: 1, duration: 2.4, ease: 'expo.out' }, 0);
    if (tituloSplit) tl.from(tituloSplit.chars, { yPercent: 118, duration: 1.5, stagger: .045, ease: 'expo.out' }, .15);
    tl.from('#capTitulo .reveal', { autoAlpha: 0, y: 20, duration: 1.1, stagger: .12, ease: 'power3.out' }, .5)
      .from('#topo', { autoAlpha: 0, y: -18, duration: 1.1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }, .55)
      .from('#dica > *', { autoAlpha: 0, duration: 1.2 }, .9);
    return tl;
  }

  let liberado = false;
  async function libera() {
    if (liberado) return; liberado = true;
    Filme.onProgresso(() => {}); // o resto do vídeo continua chegando: sem animar um contador que já saiu da tela
    mostraProgresso(1);
    await espera(reduz ? 100 : 450);
    document.body.classList.remove('is-loading');
    ScrollTrigger.clearScrollMemory('manual');
    scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    travaRolagem(false);
    ScrollTrigger.refresh();
    const sai = gsap.timeline({ onComplete: () => loader.remove() });
    if (reduz) sai.to(loader, { autoAlpha: 0, duration: .4 }).add(entrada(), 0);
    else sai.to('.loader-mid, .loader-pe', { autoAlpha: 0, y: -24, duration: .55, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.15, ease: 'expo.inOut' }, '-=.1')
      .add(entrada(), '-=.7');
    if (hashInicial && $(hashInicial)) setTimeout(() => vaiPara(hashInicial, true), 60);
  }
  travaRolagem(true);
  Promise.race([
    Promise.all([Filme.pronto, document.fonts ? document.fonts.ready : null, espera(reduz ? 300 : 1300)]),
    espera(9000),
  ]).then(libera);

  /* =========================================================
     1b. FILME + rolagem: legendas entram e saem com o vídeo
     ========================================================= */
  const filmeEl = $('#inicio'), palco = $('#filmePalco');
  const fimFilme = () => Math.max(1, filmeEl.offsetHeight - palco.offsetHeight - innerHeight);
  const tlFilme = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: filmeEl, start: 'top top', end: () => '+=' + fimFilme(), scrub: reduz ? true : toque ? .45 : .8, invalidateOnRefresh: true },
  });
  tlFilme.to(Filme.estado, { t: Filme.TOTAL, duration: Filme.TOTAL }, 0);
  tlFilme.to('#dica', { autoAlpha: 0, duration: .15 }, .05);
  tlFilme.to('#capTitulo', reduz ? { autoAlpha: 0, duration: .25 } : { autoAlpha: 0, yPercent: -12, duration: .3, ease: 'power2.in' }, .1);

  $$('.cap[data-in]').forEach(c => {
    const a = +c.dataset.in, b = c.dataset.out ? +c.dataset.out : null;
    const h = $('h2', c), extras = [...c.children].filter(x => x !== h);
    const sp = reduz ? null : palavras(h);
    tlFilme.set(c, { autoAlpha: 1 }, a);
    if (sp) tlFilme.fromTo(sp.words, { yPercent: 115 }, { yPercent: 0, duration: .34, stagger: .035, ease: 'power3.out' }, a);
    else tlFilme.fromTo(h, { autoAlpha: 0 }, { autoAlpha: 1, duration: .3 }, a);
    if (extras.length) tlFilme.fromTo(extras, { autoAlpha: 0, y: reduz ? 0 : 18 }, { autoAlpha: 1, y: 0, duration: .3, stagger: .06, ease: 'power2.out' }, a + .1);
    if (b !== null) {
      if (sp) tlFilme.to(sp.words, { yPercent: -115, duration: .26, stagger: .025, ease: 'power2.in' }, b);
      else tlFilme.to(h, { autoAlpha: 0, duration: .26 }, b);
      if (extras.length) tlFilme.to(extras, { autoAlpha: 0, duration: .2 }, b);
      tlFilme.set(c, { autoAlpha: 0 }, b + .32);
    }
  });
  ScrollTrigger.create({ trigger: filmeEl, start: 'top bottom', end: 'bottom top', onToggle: s => Filme.ativa(s.isActive) });

  // o palco recua quando o manifesto sobe por cima dele
  if (!reduz) {
    gsap.timeline({ scrollTrigger: { trigger: '#manifesto', start: 'top bottom', end: 'top top', scrub: true } })
      .to(palco, toque ? { scale: .9, yPercent: -3, ease: 'none' } : { scale: .9, yPercent: -3, borderRadius: 28, ease: 'none' }, 0)
      .to('#filmeEscuro', { opacity: .8, ease: 'none' }, 0);
  }

  /* =========================================================
     2. Manifesto, números e faixa
     ========================================================= */
  if (temSplit && !reduz) {
    const m = SplitText.create('#manifestoTxt', { type: 'words', wordsClass: 'word' });
    gsap.fromTo(m.words, { opacity: .13 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: '#manifestoTxt', start: 'top 82%', end: 'bottom 48%', scrub: true } });
  }

  $$('[data-conta]').forEach(el => {
    if (reduz) return;
    const fim = parseFloat(el.dataset.conta), casas = +el.dataset.casas || 0, o = { v: 0 };
    const escreve = () => { el.textContent = o.v.toFixed(casas).replace('.', ','); };
    escreve();
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: fim, duration: 2, ease: 'power3.out', onUpdate: escreve }) });
  });

  const faixa = $('#faixa');
  if (faixa && !reduz) {
    const volta = gsap.to(faixa, { xPercent: -50, repeat: -1, duration: 30, ease: 'none' });
    volta.totalTime(volta.duration() * 200);
    let dir = 1;
    ScrollTrigger.create({
      trigger: '.faixa', start: 'top bottom', end: 'bottom top',
      onToggle: s => { s.isActive ? volta.play() : volta.pause(); },
      onUpdate: s => {
        const v = s.getVelocity(); if (Math.abs(v) < 5) return;
        dir = v < 0 ? -1 : 1;
        gsap.killTweensOf(volta);
        gsap.to(volta, { timeScale: dir * (1 + Math.min(6, Math.abs(v) / 250)), duration: .2, overwrite: true,
          onComplete: () => gsap.to(volta, { timeScale: dir, duration: 1.4, ease: 'power2.out' }) });
      },
    });
  }

  /* ---------- títulos das seções e textos que sobem ---------- */
  $$('.split').forEach(el => {
    if (reduz || !temSplit) return;
    const sp = palavras(el);
    gsap.from(sp.words, { yPercent: 115, duration: 1.2, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  $$('.reveal').forEach(el => {
    if (reduz || el.closest('#capTitulo')) return;
    gsap.from(el, { autoAlpha: 0, y: 24, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  $$('.rot').forEach(el => {
    if (reduz || el.closest('.filme')) return;
    gsap.from(el, { autoAlpha: 0, x: -16, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  /* =========================================================
     3. Cabanas: cartões que empilham
     ========================================================= */
  const cabs = $$('.cab');
  cabs.forEach((c, i) => {
    const dentro = $('.cab-in', c), img = $('.cab-foto img', c), prox = cabs[i + 1];
    $$('[data-escolhe]', c).forEach(b => b.addEventListener('click', () => {
      Reserva.escolhe(b.dataset.escolhe); evento('ver_datas', { cabana: b.dataset.escolhe }); vaiPara('#reserva');
    }));
    if (reduz) return;
    gsap.fromTo(img, { yPercent: -9 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from($$('.cab-info > *', c), { autoAlpha: 0, y: 26, duration: 1, stagger: .06, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 70%', once: true } });
    if (prox) gsap.timeline({ scrollTrigger: { trigger: prox, start: 'top bottom', end: () => 'top ' + (parseFloat(getComputedStyle(prox).top) || 80) + 'px', scrub: true, invalidateOnRefresh: true } })
      .to(dentro, { scale: .92, ease: 'none' }, 0)
      .to($('.sombra', c), { opacity: .6, ease: 'none' }, 0);
  });

  /* =========================================================
     4. Cenas em tela cheia
     ========================================================= */
  const cenas = $$('.cena');
  const ligaVideo = (v, src) => { if (!v || v.dataset.ligado) return; v.dataset.ligado = '1'; if (v.dataset.poster) v.poster = v.dataset.poster; v.src = src; v.preload = 'auto'; v.load(); };
  const toca = v => { if (reduz || !v) return; const p = v.play(); if (p) p.catch(() => {}); };
  cenas.forEach((c, i) => {
    const dentro = $('.cena-in', c), v = $('video', c), prox = cenas[i + 1] || $('#comodidades');
    ScrollTrigger.create({ trigger: c, start: 'top bottom+=120%', once: true, onEnter: () => ligaVideo(v, c.dataset.src) });
    // toca só com a cena parada na tela: vídeo tocando durante a transição trava o celular
    ScrollTrigger.create({ trigger: c, start: 'top top+=2', endTrigger: prox, end: 'top bottom-=2', onToggle: s => (s.isActive ? toca(v) : v.pause()) });
    const h = $('h3', c), extras = $$('.cena-txt > :not(h3), .cena-n', c);
    if (reduz) return;
    // no toque, só transformações e opacidade (a GPU faz sozinha); recorte animado só no computador
    const entra = gsap.timeline({ scrollTrigger: { trigger: c, start: 'top bottom', end: 'top top', scrub: true } })
      .fromTo(v, { scale: 1.3 }, { scale: 1, ease: 'none' }, 0);
    if (!toque) entra.fromTo(dentro, { clipPath: 'inset(14% 6% 0% 6% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0);
    gsap.timeline({ scrollTrigger: { trigger: prox, start: 'top bottom', end: 'top top', scrub: true } })
      .to(dentro, { scale: .88, ease: 'none' }, 0)
      .to($('.sombra', c), { opacity: .75, ease: 'none' }, 0);
    const sp = palavras(h);
    const tl = gsap.timeline({ paused: true });
    if (sp) tl.fromTo(sp.words, { yPercent: 115 }, { yPercent: 0, duration: 1.2, stagger: .06, ease: 'expo.out' }, 0);
    tl.fromTo(extras, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .9, stagger: .08, ease: 'power3.out' }, .15);
    ScrollTrigger.create({ trigger: c, start: 'top 45%', onEnter: () => tl.play(), onLeaveBack: () => tl.reverse() });
  });

  /* =========================================================
     5. Comodidades: cartões com foto que sobem em sequência
     ========================================================= */
  if (!reduz) {
    gsap.set('.bento > *', { autoAlpha: 0, y: 46 });
    ScrollTrigger.batch('.bento > *', {
      start: 'top 92%', once: true,
      onEnter: els => {
        gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, stagger: .08, ease: 'expo.out' });
        els.forEach(el => { const im = $('img', el); if (im) gsap.fromTo(im, { scale: 1.25 }, { scale: 1.001, duration: 1.8, ease: 'expo.out' }); });
      },
    });
    gsap.from('.galeria figure', { autoAlpha: 0, x: 60, duration: 1.2, stagger: .07, ease: 'expo.out', scrollTrigger: { trigger: '.galeria', start: 'top 88%', once: true } });
  }

  /* =========================================================
     6. Avaliações
     ========================================================= */
  if (!reduz) gsap.fromTo('#estrelas', { width: '0%' }, { width: '99.4%', duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: '.nota-grande', start: 'top 82%', once: true } });

  /* =========================================================
     7. Como chegar: a rota se desenha; perguntas abrem suaves
     ========================================================= */
  const asf = $('#rotaAsfalto'), terra = $('#rotaTerra');
  if (asf && !reduz) {
    const L = asf.getTotalLength();
    gsap.set(asf, { strokeDasharray: L, strokeDashoffset: L });
    gsap.timeline({ scrollTrigger: { trigger: '#mapa', start: 'top 85%', end: 'bottom 50%', scrub: true } })
      .to(asf, { strokeDashoffset: 0, ease: 'none', duration: 1 })
      .fromTo(terra, { opacity: 0 }, { opacity: 1, ease: 'none', duration: .35 });
  }
  $$('.faq details').forEach(d => {
    const s = $('summary', d), r = $('.faq-r', d);
    s.addEventListener('click', e => {
      if (reduz) return;
      e.preventDefault();
      if (d.open) gsap.to(r, { height: 0, duration: .5, ease: 'power3.inOut', onComplete: () => { d.open = false; gsap.set(r, { clearProps: 'height' }); ScrollTrigger.refresh(); } });
      else { d.open = true; gsap.fromTo(r, { height: 0 }, { height: 'auto', duration: .65, ease: 'power3.out', onComplete: () => ScrollTrigger.refresh() }); }
    });
  });

  /* =========================================================
     8. Reserva: vídeo do vale ao fundo
     ========================================================= */
  const fundo = $('.reserva-fundo');
  ScrollTrigger.create({ trigger: '#reserva', start: 'top bottom+=100%', once: true, onEnter: () => ligaVideo(fundo, fundo.dataset.src) });
  ScrollTrigger.create({ trigger: '#reserva', start: 'top bottom', end: 'bottom top', onToggle: s => (s.isActive ? toca(fundo) : fundo.pause()) });
  if (!reduz) gsap.fromTo('.form', { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.form', start: 'top 88%', once: true } });

  /* =========================================================
     Topo, menu e botão flutuante
     ========================================================= */
  const topo = $('#topo'), menu = $('#menu'), menuBtn = $('#menuBtn'), cta = $('#ctaFlutua');
  let menuAberto = false, claros = 0, depoisFilme = false, emCabanas = false, emReserva = false;

  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: s => { topo.classList.toggle('escondido', s.direction === 1 && s.scroll() > 240 && !menuAberto); },
  });
  $$('[data-tema="claro"]').forEach(sec => ScrollTrigger.create({
    trigger: sec, start: 'top 36px', end: 'bottom 36px',
    onToggle: s => { claros = Math.max(0, claros + (s.isActive ? 1 : -1)); topo.classList.toggle('tinta', claros > 0); },
  }));

  const atualizaCta = () => cta.classList.toggle('visivel', depoisFilme && !emCabanas && !emReserva && !menuAberto);
  ScrollTrigger.create({ trigger: '#manifesto', start: 'top 40%', end: 'max', onToggle: s => { depoisFilme = s.isActive; atualizaCta(); } });
  ScrollTrigger.create({ trigger: '#cabanas', start: 'top 60%', end: 'bottom 70%', onToggle: s => { emCabanas = s.isActive; atualizaCta(); } });
  ScrollTrigger.create({ trigger: '#reserva', start: 'top 80%', end: 'max', onToggle: s => { emReserva = s.isActive; atualizaCta(); } });

  const tlMenu = gsap.timeline({ paused: true, onReverseComplete: () => { menu.hidden = true; } });
  if (reduz) tlMenu.fromTo(menu, { clipPath: 'inset(0% 0% 0% 0%)', autoAlpha: 0 }, { autoAlpha: 1, duration: .25 });
  else tlMenu.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .85, ease: 'expo.inOut' })
    .fromTo('.menu-lista a', { yPercent: 105 }, { yPercent: 0, duration: 1, stagger: .05, ease: 'expo.out' }, .35)
    .fromTo('.menu-pe', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .7, ease: 'power3.out' }, .6);
  function abreMenu() {
    menuAberto = true; menu.hidden = false; tlMenu.timeScale(1).play();
    menuBtn.setAttribute('aria-expanded', 'true'); topo.classList.add('menu-on'); topo.classList.remove('escondido');
    travaRolagem(true); atualizaCta();
    const a = $('.menu-lista a'); if (a) setTimeout(() => a.focus({ preventScroll: true }), 400);
  }
  function fechaMenu() {
    if (!menuAberto) return;
    menuAberto = false; tlMenu.timeScale(1.7).reverse();
    menuBtn.setAttribute('aria-expanded', 'false'); topo.classList.remove('menu-on');
    travaRolagem(false); atualizaCta();
  }
  menuBtn.addEventListener('click', () => (menuAberto ? fechaMenu() : abreMenu()));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuAberto) { fechaMenu(); menuBtn.focus(); } });

  // links internos
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    if (menuAberto) { fechaMenu(); setTimeout(() => vaiPara(id), 350); } else vaiPara(id);
  }));

  /* ---------- ajustes de tamanho ---------- */
  let largura = innerWidth, tempo = 0;
  addEventListener('resize', () => {
    clearTimeout(tempo);
    tempo = setTimeout(() => { Filme.medidas(); if (innerWidth !== largura) { largura = innerWidth; ScrollTrigger.refresh(); } }, 150);
  });
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
  });
})();
