// Animated gradient background — WebGL2 noise/shape shader, vanilla port, zero dependencies.
// Gold / silver / bronze only, no pink — swapped in place of the original Aurora accent color.
(function () {
  var VERT = '#version 300 es\nin vec4 a_position;\nvoid main(){ gl_Position = a_position; }';

  var FRAG = [
    '#version 300 es',
    'precision highp float;',
    'uniform float u_time;',
    'uniform float u_pixelRatio;',
    'uniform vec2 u_resolution;',
    'uniform float u_scale;',
    'uniform float u_rotation;',
    'uniform vec4 u_color1;',
    'uniform vec4 u_color2;',
    'uniform vec4 u_color3;',
    'uniform float u_proportion;',
    'uniform float u_softness;',
    'uniform float u_shape;',
    'uniform float u_shapeScale;',
    'uniform float u_distortion;',
    'uniform float u_swirl;',
    'uniform float u_swirlIterations;',
    'out vec4 fragColor;',
    '#define TWO_PI 6.28318530718',
    '#define PI 3.14159265358979323846',
    'vec2 rotate(vec2 uv, float th) { return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }',
    'float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }',
    'float noise(vec2 st) {',
    '  vec2 i = floor(st); vec2 f = fract(st);',
    '  float a = random(i); float b = random(i + vec2(1.0, 0.0));',
    '  float c = random(i + vec2(0.0, 1.0)); float d = random(i + vec2(1.0, 1.0));',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float x1 = mix(a, b, u.x); float x2 = mix(c, d, u.x);',
    '  return mix(x1, x2, u.y);',
    '}',
    'vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {',
    '  vec3 color1 = c1.rgb * c1.a; vec3 color2 = c2.rgb * c2.a; vec3 color3 = c3.rgb * c3.a;',
    '  float r1 = smoothstep(.0 + .35 * edgesWidth, .7 - .35 * edgesWidth + .5 * edge_blur, mixer);',
    '  float r2 = smoothstep(.3 + .35 * edgesWidth, 1. - .35 * edgesWidth + edge_blur, mixer);',
    '  vec3 blended_color_2 = mix(color1, color2, r1);',
    '  float blended_opacity_2 = mix(c1.a, c2.a, r1);',
    '  vec3 c = mix(blended_color_2, color3, r2);',
    '  float o = mix(blended_opacity_2, c3.a, r2);',
    '  return vec4(c, o);',
    '}',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution.xy;',
    '  float t = .5 * u_time;',
    '  float noise_scale = .0005 + .006 * u_scale;',
    '  uv -= .5;',
    '  uv *= (noise_scale * u_resolution);',
    '  uv = rotate(uv, u_rotation * .5 * PI);',
    '  uv /= u_pixelRatio;',
    '  uv += .5;',
    '  float n1 = noise(uv * 1. + t);',
    '  float n2 = noise(uv * 2. - t);',
    '  float angle = n1 * TWO_PI;',
    '  uv.x += 4. * u_distortion * n2 * cos(angle);',
    '  uv.y += 4. * u_distortion * n2 * sin(angle);',
    '  float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));',
    '  for (float i = 1.; i <= iterations_number; i++) {',
    '    uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);',
    '    uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);',
    '  }',
    '  float proportion = clamp(u_proportion, 0., 1.);',
    '  float shape = 0.; float mixer = 0.;',
    '  if (u_shape < .5) {',
    '    vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);',
    '    shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);',
    '    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);',
    '  } else if (u_shape < 1.5) {',
    '    vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);',
    '    float f = fract(stripes_shape_uv.y);',
    '    shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);',
    '    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);',
    '  } else {',
    '    float sh = 1. - uv.y; sh -= .5; sh /= (noise_scale * u_resolution.y); sh += .5;',
    '    float shape_scaling = .2 * (1. - u_shapeScale);',
    '    shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));',
    '    mixer = shape;',
    '  }',
    '  vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);',
    '  fragColor = vec4(color_mix.rgb, color_mix.a);',
    '}'
  ].join('\n');

  var SHAPES = { checks: 0, stripes: 1, edge: 2 };

  function hexToRgba(hex) {
    var h = (hex || '#000000').replace('#', '');
    var r = parseInt(h.slice(0, 2), 16) / 255;
    var g = parseInt(h.slice(2, 4), 16) / 255;
    var b = parseInt(h.slice(4, 6), 16) / 255;
    return [r, g, b, 1];
  }

  function initAnimatedGradient(canvas, opts) {
    opts = opts || {};
    var color1 = hexToRgba(opts.color1 || '#0a0704');
    var color2 = hexToRgba(opts.color2 || '#2a1f10');
    var color3 = hexToRgba(opts.color3 || '#E4C580');
    var rotation = (opts.rotation || 0) * Math.PI / 180;
    var proportion = (opts.proportion != null ? opts.proportion : 60) / 100;
    var scale = opts.scale != null ? opts.scale : 0.6;
    var speed = (opts.speed != null ? opts.speed : 15) / 100 * 5;
    var offset = opts.offset != null ? opts.offset : 200;
    var distortion = (opts.distortion != null ? opts.distortion : 40) / 50;
    var swirl = (opts.swirl != null ? opts.swirl : 80) / 100;
    var swirlIterations = opts.swirlIterations != null ? opts.swirlIterations : 10;
    var softness = (opts.softness != null ? opts.softness : 100) / 100;
    var shape = SHAPES[(opts.shape || 'edge').toLowerCase()];
    if (shape === undefined) shape = SHAPES.edge;
    var shapeScale = (opts.shapeSize != null ? opts.shapeSize : 50) / 100;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) { canvas.style.display = 'none'; return; }

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { canvas.style.display = 'none'; return null; }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.style.display = 'none'; return; }
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var u = {
      time: gl.getUniformLocation(program, 'u_time'),
      res: gl.getUniformLocation(program, 'u_resolution'),
      pixelRatio: gl.getUniformLocation(program, 'u_pixelRatio'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      rotation: gl.getUniformLocation(program, 'u_rotation'),
      color1: gl.getUniformLocation(program, 'u_color1'),
      color2: gl.getUniformLocation(program, 'u_color2'),
      color3: gl.getUniformLocation(program, 'u_color3'),
      proportion: gl.getUniformLocation(program, 'u_proportion'),
      softness: gl.getUniformLocation(program, 'u_softness'),
      shape: gl.getUniformLocation(program, 'u_shape'),
      shapeScale: gl.getUniformLocation(program, 'u_shapeScale'),
      distortion: gl.getUniformLocation(program, 'u_distortion'),
      swirl: gl.getUniformLocation(program, 'u_swirl'),
      swirlIterations: gl.getUniformLocation(program, 'u_swirlIterations')
    };

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    var ro = new ResizeObserver(resize);
    ro.observe(canvas);

    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var elapsed = (ts - start) / 1000;

      gl.uniform1f(u.time, elapsed * speed + offset * 0.01);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.pixelRatio, window.devicePixelRatio || 1);
      gl.uniform1f(u.scale, scale);
      gl.uniform1f(u.rotation, rotation);
      gl.uniform4f(u.color1, color1[0], color1[1], color1[2], color1[3]);
      gl.uniform4f(u.color2, color2[0], color2[1], color2[2], color2[3]);
      gl.uniform4f(u.color3, color3[0], color3[1], color3[2], color3[3]);
      gl.uniform1f(u.proportion, proportion);
      gl.uniform1f(u.softness, softness);
      gl.uniform1f(u.shape, shape);
      gl.uniform1f(u.shapeScale, shapeScale);
      gl.uniform1f(u.distortion, distortion);
      gl.uniform1f(u.swirl, swirl);
      gl.uniform1f(u.swirlIterations, swirl === 0 ? 0 : swirlIterations);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reduceMotion) requestAnimationFrame(frame);
    }

    if (reduceMotion) frame(0);
    else requestAnimationFrame(frame);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('canvas.velaris-bg').forEach(function (c) {
      var opts = {};
      if (c.dataset.colors) {
        var parts = c.dataset.colors.split(',');
        opts.color1 = parts[0]; opts.color2 = parts[1]; opts.color3 = parts[2];
      }
      if (c.dataset.shape) opts.shape = c.dataset.shape;
      if (c.dataset.rotation) opts.rotation = parseFloat(c.dataset.rotation);
      initAnimatedGradient(c, opts);
    });
  });
})();

