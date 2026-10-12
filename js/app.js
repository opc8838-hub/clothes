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

  /* ---------- 一件衣服：一张图（正面 + 衣架 + 挂钩），挂着时在 3D 里转开 rest 度 ---------- */
  const face = (p, shade = true) =>
    `<div class="face" style="--rest:${p.rest || 72}deg"><img src="${p.img}" alt="${p.name}" draggable="false">` +
    (shade ? `<i class="shade" style="-webkit-mask-image:url('${p.img}');mask-image:url('${p.img}')"></i>` : "") + `</div>`;

  /* ---------- 挂上衣服 ---------- */
  rack.style.setProperty("--n", N);
  itemsEl.innerHTML = P.map((p, i) =>
    `<button class="item" data-i="${i}" aria-label="${p.name}"><div class="swing">${face(p)}</div></button>`
  ).join("");
  const items = [...itemsEl.children];

  /* ---------- 尺寸（随窗口变化，现算） ---------- */
  function dims() {
    const gh = items[0].offsetHeight * 340 / 390;
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
    dItem.innerHTML = face(P[i], false);
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
    const gh = r.height * 340 / 390;
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
  const unit = '<span>“Welcome”</span><span class="dot">✦</span><span>“Your present”</span><span class="dot">✦</span>';
  $("marquee").innerHTML = unit.repeat(8) + unit.repeat(8);

  // 手机上衣架比屏幕宽：打开时先滚到中间
  const wrap = $("rackWrap");
  if (wrap.scrollWidth > wrap.clientWidth) wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2;

  window.addEventListener("resize", () => {
    if (hovered >= 0) label.style.left = `${rack.offsetLeft + rack.offsetWidth / 2 + pos(hovered, hovered, dims())}px`;
  });
})();
