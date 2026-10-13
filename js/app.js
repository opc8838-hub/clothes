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

  /* ---------- 一件衣服：两层帧条交叉淡化，帧与帧之间也是平滑的 ---------- */
  const TURN_S = .7;                 // 侧面 → 正面用时
  const layer = (p, cls) =>
    `<div class="turn ${cls}" style="background-image:url('${p.turn}');background-size:${p.frames * 100}% 100%"></div>`;
  const face = (p, still = false) => still
    ? `<div class="face"><img src="${p.img}" alt="${p.name}" draggable="false"></div>`
    : `<div class="face" role="img" aria-label="${p.name}">${layer(p, "a")}${layer(p, "b")}</div>`;

  rack.style.setProperty("--n", N);
  itemsEl.innerHTML = P.map((p, i) =>
    `<button class="item" data-i="${i}" aria-label="${p.name}"><div class="swing">${face(p)}</div></button>`
  ).join("");
  const items = [...itemsEl.children];
  P.forEach((p) => { new Image().src = p.turn; new Image().src = p.img; });

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

  /* ---------- 物理：位置是弹簧（有惯性、略微冲过头再回来），摆动是真钟摆，外加一直存在的轻微漂浮 ---------- */
  const K = 55, C = 2 * .58 * Math.sqrt(K);        // 弹簧：约 1 秒停稳
  const W0 = 4.0, DAMP = 1.0;                       // 钟摆：周期约 1.6 秒，慢慢衰减
  const S = items.map((el, i) => ({
    el, swing: el.firstElementChild,
    a: el.querySelector(".turn.a"), b: el.querySelector(".turn.b"),
    n: P[i].frames, x: 0, v: 0, th: 0, om: 0, f: 0,
    p1: Math.random() * 6.28, p2: Math.random() * 6.28, p3: Math.random() * 6.28,
    lastK: -1, lastOp: -1,
  }));
  let hovered = -1;
  S.forEach((s, i) => { s.x = pos(i, -1); });

  function render(s) {
    s.el.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
    s.swing.style.transform = `rotate(${(s.th * 57.2958).toFixed(3)}deg)`;
    const k = Math.min(s.n - 1, Math.max(0, Math.floor(s.f)));
    const k2 = Math.min(s.n - 1, k + 1);
    const op = Math.round((s.f - k) * 100) / 100;
    if (k !== s.lastK) {
      s.a.style.backgroundPosition = `${(k / (s.n - 1)) * 100}% 0`;
      s.b.style.backgroundPosition = `${(k2 / (s.n - 1)) * 100}% 0`;
      s.lastK = k;
    }
    if (op !== s.lastOp) { s.b.style.opacity = op; s.lastOp = op; }
  }

  let last = 0, t = 0;
  function tick(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000);
    last = now; t += dt;
    const steps = 3, h = dt / steps;
    for (let i = 0; i < N; i++) {
      const s = S[i];
      const target = pos(i, hovered);
      for (let k = 0; k < steps; k++) {
        const acc = reduce ? 0 : K * (target - s.x) - C * s.v;
        if (reduce) { s.x = target; s.v = 0; }
        else { s.v += acc * h; s.x += s.v * h; }
        // 挂点加速时衣服往反方向摆；空气里一直有一点点飘
        const wind = .0055 * Math.sin(.8 * t + s.p1) + .003 * Math.sin(1.9 * t + s.p2);
        const eq = -acc / D.gh * .0042 + (reduce ? 0 : wind);
        const al = -W0 * W0 * (s.th - eq) - DAMP * s.om;
        s.om += al * h; s.th += s.om * h;
        s.th = Math.max(-.11, Math.min(.11, s.th));
      }
      // 转身：悬停的那件转到正面；其它的在侧面附近轻轻扭
      const idle = (reduce || i === hovered) ? 0 : .55 + .55 * Math.sin(.45 * t + s.p3);
      const fTo = i === hovered ? s.n - 1 : idle;
      const rate = (s.n - 1) / TURN_S;
      const df = fTo - s.f;
      s.f += Math.abs(df) <= rate * dt ? df : Math.sign(df) * rate * dt;
      render(s);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* ---------- 悬停 ---------- */
  function placeLabel(fresh) {
    if (hovered < 0) return;
    if (fresh) label.style.transition = "none";      // 第一次出现不要从别处滑过来
    label.style.left = `${rack.offsetLeft + rack.offsetWidth / 2 + pos(hovered, hovered)}px`;
    if (fresh) { void label.offsetWidth; label.style.transition = ""; }
  }
  function setHover(h, { instant = false } = {}) {
    if (h === hovered) return;
    hovered = h;
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
  itemsEl.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || isDetail()) return;
    pointerOnRack = true;
    setHover(hit(e));
  });
  itemsEl.addEventListener("pointerleave", () => {
    pointerOnRack = false;
    if (!isDetail()) setHover(-1);
  });
  itemsEl.addEventListener("click", (e) => {
    if (isDetail()) return;
    const i = e.detail === 0 ? -1 : hit(e);              // 键盘回车由按钮自己处理
    if (i < 0) return;
    if (canHover || hovered === i) openDetail(i);
    else { setHover(i); setTimeout(() => openDetail(i), TURN_S * 1000); }   // 手机：先转身再打开
  });
  items.forEach((el, i) => {
    el.addEventListener("focus", () => { if (!isDetail()) setHover(i); });
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(i, true); } });
  });
  itemsEl.addEventListener("focusout", (e) => {
    if (!itemsEl.contains(e.relatedTarget) && !pointerOnRack && !isDetail()) setHover(-1);
  });

  /* ---------- 详情：衣架淡开虚化，衣服在中间淡入放大（参考片约 0.3 秒） ---------- */
  let cur = 0, busy = false;
  function renderDetail(i) {
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
    if (byKey) $("next").focus({ preventScroll: true });
  }

  function closeDetail() {
    if (!isDetail() || busy) return;
    busy = true;
    // 背景里那件直接摆成正面，衣架淡回来时衣服就在原位
    setHover(cur, { instant: true });
    body.classList.remove("is-detail");
    $("detail").setAttribute("aria-hidden", "true");
    dItem.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }],
      { duration: reduce ? 1 : 320, easing: "ease-in", fill: "forwards" }).finished.then(() => {
      dItem.classList.remove("show");
      dItem.getAnimations().forEach((a) => a.cancel());
      busy = false;
      if (!pointerOnRack) setTimeout(() => { if (!pointerOnRack && !isDetail()) setHover(-1); }, 600);
      if (document.activeElement && document.activeElement.closest && document.activeElement.closest(".detail, .top")) items[cur].focus({ preventScroll: true });
    });
  }

  async function step(dir) {
    if (busy || !isDetail()) return;
    busy = true;
    const next = (cur + dir + N) % N;
    const out = dItem.animate([
      { opacity: 1, filter: "blur(0px)", transform: "none" },
      { opacity: 0, filter: "blur(10px)", transform: `translateX(${-dir * 28}px)` },
    ], { duration: reduce ? 1 : 200, easing: "ease-in", fill: "forwards" });
    dName.style.opacity = 0;
    await out.finished;
    cur = next;
    renderDetail(cur);
    out.cancel();
    dName.style.opacity = 1;
    await dItem.animate([
      { opacity: 0, filter: "blur(10px)", transform: `translateX(${dir * 28}px)` },
      { opacity: 1, filter: "blur(0px)", transform: "none" },
    ], { duration: reduce ? 1 : 380, easing: EASE }).finished;
    busy = false;
  }

  $("prev").addEventListener("click", () => step(-1));
  $("next").addEventListener("click", () => step(1));
  $("close").addEventListener("click", closeDetail);

  /* ---------- About / Contact / Availability 小卡片 ---------- */
  const sheet = $("sheet");
  function openSheet(name) {
    $("sheetBody").innerHTML = $(`panel-${name}`).innerHTML;
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    $("sheetClose").focus({ preventScroll: true });
  }
  function closeSheet() { sheet.classList.remove("open"); sheet.setAttribute("aria-hidden", "true"); }
  document.querySelectorAll("[data-panel]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.panel)));
  $("cta").addEventListener("click", () => openSheet("availability"));
  $("sheetClose").addEventListener("click", closeSheet);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) closeSheet(); });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (sheet.classList.contains("open")) closeSheet(); else closeDetail(); }
    if (sheet.classList.contains("open")) return;
    if (e.key === "ArrowRight") step(1);
    if (e.key === "ArrowLeft") step(-1);
  });

  /* ---------- 跑马灯 ---------- */
  const unit = '<span>“Welcome”</span><span class="dot">✦</span><span>“Your present”</span><span class="dot">✦</span>';
  $("marquee").innerHTML = unit.repeat(8) + unit.repeat(8);

  // 手机上衣架比屏幕宽：打开时先滚到中间
  const wrap = $("rackWrap");
  if (wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2;

  window.addEventListener("resize", () => { dims(); placeLabel(false); });
})();
