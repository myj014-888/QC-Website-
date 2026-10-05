/* Ticked feature reel.
 *
 * The cards are in the page as a plain grid. This turns that grid into one of
 * two things and leaves it alone if neither applies:
 *
 *   900px and up   an ellipse of cards — the front card large and readable,
 *                  the rest receding — that autoplays, drags and snaps.
 *   below 900px    one card at a time in a native scroll-snap row, because an
 *                  ellipse of text at 375px is decoration, not information.
 *   no JavaScript  the grid, which is already readable and complete.
 *
 * The maths is one angle per card: card i sits at i·step + rotation on an
 * ellipse of radii (rx, ry).
 *
 *   x = rx·sin θ    y = ry·(1 − cos θ)    scale = min + (1 − min)·(cos θ + 1)/2
 *
 * sin θ slides the card across; cos θ sizes it, stacks it and drops it back,
 * so a card that looks nearer is nearer — the stacking can never disagree with
 * the perspective. Written this way the front card (θ = 0) sits in the middle
 * of the stage rather than out at the right edge, which is where you want the
 * one card someone is actually reading.
 */
(function () {
  'use strict';

  var stage = document.getElementById('tk-reel-stage');
  var dotsBox = document.getElementById('tk-reel-dots');
  if (!stage || !dotsBox) return;

  var ui = stage.parentNode.querySelector('.tk-reel-ui');
  var cards = Array.prototype.slice.call(stage.querySelectorAll('.tk-rc'));
  var count = cards.length;
  if (!count) return;

  var TAU = Math.PI * 2;
  var STEP = TAU / count;
  var MIN_SCALE = 0.62;      // far side of the ring
  var HOLD = 2200;           // ms a card rests at the front
  var STEP_MS = 650;         // ms for one step

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mode = null;           // 'reel' | 'swipe'
  var rotation = 0;          // radians
  var timer = null;
  var raf = null;
  var dragging = false;
  var paused = false;

  /* ── dots ──────────────────────────────────────────────────────────── */
  var dots = cards.map(function (card, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'tk-reel-dot';
    dot.setAttribute('aria-label', 'Show: ' + card.querySelector('h3').textContent.trim());
    dot.addEventListener('click', function () { goTo(i); });
    dotsBox.appendChild(dot);
    return dot;
  });

  function markDot(i) {
    for (var d = 0; d < dots.length; d++) {
      dots[d].setAttribute('aria-current', d === i ? 'true' : 'false');
    }
  }

  /* ── the ring ──────────────────────────────────────────────────────── */
  function frontIndex() {
    // The card at angle 0 is at the front; rotation runs negative as it turns.
    var i = Math.round(-rotation / STEP) % count;
    return (i + count) % count;
  }

  function layout() {
    if (mode !== 'reel') return;
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    var rx = w * 0.34;
    var ry = h * 0.16;
    var front = frontIndex();

    for (var i = 0; i < count; i++) {
      var angle = i * STEP + rotation;
      var cos = Math.cos(angle);
      var sin = Math.sin(angle);
      var scale = MIN_SCALE + (1 - MIN_SCALE) * ((cos + 1) / 2);
      var card = cards[i];

      card.style.transform =
        'translate(' + (sin * rx).toFixed(2) + 'px,' + ((1 - cos) * ry).toFixed(2) + 'px) scale(' + scale.toFixed(3) + ')';
      card.style.zIndex = String(Math.round(scale * 1000));
      // Behind the front card the text is small and half-hidden; dimming it
      // stops the eye trying to read three cards at once.
      card.style.opacity = (0.35 + 0.65 * ((cos + 1) / 2)).toFixed(3);
      if (i === front) card.setAttribute('data-front', '');
      else card.removeAttribute('data-front');
      // Only the card in front is in the reading order.
      card.setAttribute('aria-hidden', i === front ? 'false' : 'true');
    }
    markDot(front);
  }

  function tweenTo(target, ms) {
    if (raf) cancelAnimationFrame(raf);
    // A hidden tab gets no animation frames, so a tween there would leave the
    // ring stuck half-way. Nothing is on screen to animate: jump and be done.
    if (reduce || document.hidden) { rotation = target; layout(); return; }
    var from = rotation;
    var start = performance.now();
    (function frame(now) {
      var t = Math.min(1, (now - start) / ms);
      // ease-out cubic: quick to move, slow to settle
      var e = 1 - Math.pow(1 - t, 3);
      rotation = from + (target - from) * e;
      layout();
      if (t < 1) raf = requestAnimationFrame(frame);
    })(start);
  }

  function goTo(i) {
    if (mode === 'swipe') {
      cards[i].scrollIntoView({
        behavior: (reduce || document.hidden) ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
      markDot(i);
      return;
    }
    tweenTo(-i * STEP, STEP_MS);
    restart();
  }

  function stepBy(dir) {
    var target = Math.round(rotation / STEP) * STEP - dir * STEP;
    tweenTo(target, STEP_MS);
    restart();
  }

  /* ── autoplay ──────────────────────────────────────────────────────── */
  function restart() {
    stop();
    if (mode !== 'reel' || reduce) return;
    timer = window.setTimeout(function tick() {
      if (dragging || paused) { timer = window.setTimeout(tick, HOLD); return; }
      tweenTo(Math.round(rotation / STEP) * STEP - STEP, STEP_MS);
      timer = window.setTimeout(tick, HOLD + STEP_MS);
    }, HOLD);
  }

  function stop() {
    if (timer) { window.clearTimeout(timer); timer = null; }
  }

  /* ── drag ──────────────────────────────────────────────────────────── */
  var dragX = 0;

  function rotationPerPixel() {
    // Dragging the width of the arc turns it a quarter way round.
    return (Math.PI / 2) / Math.max(1, stage.clientWidth * 0.34);
  }

  stage.addEventListener('pointerdown', function (e) {
    if (mode !== 'reel' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragX = e.clientX;
    dragging = true;
    if (raf) cancelAnimationFrame(raf);
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - dragX;
    dragX = e.clientX;
    rotation += dx * rotationPerPixel();
    layout();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (stage.hasPointerCapture && stage.hasPointerCapture(e.pointerId)) {
      stage.releasePointerCapture(e.pointerId);
    }
    tweenTo(Math.round(rotation / STEP) * STEP, 420);   // never rest between cards
    restart();
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('pointerenter', function () { paused = true; });
  stage.addEventListener('pointerleave', function () { paused = false; });

  stage.addEventListener('keydown', function (e) {
    if (mode !== 'reel') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stepBy(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stepBy(-1); }
  });

  if (ui) {
    Array.prototype.forEach.call(ui.querySelectorAll('.tk-reel-btn'), function (btn) {
      btn.addEventListener('click', function () {
        var dir = Number(btn.getAttribute('data-dir'));
        if (mode === 'swipe') {
          goTo((frontSwipe() + dir + count) % count);
        } else {
          stepBy(dir);
        }
      });
    });
  }

  /* ── swipe mode ────────────────────────────────────────────────────── */
  function frontSwipe() {
    var mid = stage.scrollLeft + stage.clientWidth / 2;
    var best = 0;
    var bestGap = Infinity;
    for (var i = 0; i < count; i++) {
      var c = cards[i];
      var centre = c.offsetLeft + c.offsetWidth / 2;
      var gap = Math.abs(centre - mid);
      if (gap < bestGap) { bestGap = gap; best = i; }
    }
    return best;
  }

  var scrollTick = null;
  stage.addEventListener('scroll', function () {
    if (mode !== 'swipe') return;
    if (scrollTick) return;
    scrollTick = window.setTimeout(function () {
      scrollTick = null;
      markDot(frontSwipe());
    }, 90);
  });

  /* ── which mode ────────────────────────────────────────────────────── */
  var wide = window.matchMedia('(min-width: 900px)');

  function apply() {
    var next = wide.matches ? 'reel' : 'swipe';
    if (next === mode) { layout(); return; }
    mode = next;
    stop();
    if (raf) cancelAnimationFrame(raf);

    stage.classList.toggle('is-reel', mode === 'reel');
    stage.classList.toggle('is-swipe', mode === 'swipe');
    if (ui) ui.hidden = false;

    for (var i = 0; i < count; i++) {
      cards[i].style.transform = '';
      cards[i].style.zIndex = '';
      cards[i].style.opacity = '';
      cards[i].removeAttribute('data-front');
      cards[i].removeAttribute('aria-hidden');
    }

    if (mode === 'reel') {
      stage.tabIndex = 0;
      stage.setAttribute('role', 'region');
      stage.setAttribute('aria-roledescription', 'carousel');
      stage.setAttribute('aria-label', 'What Ticked does');
      rotation = Math.round(rotation / STEP) * STEP;
      layout();
      restart();
    } else {
      stage.removeAttribute('tabindex');
      markDot(frontSwipe());
    }
  }

  // The breakpoint is watched directly rather than inferred from resize
  // events: a resize does not always arrive (a device-emulated viewport is one
  // case), and this fires exactly when the answer changes.
  if (wide.addEventListener) wide.addEventListener('change', apply);
  else if (wide.addListener) wide.addListener(apply);

  // Resize still matters inside a mode: the arc is measured from the stage.
  var resizeTick = null;
  window.addEventListener('resize', function () {
    if (resizeTick) window.clearTimeout(resizeTick);
    resizeTick = window.setTimeout(apply, 150);
  });

  // Nothing spins while the section is off screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      paused = !entries[0].isIntersecting;
    }, { threshold: 0.15 }).observe(stage);
  }

  apply();
})();
