/* ==========================================================================
   TruthLens AI — WebGL 3D scene (Three.js)
   Mounts on any element with [data-three="hero"] or [data-three="orb"].
   Loaded with dynamic import() so the site also works when opened from disk.
   If WebGL or the CDN is unavailable, the CSS 3D fallback stays visible.
   ========================================================================== */
(function () {
  'use strict';
  var mounts = document.querySelectorAll('[data-three]');
  if (!mounts.length) return;
  var root = document.documentElement;
  if (root.classList.contains('no-3d')) return;

  var probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  import(THREE_URL).then(function (THREE) {
    mounts.forEach(function (el) { createScene(THREE, el, el.getAttribute('data-three')); });
  }).catch(function () { /* offline: keep CSS fallback */ });

  function cssVar(name, fb) {
    var v = getComputedStyle(root).getPropertyValue(name).trim();
    return v || fb;
  }

  function makeDotTexture(THREE) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,.65)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function makeTagTexture(THREE, text, color) {
    var c = document.createElement('canvas'); c.width = 256; c.height = 96;
    var g = c.getContext('2d');
    var r = 28;
    g.fillStyle = 'rgba(10,14,30,0.82)';
    g.strokeStyle = color; g.lineWidth = 5;
    g.beginPath();
    g.moveTo(r, 4); g.lineTo(252 - r, 4); g.quadraticCurveTo(252, 4, 252, r + 4);
    g.lineTo(252, 92 - r); g.quadraticCurveTo(252, 92, 252 - r, 92);
    g.lineTo(r, 92); g.quadraticCurveTo(4, 92, 4, 92 - r);
    g.lineTo(4, r + 4); g.quadraticCurveTo(4, 4, r, 4); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = color;
    g.font = '700 44px "Space Grotesk", Inter, system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 50);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }

  function createScene(THREE, el, variant) {
    var hero = variant === 'hero';
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = 'three-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    el.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, hero ? 8.2 : 7.4);

    var world = new THREE.Group();
    scene.add(world);
    var dot = makeDotTexture(THREE);

    var palette = readPalette();
    function readPalette() {
      return {
        a: new THREE.Color(cssVar('--accent', '#6d8cff')),
        b: new THREE.Color(cssVar('--accent-2', '#b26bff')),
        c: new THREE.Color(cssVar('--accent-3', '#22d3ee')),
        light: root.getAttribute('data-theme') === 'light'
      };
    }

    /* Core: faceted icosahedron "AI brain" */
    var coreMat = new THREE.MeshStandardMaterial({ color: palette.a, emissive: palette.b, emissiveIntensity: 0.35, metalness: 0.55, roughness: 0.22, flatShading: true });
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 1), coreMat);
    world.add(core);

    /* Inner glowing heart */
    var heartMat = new THREE.MeshBasicMaterial({ color: palette.c, transparent: true, opacity: 0.9 });
    var heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), heartMat);
    world.add(heart);

    /* Wireframe neural shell + nodes */
    var shellGeo = new THREE.IcosahedronGeometry(1.85, 2);
    var shellMat = new THREE.LineBasicMaterial({ color: palette.c, transparent: true, opacity: 0.28 });
    var shell = new THREE.LineSegments(new THREE.EdgesGeometry(shellGeo, 1), shellMat);
    world.add(shell);
    var nodeMat = new THREE.PointsMaterial({ size: 0.12, map: dot, color: palette.c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    var nodes = new THREE.Points(shellGeo, nodeMat);
    shell.add(nodes);

    /* Orbit rings with travelling data packets */
    var rings = [];
    var ringDefs = hero
      ? [{ r: 2.45, rx: 1.25, ry: 0.2, c: 'a', s: 0.5 }, { r: 2.75, rx: 0.4, ry: 1.0, c: 'b', s: -0.35 }, { r: 3.05, rx: 1.9, ry: -0.6, c: 'c', s: 0.28 }]
      : [{ r: 2.35, rx: 1.25, ry: 0.2, c: 'a', s: 0.6 }, { r: 2.65, rx: 0.4, ry: 1.0, c: 'b', s: -0.45 }];
    ringDefs.forEach(function (d) {
      var g = new THREE.Group();
      g.rotation.set(d.rx, d.ry, 0);
      var mat = new THREE.MeshBasicMaterial({ color: palette[d.c], transparent: true, opacity: 0.55 });
      var torus = new THREE.Mesh(new THREE.TorusGeometry(d.r, 0.012, 8, 160), mat);
      g.add(torus);
      var pMat = new THREE.SpriteMaterial({ map: dot, color: palette[d.c], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      var packets = [];
      for (var i = 0; i < 3; i++) {
        var sp = new THREE.Sprite(pMat); sp.scale.setScalar(0.32);
        sp.userData.offset = (i / 3) * Math.PI * 2;
        g.add(sp); packets.push(sp);
      }
      world.add(g);
      rings.push({ group: g, mat: mat, pMat: pMat, def: d, packets: packets });
    });

    /* Data cloud */
    var cloudCount = hero ? 900 : 380;
    var pos = new Float32Array(cloudCount * 3);
    for (var i = 0; i < cloudCount; i++) {
      var rr = (hero ? 3.4 : 3) + Math.random() * (hero ? 2.6 : 1.4);
      var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = rr * Math.cos(ph);
    }
    var cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var cloudMat = new THREE.PointsMaterial({ size: 0.06, map: dot, color: palette.a, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    var cloud = new THREE.Points(cloudGeo, cloudMat);
    scene.add(cloud);

    /* Floating verdict tags (hero only) */
    var tags = [];
    if (hero) {
      [['FAKE', '#ef4444', 0], ['REAL', '#22c55e', 2.1], ['VERIFY', '#f5b316', 4.2]].forEach(function (t) {
        var m = new THREE.SpriteMaterial({ map: makeTagTexture(THREE, t[0], t[1]), transparent: true, depthWrite: false });
        var s = new THREE.Sprite(m); s.scale.set(1.25, 0.47, 1);
        s.userData.phase = t[2];
        world.add(s); tags.push(s);
      });
    }

    /* Lights */
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    var l1 = new THREE.PointLight(palette.b, 40, 30); l1.position.set(4, 3, 5); scene.add(l1);
    var l2 = new THREE.PointLight(palette.c, 30, 30); l2.position.set(-4, -2, 4); scene.add(l2);
    var l3 = new THREE.DirectionalLight(0xffffff, 1.1); l3.position.set(0, 5, 5); scene.add(l3);

    function applyPalette() {
      palette = readPalette();
      coreMat.color.copy(palette.a); coreMat.emissive.copy(palette.b);
      heartMat.color.copy(palette.c);
      shellMat.color.copy(palette.c); shellMat.opacity = palette.light ? 0.45 : 0.28;
      nodeMat.color.copy(palette.c);
      cloudMat.color.copy(palette.a);
      var blend = palette.light ? THREE.NormalBlending : THREE.AdditiveBlending;
      [nodeMat, cloudMat].forEach(function (m) { m.blending = blend; m.needsUpdate = true; });
      rings.forEach(function (r) { r.mat.color.copy(palette[r.def.c]); r.pMat.color.copy(palette[r.def.c]); r.pMat.blending = blend; r.pMat.needsUpdate = true; });
      l1.color.copy(palette.b); l2.color.copy(palette.c);
    }
    applyPalette();
    window.addEventListener('tl:settings', function () { setTimeout(applyPalette, 30); });

    /* Interaction */
    var pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    window.addEventListener('pointermove', function (e) {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
    var boost = 0;
    window.addEventListener('tl:scan', function () { boost = 1; });

    /* Size */
    function resize() {
      var w = el.clientWidth || 300, h = el.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(el);
    else window.addEventListener('resize', resize);

    /* Only render while visible */
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(el);
    }

    var clock = new THREE.Clock();
    var t = 0;
    function frame() {
      requestAnimationFrame(frame);
      if (!visible || document.hidden) { clock.getDelta(); return; }
      var reduce = root.classList.contains('no-motion') || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      var dt = Math.min(clock.getDelta(), 0.05) * (reduce ? 0.15 : 1) * (1 + boost * 4);
      boost *= 0.985;
      t += dt;

      pointer.x += (target.x - pointer.x) * 0.05;
      pointer.y += (target.y - pointer.y) * 0.05;

      var scroll = hero ? Math.min(window.scrollY / 800, 1) : 0;
      world.rotation.y = t * 0.18 + pointer.x * 0.5 + scroll * 1.2;
      world.rotation.x = pointer.y * 0.35 + scroll * 0.4;
      world.position.y = Math.sin(t * 0.8) * 0.08;

      core.rotation.x = t * 0.35; core.rotation.y = t * 0.5;
      var pulse = 1 + Math.sin(t * 2.2) * 0.06;
      heart.scale.setScalar(pulse);
      shell.rotation.y = -t * 0.12; shell.rotation.z = t * 0.05;

      rings.forEach(function (r) {
        r.group.rotation.z = t * r.def.s;
        r.packets.forEach(function (p) {
          var a = t * 1.1 * Math.sign(r.def.s) + p.userData.offset;
          p.position.set(Math.cos(a) * r.def.r, Math.sin(a) * r.def.r, 0);
        });
      });

      tags.forEach(function (s) {
        var a = t * 0.35 + s.userData.phase;
        s.position.set(Math.cos(a) * 3.1, Math.sin(a * 1.3) * 0.9 + 0.2, Math.sin(a) * 3.1);
        s.material.opacity = 0.55 + (s.position.z + 3.1) / 6.2 * 0.45;
      });

      cloud.rotation.y = t * 0.03 + pointer.x * 0.15;
      cloud.rotation.x = pointer.y * 0.1;
      renderer.render(scene, camera);
    }
    frame();
    el.classList.add('three-ready');
  }
})();
