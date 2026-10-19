# Explainer beat kit (tested in Scribis)

A small, deterministic toolkit for **custom** explainer beats, plus one complete beat. Every
beat is one `scribis.motion/1` HTML document. Paste the kit into each beat (templates must be
self-contained) and write only the beat's own markup and `draw(t)`.

> **This is the fallback, not the default.** Most beats are built-in templates placed with
> params: `Hook title`, `Points list`, `Animated bar chart`, `UI walkthrough` (cursor click,
> ripple and chips, like the example below), `Takeaway card` and `Logo outro` (see the beat →
> built-in table in `../../scribis-motion/references/starters.md`). Write a beat with this kit
> only when its design is something none of them can show (a map, a code-built UI mockup, a
> camera move through a layout, a custom chart), create it once, and reuse it with params.

> **Two different kits.** This page's beat kit (`K.install`, `K.pop`, `K.slide`, …) is not the
> motion kit inside the built-in starters (`kit.play`, `kit.span`, `kit.life`, …), which comes
> from `scenes_get_motion_guide` (see `scribis-motion`). A beat uses one or the other, never
> both.

## Rules the kit follows

- **Fixed 1920×1080 stage, scaled to the clip box.** `#stage` is laid out in 1920×1080 px and
  `fit()` scales it into whatever box Scribis gives (manifest `"aspects": ["16:9"]`). This is
  the easiest way to build UI mockups and maps; use it for full-frame beats in a 16:9 scene.
  It is a documented exception to the fluid-layout rule of `scribis-motion`. For a 9:16 or
  1:1 scene see "Other stage sizes" below; for overlays on footage use a fluid layout instead
  (see `scribis-motion`).
- **Everything from `t`.** `draw(t)` sets every animated style from `t` alone, every frame. No
  timers, `Math.random`, `Date.now` or `requestAnimationFrame`. For "random" layouts use
  `hash(i)` (below). Set styles *before* you measure layout (`offsetWidth`) in the same frame.
- **Params by meaning.** Every word, number and color the user may change is a manifest param
  with a `role`; read it with `K.p(key, fallback)` inside `draw`, and give the same default as
  the manifest as the fallback (the page must also draw without injected params).
- **Hand-off states.** A beat starts exactly how the previous beat ends (same element at the
  same rect) or from the plain background. Write the hand-off rect in the manifest `notes`.

## The kit

```html
<style>
html,body{margin:0;padding:0;background:transparent;overflow:hidden;width:100%;height:100%}
#stage{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform-origin:center center;overflow:hidden;
  --bg:#f1efe9;--ink:#1f1e1c;--accent:var(--scribis-accent,#d97757);
  --pink:#e9c9d9;--sage:#c6ddd2;--peach:#f4cfb9;--teal:#1f8a86;--amber:#f0a73a;
  font-family:"Segoe UI",system-ui,sans-serif;color:var(--ink)}
.bg{position:absolute;inset:0;background:var(--bg)}
.abs{position:absolute}
.card{position:absolute;border-radius:14px;border:2px solid rgba(31,30,28,.75);box-sizing:border-box}
.chip{position:absolute;border-radius:14px;border:2px solid rgba(31,30,28,.75);background:#fff;box-sizing:border-box;
  display:flex;align-items:center;justify-content:center;font-family:Consolas,monospace;font-size:22px}
.cursor{position:absolute;width:34px;height:42px;z-index:50}
</style>
<script>
const K = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const prog = (t, a, b) => clamp((t - a) / (b - a));          // 0 before a, 1 after b
  const lerp = (a, b, x) => a + (b - a) * x;
  const ease = {
    out: (x) => 1 - Math.pow(1 - x, 3),
    in: (x) => x * x * x,
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    spring: (x) => (x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(11 * x))
  };
  const $ = (id) => document.getElementById(id);
  const p = (key, fallback) => {
    const v = (window.__SCRIBIS_PARAMS__ || {})[key];
    return v === undefined || v === null || v === '' ? fallback : v;
  };
  const set = (el, styles) => { if (el) for (const k in styles) el.style[k] = styles[k]; };
  const fit = () => {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('stage').style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  // Pop in with overshoot at time a (0.45 s).
  const pop = (el, t, a, d = 0.45, extra = '') => {
    const x = prog(t, a, a + d);
    set(el, { opacity: String(clamp(x * 3)), transform: `${extra} scale(${x <= 0 ? 0.6 : lerp(0.6, 1, ease.back(x))})` });
  };
  // Spring in from an offset (dx, dy px).
  const slide = (el, t, a, d, dx, dy) => {
    const x = prog(t, a, a + d), e = ease.spring(x);
    set(el, { opacity: String(clamp(x * 4)), transform: `translate(${lerp(dx, 0, e)}px, ${lerp(dy, 0, e)}px)` });
  };
  const typed = (text, t, a, cps) => text.slice(0, Math.max(0, Math.floor((t - a) * cps)));
  const caret = (t) => (Math.floor(t * 2.2) % 2 === 0 ? '|' : ' ');
  const install = (draw) => {
    window.seek = (t) => { window.__lastT = t; fit(); draw(Math.max(0, t)); };
    window.addEventListener('resize', fit);
    document.addEventListener('scribis:params', () => window.seek(window.__lastT || 0));
    window.seek(0);
  };
  return { clamp, prog, lerp, ease, $, p, set, fit, pop, slide, typed, caret, install };
})();
// Deterministic pseudo-random 0..1 for layouts (never Math.random).
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const CURSOR_SVG = '<svg viewBox="0 0 34 42" width="34" height="42"><path d="M3 2 L3 33 L11 26 L17 39 L23 36 L17 23 L28 23 Z" fill="#1f1e1c" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>';
</script>
```

