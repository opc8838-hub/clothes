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

  /* ---------- 木衣架（与衣服图同一坐标系：正面 300 宽，侧面 110 宽，领口在 y=0~20） ---------- */
  document.body.insertAdjacentHTML("afterbegin",
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <linearGradient id="ypWood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#9a5634"/><stop offset=".55" stop-color="#6f3520"/><stop offset="1" stop-color="#4a2113"/>
      </linearGradient></defs></svg>`);
  const HOOK = 'stroke="#a3a3a6" stroke-width="2.4" fill="none" stroke-linecap="round"';
  const hangerSVG = {
    front: `<svg class="hanger" viewBox="0 -50 300 90" preserveAspectRatio="none">
      <path d="M150 8 L150 -38 C150 -58 170 -60 171 -46" ${HOOK}/>
      <path d="M62 34 Q150 -8 238 34 L238 44 Q150 8 62 44 Z" fill="url(#ypWood)"/>
      <rect x="143" y="2" width="14" height="10" rx="2" fill="#c9c9cc"/></svg>`,
    side: `<svg class="hanger" viewBox="0 -50 110 90" preserveAspectRatio="none">
      <path d="M53 8 L53 -38 C53 -58 71 -60 72 -46" ${HOOK}/>
      <path d="M45 6 L61 6 L63 32 L43 32 Z" fill="url(#ypWood)"/>
      <rect x="48" y="2" width="10" height="7" rx="2" fill="#c9c9cc"/></svg>`,
  };
  const face = (p, kind) =>
    `<div class="face ${kind}">${p.hanger !== false ? hangerSVG[kind] : ""}` +
    `<img src="${p[kind]}" alt="${kind === "front" ? p.name : ""}" draggable="false"></div>`;

  /* ---------- 挂上衣服 ---------- */
  rack.style.setProperty("--n", N);
  itemsEl.innerHTML = P.map((p, i) =>
    `<button class="item" data-i="${i}" aria-label="${p.name}"><div class="swing">${face(p, "side")}${face(p, "front")}</div></button>`
  ).join("");
  const items = [...itemsEl.children];
  P.forEach((p) => { new Image().src = p.front; });

  /* ---------- 尺寸（随窗口变化，现算） ---------- */
  function dims() {
    const img = items[0].querySelector(".face.side img");
    const gh = img.offsetHeight;
    return { slot: gh * .29, open: gh * 300 / 340 + gh * .08 };
  }
  // 第 i 件衣服的中心相对整排中点的位置（h = 正在转正面的那件）
  function pos(i, h, d) {
    let x = 0;
    for (let j = 0; j < i; j++) x += j === h ? d.open : d.slot;
    x += (i === h ? d.open : d.slot) / 2;
    const total = (N - 1) * d.slot + (h >= 0 ? d.open : d.slot);
    return x - total / 2;
  }

  /* ---------- 摆动：被挤开的衣服晃一下 ---------- */
  function currentAngle(el) {
    const m = getComputedStyle(el).transform;
    if (!m || m === "none") return 0;
    const v = m.match(/matrix\(([^)]+)\)/);
    if (!v) return 0;
    const [a, b] = v[1].split(",").map(Number);
    return Math.atan2(b, a) * 180 / Math.PI;
  }
  function sway(i, a) {
    if (reduce || Math.abs(a) < .15) return;
    const el = items[i].firstElementChild;
    const from = currentAngle(el);
    el.getAnimations().forEach((x) => x.cancel());
    const r = (deg) => ({ transform: `rotate(${deg}deg)` });
    el.animate([
      r(from), { ...r(a), offset: .2 }, { ...r(-a * .5), offset: .45 },
      { ...r(a * .22), offset: .68 }, { ...r(-a * .08), offset: .86 }, r(0),
    ], { duration: 1400, easing: "ease-in-out" });
  }

  /* ---------- 悬停：转正面 + 挤开两边 ---------- */
  let hovered = -1;
  function setHover(h, { quiet = false } = {}) {
    if (h === hovered) return;
    const d = dims();
    if (!quiet) {
      items.forEach((_, i) => {
        const shift = pos(i, h, d) - pos(i, hovered, d);
        let a = Math.max(-5, Math.min(5, -shift * .032));
        if (i === h) a = (hovered >= 0 && hovered > h ? -1 : 1) * 1.6;
        sway(i, a);
      });
    }
    if (hovered >= 0) items[hovered].classList.remove("on");
    hovered = h;
    if (h >= 0) {
      items[h].classList.add("on");
      label.textContent = P[h].name;
      const fresh = !label.classList.contains("show");
      if (fresh) label.style.transition = "none";   // 第一次出现不要从别处滑过来
      label.style.left = `${rack.offsetLeft + rack.offsetWidth / 2 + pos(h, h, d)}px`;
      if (fresh) { void label.offsetWidth; label.style.transition = ""; }
      label.classList.add("show");
    } else {
      label.classList.remove("show");
    }
  }

  let pointerOnRack = false;
  items.forEach((el, i) => {
    el.addEventListener("mouseenter", () => { if (canHover && !body.classList.contains("is-detail")) setHover(i); });
    el.addEventListener("focus", () => { if (!body.classList.contains("is-detail")) setHover(i); });
    el.addEventListener("click", () => {
      if (body.classList.contains("is-detail")) return;
      if (canHover || hovered === i) openDetail(i);
      else { setHover(i); setTimeout(() => openDetail(i), 380); }   // 手机：先转身再打开
    });
  });
  itemsEl.addEventListener("mouseenter", () => { pointerOnRack = true; });
  itemsEl.addEventListener("mouseleave", () => {
    pointerOnRack = false;
    if (!body.classList.contains("is-detail")) setHover(-1);
  });
  itemsEl.addEventListener("focusout", (e) => {
    if (!itemsEl.contains(e.relatedTarget) && !pointerOnRack && !body.classList.contains("is-detail")) setHover(-1);
  });

  /* ---------- 详情 ---------- */
  let cur = 0, busy = false;
  function renderDetail(i) {
    dItem.innerHTML = face(P[i], "front");
    dCount.textContent = `${pad(i + 1)} / ${pad(N)}`;
    dName.textContent = P[i].name;
  }
  function flipFrom(rect, reverse) {
    const t = dItem.getBoundingClientRect();
    const s = rect.height / t.height;
    const dx = rect.left + rect.width / 2 - (t.left + t.width * s / 2);
    const dy = rect.top - t.top;
    const kf = [{ transform: `translate(${dx}px, ${dy}px) scale(${s})` }, { transform: "none" }];
    return dItem.animate(reverse ? kf.reverse() : kf, { duration: reduce ? 1 : 650, easing: EASE, fill: reverse ? "forwards" : "none" });
  }
  function frontRect(i) {
    const r = items[i].getBoundingClientRect();
    const gh = r.height - items[i].querySelector(".face.front img").offsetTop;
    const w = gh * 300 / 340;
    return { left: r.left + r.width / 2 - w / 2, top: r.top, width: w, height: r.height };
  }

  function openDetail(i) {
    if (busy) return;
    cur = i;
    renderDetail(i);
    const from = frontRect(i);
    items.forEach((el) => el.classList.remove("picked"));
    items[i].classList.add("picked");
    body.classList.add("is-detail");
    dItem.classList.add("show");
    label.classList.remove("show");
    flipFrom(from, false);
    $("detail").setAttribute("aria-hidden", "false");
    $("next").focus({ preventScroll: true });
  }

  function closeDetail() {
    if (!body.classList.contains("is-detail") || busy) return;
    busy = true;
    // 在虚化背景里瞬间把目标衣服转成正面，好让详情图“飞回”它的位置
    rack.classList.add("no-anim");
    setHover(cur, { quiet: true });
    if (hovered === cur) items[cur].classList.add("on");
    void rack.offsetWidth;
    const to = frontRect(cur);
    rack.classList.remove("no-anim");
    body.classList.remove("is-detail");
    $("detail").setAttribute("aria-hidden", "true");
    flipFrom(to, true).finished.then(() => {
      items[cur].classList.remove("picked");
      dItem.classList.remove("show");
      dItem.getAnimations().forEach((a) => a.cancel());
      busy = false;
      if (!pointerOnRack) setTimeout(() => { if (!pointerOnRack && !body.classList.contains("is-detail")) setHover(-1); }, 700);
      items[cur].focus({ preventScroll: true });
    });
  }

  async function step(dir) {
    if (busy || !body.classList.contains("is-detail")) return;
    busy = true;
    const next = (cur + dir + N) % N;
    const out = dItem.animate([
      { opacity: 1, filter: "blur(0px)", transform: "none" },
      { opacity: 0, filter: "blur(10px)", transform: `translateX(${-dir * 28}px)` },
    ], { duration: reduce ? 1 : 200, easing: "ease-in", fill: "forwards" });
    dName.style.opacity = 0;
    await out.finished;
    items[cur].classList.remove("picked");
    cur = next;
    items[cur].classList.add("picked");
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
  const unit = '<span>New designs daily</span><span class="dot">•</span><span>Subscribe to our newsletter</span><span class="dot">•</span>';
  $("marquee").innerHTML = unit.repeat(8) + unit.repeat(8);

  window.addEventListener("resize", () => {
    if (hovered >= 0) label.style.left = `${rack.offsetLeft + rack.offsetWidth / 2 + pos(hovered, hovered, dims())}px`;
  });
})();
