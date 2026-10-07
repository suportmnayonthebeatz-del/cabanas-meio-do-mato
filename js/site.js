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
    const WHATS = '5521967957067';
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
    const c = $('#filmeCanvas'); if (c) c.style.background = 'url(media/filme/m/f121.webp) center / cover';
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
  if (!reduz && window.Lenis) {
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
     1. FILME — quadros do reel num canvas
     ========================================================= */
  const Filme = (() => {
    const cv = $('#filmeCanvas'), ctx = cv.getContext('2d', { alpha: false });
    const N = 129;
    const conj = Math.min(innerWidth, innerHeight * 1.2) >= 900 || innerWidth >= 1100 ? 'd' : 'm';
    // trechos do reel (números dos quadros), peso na rolagem e zoom
    const SEG = [
      { a: 1, b: 4, w: .9, z0: 1, z1: 1.24, nome: 'A placa' },
      { a: 5, b: 10, w: .8, z0: 1.02, z1: 1.14, nome: 'A estrada' },
      { a: 11, b: 120, w: 6, z0: 1, z1: 1, nome: 'A chegada' },
      { a: 121, b: 129, w: 1.3, z0: 1.16, z1: 1, nome: 'A vista' },
    ];
    let acc = 0; SEG.forEach(s => { s.s = acc; acc += s.w; s.e = acc; });
    const TOTAL = acc, FUNDE = .3;
    const imgs = new Array(N + 1), ok = new Uint8Array(N + 1);
    const tiny = document.createElement('canvas'); tiny.width = 18; tiny.height = 32;
    const tctx = tiny.getContext('2d');
    const estado = { t: 0 };
    let W = 0, H = 0, dpr = 1, painel = false, P = null, sujo = true, ultimoT = -1, ativo = true;
    const hudBarra = $('#hudBarra'), hudTempo = $('#hudTempo'), hudCena = $('#hudCena');
    let hudNome = '';

    const url = n => `media/filme/${conj}/f${String(n).padStart(3, '0')}.webp`;

    function ordem() {
      const vis = new Set(), out = [];
      const poe = n => { if (n >= 1 && n <= N && !vis.has(n)) { vis.add(n); out.push(n); } };
      [1, 5, 11, 121, 4, 10, 120, 129].forEach(poe);
      [16, 8, 4, 2, 1].forEach(p => { for (let i = 1; i <= N; i += p) poe(i); });
      return out;
    }
    function carregaUm(n) {
      return new Promise(res => {
        const im = new Image(); im.decoding = 'async';
        im.onload = () => {
          const fim = () => { imgs[n] = im; ok[n] = 1; sujo = true; res(); };
          im.decode ? im.decode().then(fim, fim) : fim();
        };
        im.onerror = () => res();
        im.src = url(n);
      });
    }
    // carrega do mais espaçado ao mais fino; resolve "pronto" quando ~1/4 dos quadros chegou
    const PRONTO = 36;
    let avisaProgresso = () => {};
    const pronto = new Promise(resolve => {
      const lista = ordem(); let i = 0, feitos = 0, ativos = 0;
      const prox = () => {
        while (ativos < 6 && i < lista.length) {
          const n = lista[i++]; ativos++;
          carregaUm(n).then(() => {
            ativos--; feitos++;
            avisaProgresso(Math.min(1, feitos / PRONTO));
            if (feitos === PRONTO || feitos === lista.length) resolve();
            prox();
          });
        }
      };
      prox();
    });

    function perto(n, s) {
      if (ok[n]) return imgs[n];
      for (let d = 1; d < N; d++) {
        const a = n - d, b = n + d;
        if (a >= s.a && ok[a]) return imgs[a];
        if (b <= s.b && ok[b]) return imgs[b];
        if (a < s.a && b > s.b) break;
      }
      for (let d = 1; d < N; d++) { if (n - d >= 1 && ok[n - d]) return imgs[n - d]; if (n + d <= N && ok[n + d]) return imgs[n + d]; }
      return null;
    }

    function medidas() {
      const r = cv.getBoundingClientRect();
      const nd = Math.min(2, devicePixelRatio || 1);
      if (Math.abs(r.width - W) < 1 && Math.abs(r.height - H) < 1 && nd === dpr) return;
      W = r.width; H = r.height; dpr = nd;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      painel = W / H > 1.02 && W >= 900;
      if (painel) { const h = Math.min(H * .84, 1040), w = h * 9 / 16; P = { w, h, x: W * .7 - w / 2, y: (H - h) / 2 }; }
      sujo = true;
    }
    function cobre(src, sw, sh, x, y, w, h, z) {
      const s = Math.max(w / sw, h / sh) * z, dw = sw * s, dh = sh * s;
      ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    }
    function pinta(im, alfa, z) {
      if (!im || alfa <= .002) return;
      const iw = im.naturalWidth, ih = im.naturalHeight;
      ctx.globalAlpha = alfa;
      if (painel) {
        tctx.globalAlpha = 1; tctx.drawImage(im, 0, 0, tiny.width, tiny.height);
        tctx.fillStyle = 'rgba(8,11,9,.5)'; tctx.fillRect(0, 0, tiny.width, tiny.height);
        ctx.imageSmoothingQuality = 'low';
        cobre(tiny, tiny.width, tiny.height, 0, 0, W, H, 1.2);
        ctx.imageSmoothingQuality = 'high';
        ctx.save(); ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(P.x, P.y, P.w, P.h, 20); else ctx.rect(P.x, P.y, P.w, P.h);
        ctx.clip(); cobre(im, iw, ih, P.x, P.y, P.w, P.h, z); ctx.restore();
      } else cobre(im, iw, ih, 0, 0, W, H, z);
      ctx.globalAlpha = 1;
    }
    function segmento(i, u, alfa) {
      const s = SEG[i], pos = s.a + u * (s.b - s.a), f0 = Math.floor(pos), fr = pos - f0;
      const z = s.z0 + (s.z1 - s.z0) * suave(u);
      const im0 = perto(f0, s); pinta(im0, alfa, z);
      if (fr > .02 && f0 < s.b) { const im1 = perto(f0 + 1, s); if (im1 && im1 !== im0) pinta(im1, alfa * fr, z); }
    }
    function desenha() {
      const t = clamp(estado.t, 0, TOTAL);
      let i = SEG.findIndex(s => t < s.e); if (i < 0) i = SEG.length - 1;
      const s = SEG[i], u = clamp((t - s.s) / s.w);
      ctx.fillStyle = '#0b0f0c'; ctx.fillRect(0, 0, W, H);
      segmento(i, u, 1);
      if (i < SEG.length - 1 && t > s.e - FUNDE) segmento(i + 1, 0, suave((t - (s.e - FUNDE)) / FUNDE));
      if (painel) { ctx.strokeStyle = 'rgba(244,241,235,.14)'; ctx.lineWidth = 1; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(P.x + .5, P.y + .5, P.w - 1, P.h - 1, 20); else ctx.rect(P.x, P.y, P.w, P.h); ctx.stroke(); }
      // painel de tempo
      hudBarra.style.transform = `scaleX(${t / TOTAL})`;
      hudTempo.textContent = '00:' + String(Math.min(19, Math.round(t / TOTAL * 19))).padStart(2, '0');
      if (hudNome !== s.nome) { hudNome = s.nome; hudCena.textContent = s.nome; }
    }
    function tick() {
      if (!ativo) return;
      if (sujo || estado.t !== ultimoT) { ultimoT = estado.t; sujo = false; desenha(); }
    }
    medidas();
    gsap.ticker.add(tick);
    return {
      TOTAL, estado, pronto, medidas,
      onProgresso: f => { avisaProgresso = f; },
      ativa: v => { ativo = v; if (v) sujo = true; },
    };
  })();

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
      tl.from('#capTitulo, #topo, .hud, #dica', { autoAlpha: 0, duration: .8, clearProps: 'opacity,visibility' });
      return tl;
    }
    tl.fromTo('#filmeCanvas', { scale: 1.14 }, { scale: 1, duration: 2.4, ease: 'expo.out' }, 0);
    if (tituloSplit) tl.from(tituloSplit.chars, { yPercent: 118, duration: 1.5, stagger: .045, ease: 'expo.out' }, .15);
    tl.from('#capTitulo .reveal', { autoAlpha: 0, y: 20, duration: 1.1, stagger: .12, ease: 'power3.out' }, .5)
      .from('#topo', { autoAlpha: 0, y: -18, duration: 1.1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }, .55)
      .from('#dica, .hud', { autoAlpha: 0, duration: 1.2 }, .9);
    return tl;
  }

  let liberado = false;
  async function libera() {
    if (liberado) return; liberado = true;
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
    scrollTrigger: { trigger: filmeEl, start: 'top top', end: () => '+=' + fimFilme(), scrub: reduz ? true : .8, invalidateOnRefresh: true },
  });
  tlFilme.to(Filme.estado, { t: Filme.TOTAL, duration: Filme.TOTAL }, 0);
  tlFilme.to('#dica', { autoAlpha: 0, duration: .15 }, .05);
  tlFilme.to('#capTitulo', reduz ? { autoAlpha: 0, duration: .3 } : { autoAlpha: 0, yPercent: -12, duration: .4, ease: 'power2.in' }, .3);

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
      .to(palco, { scale: .9, yPercent: -3, borderRadius: 28, ease: 'none' }, 0)
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
    if (prox) gsap.to(dentro, { scale: .92, '--sombra': .6, ease: 'none', scrollTrigger: { trigger: prox, start: 'top bottom', end: () => 'top ' + (parseFloat(getComputedStyle(prox).top) || 80) + 'px', scrub: true, invalidateOnRefresh: true } });
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
    ScrollTrigger.create({ trigger: c, start: 'top bottom', endTrigger: prox, end: 'top top', onToggle: s => (s.isActive ? toca(v) : v.pause()) });
    const h = $('h3', c), extras = $$('.cena-txt > :not(h3), .cena-n', c);
    if (reduz) return;
    gsap.timeline({ scrollTrigger: { trigger: c, start: 'top bottom', end: 'top top', scrub: true } })
      .fromTo(dentro, { clipPath: 'inset(14% 6% 0% 6% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
      .fromTo(v, { scale: 1.32 }, { scale: 1, ease: 'none' }, 0);
    gsap.to(dentro, { scale: .88, '--sombra': .75, ease: 'none', scrollTrigger: { trigger: prox, start: 'top bottom', end: 'top top', scrub: true } });
    const sp = palavras(h);
    const tl = gsap.timeline({ paused: true });
    if (sp) tl.fromTo(sp.words, { yPercent: 115 }, { yPercent: 0, duration: 1.2, stagger: .06, ease: 'expo.out' }, 0);
    tl.fromTo(extras, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .9, stagger: .08, ease: 'power3.out' }, .15);
    ScrollTrigger.create({ trigger: c, start: 'top 45%', onEnter: () => tl.play(), onLeaveBack: () => tl.reverse() });
  });

  /* =========================================================
     5. Comodidades: cartões, luz que segue o dedo/mouse
     ========================================================= */
  $$('.b-card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
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
})();
