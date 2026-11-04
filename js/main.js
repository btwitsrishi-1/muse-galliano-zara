/* MUSE — scroll choreography (GSAP + ScrollTrigger + Lenis) */
(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const body = document.body;

  const hideLoader = () => { const l = $('.loader'); if (l) l.style.display = 'none'; body.classList.remove('is-loading'); };
  if (!window.gsap || !window.ScrollTrigger) { hideLoader(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const goTo = (target) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    const el = $(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    setTimeout(() => goTo(el), menuOpen ? 350 : 0);
  });

  /* ---------- Text splitters ---------- */
  const splitText = (root, mode) => {
    const make = (tok) => {
      const w = document.createElement('span');
      if (mode === 'mask') { w.className = 'word'; const i = document.createElement('span'); i.textContent = tok; w.append(i); }
      else { w.className = 'fw'; w.textContent = tok; }
      return w;
    };
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/( +)/).forEach((tok) => {
            if (!tok) return;
            if (/^ +$/.test(tok)) frag.append(document.createTextNode(' '));
            else frag.append(make(tok));
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.classList.contains('dropcap')) walk(n);
      });
    };
    walk(root);
    return mode === 'mask' ? $$('.word > span', root) : $$('.fw', root);
  };

  /* ---------- Menu ---------- */
  const menu = $('#menu'), menuBtn = $('#menuBtn'), mast = $('#masthead');
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mast.classList.toggle('menu-open', open);
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  function closeMenu() { if (menuOpen) setMenu(false); }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Cursor + magnet ---------- */
  const cursor = $('.cursor');
  if (cursor && matchMedia('(hover:hover) and (pointer:fine)').matches && !reduce) {
    const qx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
    const qy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('mousemove', (e) => { cursor.classList.add('is-on'); qx(e.clientX); qy(e.clientY); });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
    document.addEventListener('mouseover', (e) => {
      const t = e.target;
      cursor.classList.toggle('is-link', !!t.closest('a,button'));
      cursor.classList.toggle('is-view', !!t.closest('.img-mask') && !t.closest('a,button'));
    });
    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.22, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,.4)' }));
    });
  }

  if (reduce) { hideLoader(); setupStatic(); return; }

  /* ---------- Pre-split text ---------- */
  const maskTargets = $$('.split-title, .reveal-lines').map((el) => ({ el, words: splitText(el, 'mask') }));
  const fillTargets = $$('.fill-words').map((el) => ({ el, words: splitText(el, 'fill') }));

  /* ======================================================
     INTRO
     ====================================================== */
  const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  gsap.set('.cover__title .line__in', { yPercent: 118 });
  gsap.set(['.cover__kicker span', '.cover .btn', '.cover__scroll', '.cover__star'], { opacity: 0 });
  gsap.set('.masthead', { yPercent: -100 });
  intro
    .fromTo('.loader__mark span', { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.09 })
    .to('.loader__bar i', { scaleX: 1, duration: 1.3, ease: 'power2.inOut' }, 0.15)
    .to('.loader', { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '+=0.15')
    .add(() => { body.classList.remove('is-loading'); if (lenis) lenis.start(); ScrollTrigger.refresh(); }, '-=0.6')
    .from('.cover__img', { scale: 1.3, duration: 2.6 }, '<0.05')
    .to('.cover__title .line__in', { yPercent: 0, duration: 1.5, stagger: 0.14 }, '<0.25')
    .to('.masthead', { yPercent: 0, duration: 1.2 }, '<0.1')
    .to(['.cover__kicker span', '.cover .btn', '.cover__scroll'], { opacity: 1, duration: 1.2, stagger: 0.12, ease: 'power2.out' }, '<0.5')
    .to('.cover__star', { opacity: 0.85, duration: 1.6, stagger: 0.2, ease: 'power2.out' }, '<0.2');
  setTimeout(() => { if ($('.loader').style.display !== 'none' && body.classList.contains('is-loading')) { /* safety */ intro.progress(1); } }, 6500);

  /* ======================================================
     GLOBAL / HEADER
     ====================================================== */
  gsap.to('.progress i', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

  ScrollTrigger.create({
    trigger: '.cover', start: 'bottom top+=90',
    onEnter: () => mast.classList.add('is-solid'),
    onLeaveBack: () => mast.classList.remove('is-solid'),
  });

  const links = $$('.masthead__nav a'), railLinks = $$('.rail a');
  const setActive = (id) => {
    links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    railLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.t === id));
  };
  [['cover', '#cover'], ...$$('[data-chapter]').map((s) => [s.dataset.chapter, '#' + s.id])].forEach(([id, sel]) => {
    ScrollTrigger.create({ trigger: sel, start: 'top 55%', end: 'bottom 55%', onToggle: (s) => s.isActive && setActive(id) });
  });

  /* ---------- Cover scroll-out ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.cover', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.cover__media', { yPercent: 14, ease: 'none' }, 0)
    .to('.cover__content', { yPercent: -18, opacity: 0, ease: 'none' }, 0)
    .to('.cover__scroll', { opacity: 0 }, 0)
    .to('.cover__star--a', { y: -160, ease: 'none' }, 0)
    .to('.cover__star--b', { y: -90, ease: 'none' }, 0);

  /* ---------- Ticker: scroll-velocity marquee ---------- */
  const track = $('.ticker__track');
  if (track) {
    track.style.animation = 'none';
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      onUpdate: (self) => {
        const v = self.getVelocity();
        gsap.to(loop, { timeScale: (self.direction === 1 ? 1 : -1) * clamp(1 + Math.abs(v) / 260, 1, 9), duration: 0.2, overwrite: true });
        gsap.to(loop, { timeScale: self.direction === 1 ? 1 : -1, duration: 1.2, delay: 0.2 });
        gsap.to(track, { skewX: clamp(v / -500, -9, 9), duration: 0.4, overwrite: 'auto' });
        gsap.to(track, { skewX: 0, duration: 0.8, delay: 0.25 });
      },
    });
  }

  /* ======================================================
     GENERIC REVEALS
     ====================================================== */
  maskTargets.forEach(({ el, words }) => {
    gsap.from(words, { yPercent: 118, duration: 1.2, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: el, start: 'top 86%' } });
  });
  fillTargets.forEach(({ el, words }) => {
    gsap.fromTo(words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', duration: 2.4, stagger: 1,
      scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 50%', scrub: 0.6 },
    });
  });
  $$('.fade-up').forEach((el) => {
    gsap.from(el, { y: 46, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('.chapter__head').forEach((el) => {
    gsap.from(el.children, { y: 30, opacity: 0, duration: 1, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('.img-mask').forEach((mask) => {
    const img = $('img', mask);
    gsap.from(mask, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: mask, start: 'top 88%' } });
    gsap.from(img, { scale: 1.3, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: mask, start: 'top 88%' } });
    gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: mask, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- Picture backgrounds: slow parallax ---------- */
  $$('.bgimg').forEach((b) => {
    const trig = b.closest('.band, section, .timeline, .blade, .split') || b.parentElement;
    gsap.fromTo($('img', b), { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: trig, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- I · Return ---------- */
  gsap.to('.badge', { rotation: 360, ease: 'none', scrollTrigger: { trigger: '#return', start: 'top bottom', end: 'bottom top', scrub: 0.4 } });
  gsap.from('.badge', { scale: 0, duration: 1.2, ease: 'elastic.out(1,.55)', scrollTrigger: { trigger: '.return__fig', start: 'top 60%' } });
  gsap.to('.return__fig', { yPercent: -6, ease: 'none', scrollTrigger: { trigger: '.return__grid', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- II · Question + scales ---------- */
  gsap.to('.question__hanger', { rotation: 6, y: 160, ease: 'none', scrollTrigger: { trigger: '.question', start: 'top bottom', end: 'bottom top', scrub: true } });
  setupScales();

  /* ---------- III · Archive ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const scroller = $('.timeline__scroller'), thread = $('#thread'), path = $('#threadPath'), needle = $('#needle');
    const cards = $$('.stop .card');
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;

    const lenAtX = (x) => { // x in viewBox units -> path length (x is monotonic)
      let lo = 0, hi = len;
      for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; path.getPointAtLength(mid).x < x ? (lo = mid) : (hi = mid); }
      return (lo + hi) / 2;
    };
    const dist = () => Math.max(0, scroller.scrollWidth - innerWidth);
    const place = (p) => {
      const W = scroller.scrollWidth, vw = innerWidth;
      const sx = thread.clientWidth / 4000, sy = thread.clientHeight / 300;
      const screenX = dist() * p + vw * (0.1 + 0.72 * p);
      const L = lenAtX((screenX / sx));
      const pt = path.getPointAtLength(L), pt2 = path.getPointAtLength(Math.min(len, L + 3));
      const top = scroller.clientHeight / 2 - thread.clientHeight / 2;
      gsap.set(needle, { x: pt.x * sx, y: top + pt.y * sy, xPercent: -50, yPercent: -50, rotation: Math.atan2((pt2.y - pt.y) * sy, (pt2.x - pt.x) * sx) * 180 / Math.PI });
      path.style.strokeDashoffset = len - L;
      cards.forEach((c) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - vw / 2) / (vw / 2);
        c.style.opacity = clamp(1.3 - d * 0.5, 0.78, 1);
      });
    };
    gsap.timeline({
      scrollTrigger: {
        trigger: '.timeline', refreshPriority: 3, start: 'top top', end: () => '+=' + dist() * 1.05, pin: '.timeline__pin', scrub: 0.7,
        anticipatePin: 1, invalidateOnRefresh: true, onUpdate: (s) => place(s.progress), onRefresh: (s) => place(s.progress),
      },
    }).to(scroller, { x: () => -dist(), ease: 'none' });
    place(0);
    return () => { gsap.set([scroller, needle], { clearProps: 'all' }); cards.forEach((c) => (c.style.opacity = '')); path.style.strokeDashoffset = 0; };
  });

  gsap.from('.waitzara span', { yPercent: 40, opacity: 0, rotation: -3, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.waitzara', start: 'top 85%' } });
  gsap.from('.waitzara em', { xPercent: 20, opacity: 0, duration: 1.4, delay: 0.25, ease: 'expo.out', scrollTrigger: { trigger: '.waitzara', start: 'top 85%' } });

  // Couture ↔ High Street wipe
  gsap.timeline({ scrollTrigger: { trigger: '.split', refreshPriority: 2, start: 'top top', end: '+=130%', pin: '.split__pin', scrub: 0.5 } })
    .fromTo('.split__side--b', { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
    .fromTo('.split__edge', { left: '100%' }, { left: '0%', ease: 'none' }, 0)
    .fromTo('.split__side--a > *:not(.glyph)', { x: 0 }, { x: -90, opacity: 0.2, ease: 'none', stagger: 0.03 }, 0)
    .fromTo('.split__side--b > *:not(.glyph)', { x: 120, opacity: 0.2 }, { x: 0, opacity: 1, ease: 'none', stagger: 0.03 }, 0)
    .fromTo('.split__glyph', { rotation: 0 }, { rotation: 180, ease: 'none' }, 0);

  // the three answers: draw each glyph
  $$('.third').forEach((t, i) => {
    const shapes = $$('circle, path', t);
    shapes.forEach((s) => { const l = s.getTotalLength(); s.style.strokeDasharray = l; s.style.strokeDashoffset = l; });
    ScrollTrigger.create({
      trigger: t, start: 'top 85%', once: true,
      onEnter: () => {
        gsap.to(shapes, { strokeDashoffset: 0, duration: 1.8, ease: 'power2.inOut', stagger: 0.12, delay: i * 0.18 });
        gsap.from($('h4', t), { opacity: 0, y: 14, duration: 1, delay: 0.5 + i * 0.18 });
      },
    });
  });

  /* ---------- IV · Deal ---------- */
  gsap.timeline({ scrollTrigger: { trigger: '.reach', start: 'top 70%', end: 'center 45%', scrub: 1 } })
    .fromTo('.reach__word span, .reach__word b', { yPercent: 110, rotation: 6, opacity: 0 }, { yPercent: 0, rotation: 0, opacity: 1, stagger: 0.22, ease: 'power3.out' }, 0);
  gsap.fromTo('.reach__ring', { scale: 0.35, rotation: -30 }, { scale: 1.15, rotation: 40, ease: 'none', scrollTrigger: { trigger: '.reach', start: 'top bottom', end: 'bottom top', scrub: true } });
  $$('.reach__ring circle').forEach((c, i) => gsap.to(c, { scale: 1 + i * 0.04, transformOrigin: '50% 50%', repeat: -1, yoyo: true, duration: 2 + i * 0.6, ease: 'sine.inOut' }));

  // Re{form}
  gsap.timeline({ scrollTrigger: { trigger: '#reform', start: 'top 82%', toggleActions: 'play none none reverse' }, defaults: { ease: 'expo.out', duration: 1.5 } })
    .from('#reform .r', { xPercent: -40, opacity: 0 }, 0)
    .from('#reform .f', { xPercent: 40, opacity: 0 }, 0)
    .from('#reform .b1', { x: -120, opacity: 0, rotation: -25 }, 0.25)
    .from('#reform .b2', { x: 120, opacity: 0, rotation: 25 }, 0.25);

  // scissors cut a dashed line
  (() => {
    const sc = $('#scissors'); if (!sc) return;
    const cut = $('.scissors__cut', sc), tool = $('.scissors__tool', sc), a = $('.blade-a', sc), b = $('.blade-b', sc);
    const L = cut.getTotalLength();
    cut.style.strokeDasharray = L; cut.style.strokeDashoffset = L;
    const snip = gsap.timeline({ repeat: -1, yoyo: true, paused: false })
      .to(a, { rotation: -9, svgOrigin: '103 45', duration: 0.18, ease: 'sine.inOut' }, 0)
      .to(b, { rotation: 9, svgOrigin: '103 45', duration: 0.18, ease: 'sine.inOut' }, 0);
    const travel = 250;
    gsap.timeline({ scrollTrigger: { trigger: sc, start: 'top 88%', end: 'bottom 40%', scrub: 0.5 } })
      .to(tool, { x: travel, ease: 'none' }, 0)
      .to(cut, { strokeDashoffset: L - (130 + travel - 10), ease: 'none' }, 0);
  })();

  gsap.from('.stack__a', { y: 80, duration: 1, ease: 'none', scrollTrigger: { trigger: '.reform__stack', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.stack__b', { y: 120 }, { y: -90, ease: 'none', scrollTrigger: { trigger: '.reform__stack', start: 'top bottom', end: 'bottom top', scrub: true } });

  gsap.from('.potentially span', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.potentially', start: 'top 85%' } });
  gsap.to('.potentially span', { '--u': 1, ease: 'none', scrollTrigger: { trigger: '.potentially', start: 'top 70%', end: 'bottom 40%', scrub: true } });

  // blinking eye
  gsap.from('.eye svg', { scale: 0.3, opacity: 0, duration: 1.2, ease: 'back.out(1.8)', scrollTrigger: { trigger: '.eye', start: 'top 92%' } });
  gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 1 }).to('.eye svg', { scaleY: 0.06, duration: 0.11, yoyo: true, repeat: 1, ease: 'power2.in' });

  // drifting gallery
  const row = $('.gallery__row');
  if (row) gsap.fromTo(row, { x: 0 }, { x: () => -(row.scrollWidth - innerWidth + 32), ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: 0.8, invalidateOnRefresh: true } });

  /* ---------- V · Equation ---------- */
  gsap.from('.eq__formula > *', { opacity: 0, y: 18, duration: 0.9, stagger: 0.18, ease: 'power3.out', scrollTrigger: { trigger: '.eq__formula', start: 'top 92%' } });

  // double-edged blade (pinned)
  (() => {
    const svg = $('.blade__svg'); if (!svg) return;
    const parts = $$('path, circle', svg);
    parts.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    gsap.timeline({ scrollTrigger: { trigger: '.blade', refreshPriority: 1, start: 'top top', end: '+=170%', pin: '.blade__pin', scrub: 0.6 } })
      .fromTo('.blade__title', { opacity: 0.2 }, { opacity: 1, duration: 0.3 }, 0)
      .to(parts, { strokeDashoffset: 0, stagger: 0.12, duration: 0.6, ease: 'power1.inOut' }, 0)
      .fromTo('.blade__side--l', { x: -110, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.7)
      .fromTo('.blade__side--r', { x: 110, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.9)
      .fromTo(svg, { rotation: -8 }, { rotation: 8, duration: 1.4, ease: 'sine.inOut' }, 0);
  })();

  /* ---------- VI · Beyond the report ---------- */
  $$('.move').forEach((m, i) => {
    const paths = $$('.d', m);
    paths.forEach((p) => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    gsap.from(m, { y: 50, opacity: 0, duration: 1.1, delay: i * 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.moves', start: 'top 85%' } });
    ScrollTrigger.create({ trigger: '.moves', start: 'top 80%', once: true, onEnter: () => gsap.to(paths, { strokeDashoffset: 0, duration: 1.8, delay: 0.3 + i * 0.25, stagger: 0.15, ease: 'power2.inOut' }) });
  });
  gsap.from('.context__pull', { clipPath: 'inset(0 100% 0 0)', duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.context__pull', start: 'top 85%' } });
  $$('[data-count]').forEach((el) => {
    const target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), pre = el.dataset.prefix || '';
    const state = { v: 0 };
    const fmt = (v) => pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    ScrollTrigger.create({
      trigger: '#gap', start: 'top 75%', once: true,
      onEnter: () => gsap.to(state, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => (el.textContent = fmt(state.v)) }),
    });
  });
  gsap.from('.gap__vs', { scale: 0, rotation: -40, duration: 1.2, ease: 'elastic.out(1,.5)', scrollTrigger: { trigger: '#gap', start: 'top 70%' } });
  gsap.from('.act', { y: 40, opacity: 0, duration: 1, stagger: 0.18, ease: 'power3.out', scrollTrigger: { trigger: '.acts__list', start: 'top 88%' } });
  const stepsLine = $('.steps__line path');
  if (stepsLine) {
    stepsLine.setAttribute('pathLength', '1');
    stepsLine.style.strokeDasharray = '1';
    stepsLine.style.strokeDashoffset = '1';
    gsap.to(stepsLine, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps__list', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 } });
  }
  gsap.from('.steps__list li', { x: 40, opacity: 0, duration: 1, stagger: 0.15, ease: 'power3.out', scrollTrigger: { trigger: '.steps__list', start: 'top 85%' } });
  gsap.from('.reckon', { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.reckon', start: 'top 88%' } });

  /* ---------- Finale & footer ---------- */
  gsap.to('.finale__star--a', { y: -120, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.to('.finale__star--b', { y: 140, ease: 'none', scrollTrigger: { trigger: '.finale', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.footer__big span', { yPercent: 110, duration: 1.4, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.footer__big', start: 'top 92%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

  /* ======================================================
     Scales — the interactive verdict
     ====================================================== */
  function setupScales() {
    const beam = $('.scale__beam'), pl = $('.scale__pan--l'), pr = $('.scale__pan--r');
    if (!beam) return;
    const notes = {
      talent: 'Leaning towards talent. The report’s question is what the industry is willing to overlook.',
      conduct: 'Leaning towards conduct. The report’s question is what a comeback signals to everyone watching.',
    };
    const st = { t: 0 };
    const apply = () => {
      const r = (st.t * Math.PI) / 180;
      const dx = 140 * (1 - Math.cos(r)), dy = 140 * Math.sin(r);
      gsap.set(beam, { rotation: st.t, svgOrigin: '200 60' });
      gsap.set(pl, { x: dx, y: -dy });
      gsap.set(pr, { x: -dx, y: dy });
    };
    apply();
    let idle = null;
    const sway = () => { idle = gsap.timeline({ repeat: -1, yoyo: true }).to(st, { t: 3, duration: 2.2, ease: 'sine.inOut', onUpdate: apply }).to(st, { t: -3, duration: 2.2, ease: 'sine.inOut', onUpdate: apply }); };
    const choose = (side, animate = true) => {
      if (idle) { idle.kill(); idle = null; }
      $$('.choice').forEach((c) => { const on = c.dataset.side === side; c.classList.toggle('is-chosen', on); c.setAttribute('aria-pressed', String(on)); });
      $('#scaleNote').textContent = notes[side];
      gsap.to(st, { t: side === 'talent' ? -14 : 14, duration: animate ? 1.8 : 0.01, ease: 'elastic.out(1,.35)', onUpdate: apply, overwrite: true });
      try { localStorage.setItem('muse-verdict', side); } catch (e) { /* storage may be unavailable */ }
    };
    $$('.choice').forEach((c) => c.addEventListener('click', () => choose(c.dataset.side)));
    let saved = null; try { saved = localStorage.getItem('muse-verdict'); } catch (e) { /* ignore */ }
    ScrollTrigger.create({
      trigger: '#scale', start: 'top 80%', once: true,
      onEnter: () => (saved && notes[saved] ? choose(saved) : sway()),
    });
    gsap.from('.scale__svg', { opacity: 0, y: 50, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '#scale', start: 'top 85%' } });
  }

  /* Static fallback for reduced motion: just make the scales usable. */
  function setupStatic() {
    const notes = {
      talent: 'Leaning towards talent. The report’s question is what the industry is willing to overlook.',
      conduct: 'Leaning towards conduct. The report’s question is what a comeback signals to everyone watching.',
    };
    $$('.choice').forEach((c) => c.addEventListener('click', () => {
      $$('.choice').forEach((x) => x.classList.toggle('is-chosen', x === c));
      $('#scaleNote').textContent = notes[c.dataset.side];
    }));
    mast.classList.add('is-solid');
  }
})();
