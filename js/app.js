(() => {
  const P = window.PRODUCTS || [];
  const N = P.length;
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const rack = $("rack"), itemsEl = $("items"), label = $("hoverLabel");
  const dItem = $("dItem"), dCount = $("dCount"), dName = $("dName");
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.22,.8,.2,1)";
  const pad = (n) => String(n).padStart(2, "0");
  const isDetail = () => body.classList.contains("is-detail");

  /* ---------- 一件衣服：一条帧条（侧面 → 正面），悬停时逐帧播放 ---------- */
  const TURN_S = .7;                 // 侧面 → 正面用时
  const layer = (p, cls) =>
    `<div class="turn ${cls}" style="background-image:url('${p.turn}');background-size:${p.frames * 100}% 100%"></div>`;
  const face = (p, still = false) => still
    ? `<div class="face"><img src="${p.img}" alt="${p.name}" draggable="false"></div>`
    : `<div class="face" role="img" aria-label="${p.name}">${layer(p, "a")}</div>`;

  rack.style.setProperty("--n", N);
  itemsEl.innerHTML = P.map((p, i) =>
    `<button class="item" data-i="${i}" aria-label="${p.name}"><div class="swing">${face(p)}</div></button>`
  ).join("");
  const items = [...itemsEl.children];


  /* ---------- 尺寸 ---------- */
  let D;
  function dims() {
    const gh = items[0].offsetHeight * 340 / 390;
    D = { gh, slot: gh * .3, open: gh * 300 / 340 + gh * .08 };
    return D;
  }
  dims();
  // 第 i 件衣服的中心相对整排中点的位置（h = 正在转正面的那件）
  function pos(i, h) {
    let x = 0;
    for (let j = 0; j < i; j++) x += j === h ? D.open : D.slot;
    x += (i === h ? D.open : D.slot) / 2;
    const total = (N - 1) * D.slot + (h >= 0 ? D.open : D.slot);
    return x - total / 2;
  }

  /* ---------- Restore the responsive rail spring; settle when interaction ends. ---------- */
  const K = 55, C = 2 * .58 * Math.sqrt(K);        // Original rail response.
  const W0 = 4, DAMP = 1.8;                       // A light, decaying hanger swing.
  const S = items.map((el, i) => ({
    el, swing: el.firstElementChild,
    a: el.querySelector(".turn.a"),
    n: P[i].frames, x: 0, v: 0, th: 0, om: 0, f: 0,
    lastK: -1,
  }));
  let selected = Math.floor(N / 2);
  let hovered = selected;
  S.forEach((s, i) => { s.x = pos(i, hovered); s.f = i === hovered ? s.n - 1 : 0; });

  function render(s) {
    s.el.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
    s.swing.style.transform = `rotate(${(s.th * 57.2958).toFixed(3)}deg)`;
    // Frames already contain the source motion. Play them at a uniform cadence.
    const k = Math.min(s.n - 1, Math.max(0, Math.round(s.f)));   // 只显示一帧：两帧叠加会出重影
    if (k !== s.lastK) {
      s.a.style.backgroundPosition = `${s.n > 1 ? (k / (s.n - 1)) * 100 : 0}% 0`;
      s.lastK = k;
    }
  }

  let last = 0, raf = 0;
  function wake() { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now;
    raf = 0;
    let moving = false;
    const steps = 3, h = dt / steps;
    for (let i = 0; i < N; i++) {
      const s = S[i];
      const target = pos(i, hovered);
      for (let k = 0; k < steps; k++) {
        const acc = reduce ? 0 : K * (target - s.x) - C * s.v;
        if (reduce) { s.x = target; s.v = 0; }
        else { s.v += acc * h; s.x += s.v * h; }
        // Only react to a moving hanger; settle completely when the rail is still.
        const eq = reduce ? 0 : -acc / D.gh * .0042;
        const al = -W0 * W0 * (s.th - eq) - DAMP * s.om;
        s.om += al * h; s.th += s.om * h;
        s.th = Math.max(-.08, Math.min(.08, s.th));
      }
      // 转身：悬停的那件转到正面，其它的停在侧面
      const fTo = i === hovered ? s.n - 1 : 0;
      const rate = (s.n - 1) / TURN_S;
      const df = fTo - s.f;
      s.f += reduce || Math.abs(df) <= rate * dt ? df : Math.sign(df) * rate * dt;
      if (Math.abs(s.x - target) > .02 || Math.abs(s.v) > .03 || Math.abs(s.th) > .0001 || Math.abs(s.om) > .0001 || Math.abs(s.f - fTo) > .001) moving = true;
      render(s);
    }
    if (moving && !document.hidden) raf = requestAnimationFrame(tick);
  }
  wake();
  document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else wake(); });

  /* ---------- 悬停 ---------- */
  function placeLabel(fresh) {
    if (hovered < 0) return;
    if (fresh) label.style.transition = "none";      // 第一次出现不要从别处滑过来
    label.style.left = `${rack.offsetLeft + rack.offsetWidth / 2 + pos(hovered, hovered)}px`;
    if (fresh) { void label.offsetWidth; label.style.transition = ""; }
  }
  function setHover(h, { instant = false } = {}) {
    if (h < 0) h = selected;
    if (h === hovered && !instant) return;
    hovered = h;
    if (h >= 0) selected = h;
    wake();
    items.forEach((el, i) => el.classList.toggle("on", i === h));
    itemsEl.classList.toggle("pointing", h >= 0);
    if (instant) S.forEach((s, i) => { s.x = pos(i, h); s.v = 0; s.th = 0; s.om = 0; s.f = i === h ? s.n - 1 : 0; render(s); });
    if (h >= 0) {
      label.textContent = P[h].name;
      placeLabel(!label.classList.contains("show"));
      label.classList.add("show");
    } else {
      label.classList.remove("show");
    }
  }
  // 鼠标落在哪件衣服的位置上（按当前目标布局算，避免挤开时来回跳）
  function hit(e) {
    const r = itemsEl.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) return -1;
    const x = e.clientX - (r.left + r.width / 2);
    for (let i = 0; i < N; i++) {
      const half = (i === hovered ? D.open : D.slot) / 2;
      if (Math.abs(x - pos(i, hovered)) <= half) return i;
    }
    return -1;
  }
  let pointerOnRack = false;
  let touchStart = null;
  itemsEl.addEventListener("pointerdown", e => { touchStart = { x: e.clientX, y: e.clientY }; });
  itemsEl.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || isDetail()) return;
    pointerOnRack = true;
    const target = hit(e);
    setHover(target);

  });
  itemsEl.addEventListener("pointerleave", () => {
    pointerOnRack = false;
    if (!isDetail()) setHover(-1);
  });
  itemsEl.addEventListener("click", (e) => {
    if (isDetail()) return;
    if (touchStart && Math.hypot(e.clientX - touchStart.x, e.clientY - touchStart.y) > 12) return;
    const i = e.detail === 0 ? -1 : hit(e);              // 键盘回车由按钮自己处理
    if (i < 0) return;
    if (canHover || hovered === i) openDetail(i);
    else { setHover(i); openDetail(i); }   // 手机：先转身再打开
  });
  items.forEach((el, i) => {
    el.addEventListener("focus", () => { if (!isDetail()) setHover(i); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(i, true); } });
  });
  itemsEl.addEventListener("focusout", (e) => {
    if (!itemsEl.contains(e.relatedTarget) && !pointerOnRack && !isDetail()) setHover(-1);
  });

  /* ---------- 详情：衣架淡开虚化，衣服在中间淡入放大（参考片约 0.3 秒） ---------- */
  let cur = 0, busy = false, detailOpener = null;
  const zoomToggle = $("zoomToggle");
  function resetZoom() { zoomToggle.setAttribute("aria-pressed", "false"); zoomToggle.setAttribute("aria-label", "Enlarge garment"); $("zoomHint").textContent = "Click to look closer ↗"; }
  zoomToggle.addEventListener("click", () => { const zoomed = zoomToggle.getAttribute("aria-pressed") !== "true"; zoomToggle.setAttribute("aria-pressed", String(zoomed)); zoomToggle.setAttribute("aria-label", zoomed ? "Show full garment" : "Enlarge garment"); $("zoomHint").textContent = zoomed ? "Click to show full piece ↙" : "Click to look closer ↗"; });
  function renderDetail(i) {
    resetZoom();
    dItem.innerHTML = face(P[i], true);
    dCount.textContent = `${pad(i + 1)} / ${pad(N)}`;
    dName.textContent = P[i].name;
  }
  function offsetFromRack(i) {
    const r = items[i].getBoundingClientRect();
    const d = dItem.getBoundingClientRect();
    return { dx: (r.left + r.width / 2) - (d.left + d.width / 2), dy: r.top - d.top, s: r.height / d.height };
  }

  function openDetail(i, byKey = false) {
    if (busy || isDetail()) return;
    detailOpener = document.activeElement;
    cur = i;
    renderDetail(i);
    dItem.classList.add("show");
    const o = offsetFromRack(i);
    body.classList.add("is-detail");
    label.classList.remove("show");
    dItem.animate([
      { opacity: 0, transform: `translate(${o.dx * .35}px, ${o.dy * .35}px) scale(${(.75 + o.s * .25).toFixed(3)})` },
      { opacity: 1, offset: .45 },
      { opacity: 1, transform: "none" },
    ], { duration: reduce ? 1 : 520, easing: EASE });
    $("detail").setAttribute("aria-hidden", "false");
    $("detail").inert = false;
    $("rackWrap").inert = true;
    $("cta").inert = true;
    document.querySelectorAll(".nav-link, .logo").forEach(el => el.inert = true);
    $("close").inert = false;
    $("close").focus({ preventScroll: true });
  }

  function closeDetail() {
    if (!isDetail() || busy) return;
    busy = true;
    // 背景里那件直接摆成正面，衣架淡回来时衣服就在原位
    setHover(cur, { instant: true });
    body.classList.remove("is-detail");
    $("close").inert = true;
    $("detail").inert = true;
    $("rackWrap").inert = false;
    $("cta").inert = false;
    document.querySelectorAll(".nav-link, .logo").forEach(el => el.inert = false);
    resetZoom();
    detailOpener?.focus({ preventScroll: true });
    $("detail").setAttribute("aria-hidden", "true");
    dItem.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }],
      { duration: reduce ? 1 : 320, easing: "ease-in", fill: "forwards" }).finished.then(() => {
      dItem.classList.remove("show");
      dItem.getAnimations().forEach((a) => a.cancel());
      busy = false;
      if (!pointerOnRack) setTimeout(() => { if (!pointerOnRack && !isDetail()) setHover(-1); }, 600);

    });
  }

  async function step(dir) {
    if (busy || !isDetail()) return;
    busy = true;
    const next = (cur + dir + N) % N;
    const out = dItem.animate([
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: `translateX(${-dir * 28}px)` },
    ], { duration: reduce ? 1 : 140, easing: "ease-in", fill: "forwards" });
    dName.style.opacity = 0;
    await out.finished;
    cur = next;
    renderDetail(cur);
    out.cancel();
    dName.style.opacity = 1;
    await dItem.animate([
      { opacity: 0, transform: `translateX(${dir * 28}px)` },
      { opacity: 1, transform: "none" },
    ], { duration: reduce ? 1 : 280, easing: EASE }).finished;
    busy = false;
  }

  $("prev").addEventListener("click", () => step(-1));
  $("next").addEventListener("click", () => step(1));
  $("close").addEventListener("click", closeDetail);

  /* ---------- About / Contact / Availability 小卡片 ---------- */
  const sheet = $("sheet");
  let sheetOpener = null;
  function openSheet(name) {
    sheetOpener = document.activeElement;
    $("sheetBody").innerHTML = $(`panel-${name}`).innerHTML;
    sheet.inert = false;
    [document.querySelector(".top"), document.querySelector("main"), document.querySelector("footer"), $("detail")].forEach(el => el.inert = true);
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    $("sheetClose").focus({ preventScroll: true });
  }
  function closeSheet() { sheet.classList.remove("open"); sheet.inert = true; [document.querySelector(".top"), document.querySelector("main"), document.querySelector("footer")].forEach(el => el.inert = false); $("detail").inert = !isDetail(); sheetOpener?.focus({ preventScroll: true }); sheet.setAttribute("aria-hidden", "true"); }
  document.querySelectorAll("[data-panel]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.panel)));
  $("cta").addEventListener("click", () => openSheet("availability"));
  $("sheetClose").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (sheet.classList.contains("open")) closeSheet(); else closeDetail(); }
    if (e.key === "Tab" && (sheet.classList.contains("open") || isDetail())) {
      const scope = sheet.classList.contains("open") ? sheet : $("detail");
      const focusable = [...scope.querySelectorAll("button, a[href], [tabindex=\"0\"]")].filter(el => !el.disabled && !el.closest("[inert]"));
      if (scope === $("detail")) focusable.unshift($("close"));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (sheet.classList.contains("open")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  function centerSelected(instant = false) {
    const wrap = $("rackWrap");
    if (wrap.scrollWidth > wrap.clientWidth) wrap.scrollTo({ left: rack.offsetLeft + rack.offsetWidth / 2 + pos(selected, hovered) - wrap.clientWidth / 2, behavior: instant || reduce ? 'instant' : 'smooth' });
  }
  setHover(selected, { instant: true });
  centerSelected(true);
  Promise.all(P.map((p,i) => new Promise(resolve => {
    const img = new Image();
    img.onload = async () => {
      // A loaded sprite is not necessarily decoded. Finish decoding before interaction.
      try { await img.decode(); } catch { /* The loaded image remains usable. */ }
      resolve();
    };
    img.onerror = () => { S[i].a.style.backgroundImage = 'url("' + p.img + '")'; S[i].a.style.backgroundSize = '100% 100%'; S[i].a.style.height = 'calc(var(--gh) * 406 / 340)'; S[i].n = 1; S[i].f = 0; resolve(); };
    img.src = p.turn;
    const front = new Image(); front.src = p.img;
    front.decode().catch(() => {});
  }))).then(() => { body.classList.add("is-ready"); wake(); });
  window.addEventListener("resize", () => { dims(); placeLabel(false); wake(); centerSelected(true); });
})();