// Interactive rotating 3D-look globe — pure Canvas 2D, no dependencies.
(function () {
  function initGlobe(canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, R = 0;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.42;
    }
    resize();
    var ro = new ResizeObserver(resize);
    ro.observe(canvas);

    var LAT_STEPS = 9, LON_STEPS = 16;
    var nodes = [];
    for (var i = 1; i < LAT_STEPS; i++) {
      var lat = (Math.PI * i / LAT_STEPS) - Math.PI / 2;
      for (var j = 0; j < LON_STEPS; j++) {
        var lon = 2 * Math.PI * j / LON_STEPS;
        nodes.push({ x0: Math.cos(lat) * Math.cos(lon), y0: Math.sin(lat), z0: Math.cos(lat) * Math.sin(lon) });
      }
    }
    nodes.push({ x0: 0, y0: 1, z0: 0 });
    nodes.push({ x0: 0, y0: -1, z0: 0 });

    var latRings = [];
    for (var ri = 1; ri < LAT_STEPS; ri++) {
      var ring = [];
      var rlat = (Math.PI * ri / LAT_STEPS) - Math.PI / 2;
      for (var rj = 0; rj <= LON_STEPS; rj++) {
        var rlon = 2 * Math.PI * (rj % LON_STEPS) / LON_STEPS;
        ring.push({ x0: Math.cos(rlat) * Math.cos(rlon), y0: Math.sin(rlat), z0: Math.cos(rlat) * Math.sin(rlon) });
      }
      latRings.push(ring);
    }
    var lonArcs = [];
    var ARC_COUNT = 8;
    for (var k = 0; k < ARC_COUNT; k++) {
      var alon = 2 * Math.PI * k / ARC_COUNT;
      var arc = [];
      for (var ai = 0; ai <= 24; ai++) {
        var alat = (Math.PI * ai / 24) - Math.PI / 2;
        arc.push({ x0: Math.cos(alat) * Math.cos(alon), y0: Math.sin(alat), z0: Math.cos(alat) * Math.sin(alon) });
      }
      lonArcs.push(arc);
    }

    var rotY = 0.4, rotX = -0.3;
    var velX = 0, dragging = false, lastX = 0, lastY = 0;

    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'none';

    function onDown(e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      if (reduceMotion) requestAnimationFrame(render);
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      rotY += dx * 0.007;
      rotX = Math.max(-1.3, Math.min(1.3, rotX + dy * 0.007));
      velX = dx * 0.007;
      if (reduceMotion) requestAnimationFrame(render);
    }
    function onUp(e) {
      dragging = false; canvas.style.cursor = 'grab';
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', onUp);

    function project(pt) {
      var cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      var x1 = pt.x0 * cosY - pt.z0 * sinY;
      var z1 = pt.x0 * sinY + pt.z0 * cosY;
      var cosX = Math.cos(rotX), sinX = Math.sin(rotX);
      var y2 = pt.y0 * cosX - z1 * sinX;
      var z2 = pt.y0 * sinX + z1 * cosX;
      var scale = 1 / (1.9 - z2 * 0.55);
      return { x: x1 * R * scale, y: y2 * R * scale, z: z2 };
    }

    function drawPath(pts, strokeStyle, lineWidth) {
      ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var p = project(pts[i]);
        var sx = W / 2 + p.x, sy = H / 2 + p.y;
        if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    function render() {
      ctx.clearRect(0, 0, W, H);

      var glow = ctx.createRadialGradient(W / 2, H / 2, R * 0.15, W / 2, H / 2, R * 1.1);
      glow.addColorStop(0, 'rgba(228,197,128,0.07)');
      glow.addColorStop(1, 'rgba(228,197,128,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, R * 1.1, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(228,197,128,0.4)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2); ctx.stroke();

      latRings.forEach(function (ring) { drawPath(ring, 'rgba(228,197,128,0.2)', 0.8); });
      lonArcs.forEach(function (arc) { drawPath(arc, 'rgba(201,201,201,0.16)', 0.8); });

      nodes.forEach(function (pt) {
        var p = project(pt);
        var sx = W / 2 + p.x, sy = H / 2 + p.y;
        var alpha = 0.2 + Math.max(0, p.z) * 0.65;
        var r = 1 + Math.max(0, p.z) * 1.3;
        ctx.fillStyle = 'rgba(240,227,200,' + alpha + ')';
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      });
    }

    var raf = null;
    function loop() {
      if (!dragging) { rotY += 0.0025 + velX; velX *= 0.94; }
      render();
      raf = requestAnimationFrame(loop);
    }

    if (reduceMotion) {
      render();
    } else {
      raf = requestAnimationFrame(loop);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var globeCanvas = document.querySelector('canvas.globe-3d');
    if (globeCanvas) initGlobe(globeCanvas);
  });
})();

// Scroll-linked effects engine — parallax, 3D tilt, clip-path reveal, grayscale-to-color, scale-in, split-lines, blur-stagger.
// Reveal-type effects run a full appear -> hold -> disappear lifecycle as elements pass through the
// viewport (not a one-time reveal that then sticks forever), eased with smoothstep for a natural feel.
// Fully skipped under prefers-reduced-motion: elements simply render in their natural static state.
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  var items = [];

  function smoothstep(t) { return t * t * (3 - 2 * t); }

  // Linear 0->1 as an element enters from the bottom of the viewport. Used only by parallax,
  // which should keep drifting continuously rather than settle once centered.
  function enterProgress(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var p = (vh - r.top) / (vh + r.height);
    return Math.max(0, Math.min(1, p));
  }

  // Symmetric 0 -> 1 -> 0: rises as the element enters, peaks near viewport center, falls again
  // as it exits through the top. Gives every reveal effect a genuine appear/disappear lifecycle.
  function lifecycleProgress(el) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var elCenter = r.top + r.height / 2;
    var viewCenter = vh / 2;
    var span = (vh + r.height) / 2 || 1;
    var dist = Math.abs(elCenter - viewCenter);
    // Elements pinned near the very top of the page (hero kickers, headlines) can never reach
    // true viewport-center at scrollY 0 — there's no room to scroll further up to correct for
    // it. Without a plateau, those elements get permanently stuck mid-reveal (e.g. a kicker
    // tag rendering with a lingering blur no matter what). A generous "fully revealed" zone
    // around center fixes that while still letting elements further down the page reveal,
    // hold, and disappear normally as they pass through.
    var plateau = span * 0.5;
    var p;
    if (dist <= plateau) {
      p = 1;
    } else {
      p = 1 - Math.min(1, (dist - plateau) / (span - plateau));
    }
    return smoothstep(Math.max(0, Math.min(1, p)));
  }

  function applyOne(item) {
    var el = item.el, fx = item.fx;
    if (fx === 'parallax') {
      var lp2 = enterProgress(el);
      el.style.transform = 'translateY(' + ((lp2 - 0.5) * -44) + 'px)';
      return;
    }
    var eased = lifecycleProgress(el);
    switch (fx) {
      case 'tilt3d':
        var rot = (1 - eased) * 32;
        el.style.transform = 'perspective(900px) rotateX(' + rot + 'deg)';
        el.style.opacity = String(0.2 + eased * 0.8);
        break;
      case 'rise3d':
        // Rises up from below while tilting out of a 3D lean into flat — a deeper, more
        // dramatic version of tilt3d that reads as "climbing into place" rather than settling.
        var riseY = (1 - eased) * 70;
        var riseRot = (1 - eased) * 26;
        el.style.transform = 'perspective(1000px) translateY(' + riseY + 'px) rotateX(' + riseRot + 'deg)';
        el.style.opacity = String(0.12 + eased * 0.88);
        break;
      case 'scale-in':
        var s = 0.86 + eased * 0.14;
        el.style.transform = 'scale(' + s + ')';
        el.style.opacity = String(0.15 + eased * 0.85);
        break;
      case 'clip-reveal':
        el.style.clipPath = 'inset(0 0 ' + ((1 - eased) * 100) + '% 0)';
        break;
      case 'mono-color':
        var sat = eased;
        el.style.filter = 'grayscale(' + ((1 - sat) * 100) + '%) contrast(1.05) brightness(' + (0.6 + sat * 0.18) + ')';
        break;
      case 'split-lines':
        var lines = el.querySelectorAll(':scope > span.grad');
        lines.forEach(function (line, i) {
          var delay = i * 0.16;
          var lp = Math.max(0, Math.min(1, (eased - delay) / (1 - delay || 1)));
          line.style.transform = 'translateY(' + ((1 - lp) * 60) + '%)';
          line.style.opacity = String(lp);
        });
        break;
      case 'blur-stagger':
        el.style.filter = 'blur(' + ((1 - eased) * 10) + 'px)';
        el.style.opacity = String(eased);
        break;
      case 'slide-left':
        el.style.transform = 'translateX(' + ((1 - eased) * -64) + 'px)';
        el.style.opacity = String(0.1 + eased * 0.9);
        break;
      case 'slide-right':
        el.style.transform = 'translateX(' + ((1 - eased) * 64) + 'px)';
        el.style.opacity = String(0.1 + eased * 0.9);
        break;
    }
  }

  var needsUpdate = true;
  function loop() {
    if (needsUpdate) {
      items.forEach(applyOne);
      needsUpdate = false;
    }
    requestAnimationFrame(loop);
  }
  function flag() { needsUpdate = true; }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-scroll-fx]').forEach(function (el) {
      items.push({ el: el, fx: el.dataset.scrollFx });
      if (el.dataset.scrollFx === 'split-lines') {
        el.querySelectorAll(':scope > span.grad').forEach(function (line) {
          line.style.display = 'inline-block';
          line.style.willChange = 'transform, opacity';
        });
      } else {
        el.style.willChange = 'transform, opacity, filter, clip-path';
      }
    });
    window.addEventListener('scroll', flag, { passive: true });
    window.addEventListener('resize', flag);
    requestAnimationFrame(loop);
  });
})();