## Other stage sizes

The size appears in two places of the kit: `width:1920px;height:1080px` in the `#stage` style and
`1920` / `1080` in `fit()`. For a 9:16 scene change both to 1080×1920, for a 1:1 scene to
1080×1080, and set the manifest `aspects` to `["9:16"]` / `["1:1"]`. Pixel positions in the
beat's own markup and `draw(t)` (such as the 960/542 centre in the example below) are written for
1920×1080, so lay them out again for the new stage. Alternatively build the beat fluidly as
`scribis-motion` describes, without `#stage` and `fit()`.

## A complete beat: button click → radial burst (4.5 s)

```html
<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script type="application/json" id="scribis-motion">
{ "schema": "scribis.motion/1", "title": "Export burst", "duration": 4.5, "category": "cta", "aspects": ["16:9"],
  "params": {
    "button": { "type": "text", "label": "Button label", "role": "cta", "default": "Export" },
    "chips": { "type": "text", "label": "Eight chip labels (comma separated)", "role": "data_labels", "default": "MP4, 16:9, 9:16, 1:1, SRT, Voice, Music, HTML" },
    "accent": { "type": "color", "label": "Button color", "role": "accent_color", "default": "#d97757" } },
  "markers": [{ "time": 1.35, "label": "click" }, { "time": 2.6, "label": "burst" }],
  "notes": "Cursor clicks the button, a ripple expands, eight chips burst out on a circle and bob, then everything clears." }
</script>
<!-- paste the kit <style> here, then: -->
<style>
#btn{left:820px;top:498px;width:280px;height:88px;border-radius:16px;background:var(--accent);color:#fff;
  font:400 40px Georgia,serif;display:flex;align-items:center;justify-content:center;z-index:3}
#ripple{left:960px;top:542px;border-radius:50%;border:4px solid var(--accent);box-sizing:border-box}
.burst{width:136px;height:136px;margin:-68px 0 0 -68px;font-weight:700}
</style></head><body>
<div id="stage"><div class="bg"></div>
  <div id="ripple" class="abs"></div>
  <div id="btn" class="abs" data-scribis-param="button">Export</div>
  <div id="cur" class="cursor"></div>
</div>
<!-- paste the kit <script> here, then: -->
<script>
K.$('cur').innerHTML = CURSOR_SVG;
const FILL = ['#e9c9d9', '#c6ddd2', '#f4cfb9', '#cfd9f2', '#f7e2a8', '#d8cdec', '#c6ddd2', '#e9c9d9'];
const chips = FILL.map((fill) => {
  const el = document.createElement('div');
  el.className = 'chip burst';
  el.style.background = fill;
  K.$('stage').insertBefore(el, K.$('btn'));
  return el;
});
function draw(t) {
  const labels = String(K.p('chips', 'MP4, 16:9, 9:16, 1:1, SRT, Voice, Music, HTML')).split(',').map((s) => s.trim());
  const h = K.ease.out(K.prog(t, 0.3, 1.2));                                  // cursor arrives
  const press = K.prog(t, 1.25, 1.35) * (1 - K.prog(t, 1.35, 1.5));            // click
  K.set(K.$('cur'), { left: K.lerp(1380, 990, h) + 'px', top: K.lerp(960, 548, h) + 'px',
    opacity: String(K.prog(t, 0.3, 0.5) * (1 - K.prog(t, 2.2, 2.6))) });
  K.pop(K.$('btn'), t, 0, 0.4, `scale(${1 - 0.08 * press})`);
  const rp = K.ease.out(K.prog(t, 1.3, 2.1));                                  // ripple
  K.set(K.$('ripple'), { width: 10 + 900 * rp + 'px', height: 10 + 900 * rp + 'px',
    marginLeft: -(5 + 450 * rp) + 'px', marginTop: -(5 + 450 * rp) + 'px', opacity: String(t > 1.3 ? 0.6 * (1 - rp) : 0) });
  const out = K.ease.in(K.prog(t, 3.8, 4.4));                                  // clear
  chips.forEach((el, i) => {
    el.textContent = labels[i] || '';
    const x = K.prog(t, 1.4 + i * 0.05, 2.3 + i * 0.05), e = K.ease.spring(x);
    const ang = ((i * 45 - 90) * Math.PI) / 180, R = 330 + (i % 2) * 40;
    const bob = Math.sin(t * 2.2 + i) * 6 * K.prog(t, 2.2, 2.6);             // a function of t: fine
    K.set(el, { left: 960 + Math.cos(ang) * R * e + 'px', top: 542 + Math.sin(ang) * R * 0.78 * e + bob + 'px',
      opacity: String(K.clamp(x * 4) * (1 - out)), transform: `scale(${K.lerp(0.3, 1, Math.min(1, e)) * (1 - 0.3 * out)})` });
  });
  if (out > 0) K.set(K.$('btn'), { opacity: String(1 - out), transform: `scale(${1 - 0.25 * out})` });
}
K.install(draw);
</script></body></html>
```