// Zoom-parallax gallery — sticky-pinned collage where each image scales up as you scroll through.
(function () {
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function progress(wrap) {
    var r = wrap.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 1;
    return Math.max(0, Math.min(1, -r.top / total));
  }

  function applyWrap(w) {
    var p = progress(w.wrap);
    w.imgs.forEach(function (im) {
      var target = parseFloat(im.dataset.zoomScale) || 2;
      im.style.transform = 'scale(' + (1 + (target - 1) * p) + ')';
    });
  }

  var wraps = [];
  var needsUpdate = true;
  function flag() { needsUpdate = true; }
  function loop() {
    if (needsUpdate) { wraps.forEach(applyWrap); needsUpdate = false; }
    requestAnimationFrame(loop);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.zoom-pin-wrap').forEach(function (wrap) {
      wraps.push({ wrap: wrap, imgs: wrap.querySelectorAll('[data-zoom-scale]') });
    });
    if (!wraps.length) return;
    if (reduceMotion) {
      wraps.forEach(function (w) { w.imgs.forEach(function (im) { im.style.transform = 'scale(1)'; }); });
      return;
    }
    window.addEventListener('scroll', flag, { passive: true });
    window.addEventListener('resize', flag);
    requestAnimationFrame(loop);
  });
})();

// Package stack selector — stacked-card picker for pricing plans (inspired by animated
// testimonial carousels). Click prev/next, a dot, or a card behind the front one to switch;
// the active card comes forward and flat while the others tilt back, and the active panel's
// subtitle line blurs in word by word.
(function () {
  function initStack(stack) {
    var faces = stack.querySelectorAll('.pkg-card-face');
    var panels = stack.querySelectorAll('.pkg-content-panel');
    var dots = stack.querySelectorAll('.pkg-dot');
    var prevBtn = stack.querySelector('.pkg-prev');
    var nextBtn = stack.querySelector('.pkg-next');
    var count = faces.length;
    if (!count) return;
    var active = 0;
    var rotations = [-8, 7, -5, 6, -7, 5];
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function wrapWords(panel) {
      if (panel.dataset.wordsWrapped) return;
      var sub = panel.querySelector('.pkg-face-sub-text');
      if (!sub) return;
      var words = sub.textContent.trim().split(/\s+/);
      sub.innerHTML = words.map(function (w) { return '<span class="pkg-word">' + w + '&nbsp;</span>'; }).join('');
      panel.dataset.wordsWrapped = '1';
    }

    function render() {
      faces.forEach(function (f, i) {
        f.classList.remove('active', 'behind');
        if (i === active) {
          f.classList.add('active');
          f.style.transform = '';
        } else {
          f.classList.add('behind');
          var offset = rotations[i % rotations.length];
          f.style.transform = 'rotate(' + offset + 'deg) scale(0.94) translateY(10px)';
        }
      });
      panels.forEach(function (p, i) { p.classList.toggle('active', i === active); });
      dots.forEach(function (d, i) { d.classList.toggle('active', i === active); });

      var activePanel = panels[active];
      if (!activePanel) return;
      wrapWords(activePanel);
      var words = activePanel.querySelectorAll('.pkg-word');
      words.forEach(function (w, i) {
        if (reduceMotion) { w.style.opacity = '1'; w.style.filter = 'none'; return; }
        w.style.transition = 'none';
        w.style.filter = 'blur(8px)';
        w.style.opacity = '0';
        setTimeout(function () {
          w.style.transition = 'filter .3s ease, opacity .3s ease';
          w.style.filter = 'blur(0px)';
          w.style.opacity = '1';
        }, 20 * i);
      });
    }

    function go(dir) { active = (active + dir + count) % count; render(); }

    if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { active = i; render(); }); });
    faces.forEach(function (f, i) {
      f.addEventListener('click', function () { if (i !== active) { active = i; render(); } });
    });

    render();
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-pkg-stack]').forEach(initStack);
  });
})();

// Spotify-style horizontal card carousel — swipe on touch, drag on desktop, arrow buttons, edge fades.
(function () {
  function initCarousel(wrap) {
    var track = wrap.querySelector('.carousel-track');
    if (!track) return;
    var fadeL = wrap.querySelector('.carousel-fade-l');
    var fadeR = wrap.querySelector('.carousel-fade-r');
    var prevBtn = wrap.querySelector('.carousel-prev');
    var nextBtn = wrap.querySelector('.carousel-next');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function updateEdges() {
      var max = track.scrollWidth - track.clientWidth;
      var atStart = track.scrollLeft <= 4;
      var atEnd = track.scrollLeft >= max - 4;
      if (fadeL) fadeL.style.opacity = atStart ? '0' : '1';
      if (fadeR) fadeR.style.opacity = (atEnd || max <= 0) ? '0' : '1';
      if (prevBtn) prevBtn.disabled = atStart;
      if (nextBtn) nextBtn.disabled = atEnd || max <= 0;
    }

    function stepSize() {
      var card = track.querySelector(':scope > *');
      var gap = parseFloat(getComputedStyle(track).gap) || 16;
      return (card ? card.getBoundingClientRect().width : 280) + gap;
    }

    if (prevBtn) prevBtn.addEventListener('click', function () {
      track.scrollBy({ left: -stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    if (nextBtn) nextBtn.addEventListener('click', function () {
      track.scrollBy({ left: stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    track.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    updateEdges();

    var isDown = false, startX = 0, startScroll = 0, moved = false;
    var momentumId = null, lastX = 0, lastT = 0, velocity = 0;

    function stopMomentum() {
      if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
    }

    function snapToNearest() {
      var step = stepSize();
      if (!step) return;
      var target = Math.round(track.scrollLeft / step) * step;
      var max = track.scrollWidth - track.clientWidth;
      target = Math.max(0, Math.min(max, target));
      track.scrollTo({ left: target, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    function runMomentum() {
      velocity *= 0.94;
      if (Math.abs(velocity) < 0.05) { momentumId = null; snapToNearest(); return; }
      var max = track.scrollWidth - track.clientWidth;
      var next = track.scrollLeft - velocity;
      if (next < 0 || next > max) { velocity = 0; momentumId = null; snapToNearest(); return; }
      track.scrollLeft = next;
      momentumId = requestAnimationFrame(runMomentum);
    }

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      stopMomentum();
      isDown = true; moved = false;
      startX = e.clientX; startScroll = track.scrollLeft;
      lastX = e.clientX; lastT = performance.now(); velocity = 0;
      track.classList.add('dragging');
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    });
    track.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 10) moved = true;
      track.scrollLeft = startScroll - dx;
      var now = performance.now();
      var dt = now - lastT;
      if (dt > 0) { velocity = (e.clientX - lastX) / dt * 16.7; }
      lastX = e.clientX; lastT = now;
    });
    function endDrag(e) {
      if (!isDown) return;
      isDown = false;
      track.classList.remove('dragging');
      try { track.releasePointerCapture(e.pointerId); } catch (err) {}
      if (!reduceMotion && Math.abs(velocity) > 0.4) {
        momentumId = requestAnimationFrame(runMomentum);
      } else {
        snapToNearest();
      }
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.carousel-wrap').forEach(initCarousel);
  });
})();