## Motion vocabulary (how each device was built)

| Device | How |
|:---|:---|
| Isometric map / city | A plane div with `transform: rotateX(56deg) rotateZ(-36deg)` inside a parent with `perspective`; blocks are divs with stacked `box-shadow` for height; labels that face the camera use the inverse `rotateZ(36deg) rotateX(-56deg)` |
| Shrink the whole view into a window | Keep the view 1920×1080 and animate `translate(x,y) scale(w/1920)` with `transform-origin: 0 0`; the next beat starts with the window at that rect |
| Window morphs into a card | Animate the frame's left/top/width/height and background color; fade its content |
| Cards stacking in | `K.slide` with `ease.spring`, staggered 0.4 s |
| Count-up numbers | `Math.round(value * ease.out(prog(t, a, b)))` |
| Line chart drawing | Build the SVG path up to `progress * (points - 1)` each frame; pop dots as the line reaches them |
| Camera zoom into a card | Wrap the UI in `#cam` (`transform-origin: 0 0`) and animate `translate(tx,ty) scale(s)` with `s = targetW / cardW`, `tx = targetX - s * cardX` |
| Typing with caret | `K.typed(text, t, start, charsPerSecond) + K.caret(t)` |
| Text on a curve | SVG `<textPath>` with one `<tspan>` per character whose opacity follows `t` |
| Dot map with push-in and ring | Dots as divs on a map layer; zoom the layer; draw the ring with `stroke-dasharray = circumference * progress` |
| Radial burst | Positions on a circle times `ease.spring(progress)` (example above) |
| Selection box + toolbar edit | A dashed box sized from the text's measured rect (measure after setting the frame's styles); swap the style at the click time |
| Logo end card | Petals as rotated rounded rects growing with `ease.back`; wordmark letters as inline-block spans with staggered rise |
