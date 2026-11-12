/* Shared data and behaviour for the four design options. Each page styles the same markup its own way.
   Sample products and the WhatsApp number are placeholders, as in design/mockup-source.html. */
(() => {
  const IMG = "../img/";
  const WA_NUMBER = "97400000000"; // placeholder until the client confirms (content inventory C-1)
  const AREAS = [
    ["Al Sadd", 15], ["West Bay", 15], ["The Pearl", 15], ["Lusail", 15], ["Msheireb", 15], ["Al Waab", 15],
    ["Al Rayyan", 15], ["Al Wakra", 25], ["Al Khor", 25], ["Other", 25],
  ];
  const COND_NOTE = {
    Excellent: "Barely worn, no flaws we could find.",
    "Very good": "Light wear from use, nothing that shows when worn.",
    Good: "Visible wear such as fading or a small mark. Shown in photos.",
  };
  const P = (code, name, brand, era, cat, size, price, cond, m, img, status = "live") =>
    ({ code, name, brand, era, cat, size, price, cond, m, img, status });
  const PRODUCTS = [
    P("TQ-0721", "Black leather Chelsea boots", "Unbranded", "2010s", "Shoes", "EU 40", 175, "Very good", { Insole: 25.5, "Heel height": 5 }, "chelsea-boots"),
    P("TQ-0720", "White cut-out heel pumps", "Unbranded", "2000s", "Shoes", "EU 38", 130, "Excellent", { Insole: 24.5, "Heel height": 8 }, "white-cutout-heels"),
    P("TQ-0719", "Burgundy leather mini skirt", "Unbranded", "90s", "Bottoms", "S", 155, "Very good", { Waist: 34, Length: 44 }, "leather-mini-skirt", "reserved"),
    P("TQ-0718", "Denim midi skirt", "Unbranded", "90s", "Bottoms", "M", 115, "Excellent", { Waist: 37, Length: 72 }, "denim-midi-skirt"),
    P("TQ-0717", "Light wash straight jeans", "Unbranded", "2000s", "Bottoms", "W32", 120, "Good", { Waist: 41, Length: 106, Inseam: 80 }, "light-wash-jeans"),
    P("TQ-0716", "Rigid dark wash straight jeans", "Unbranded", "90s", "Bottoms", "W30", 140, "Very good", { Waist: 38, Length: 104, Inseam: 78 }, "dark-straight-jeans"),
    P("TQ-0715", "Butter yellow pinafore dress", "Unbranded", "Y2K", "Dresses", "S", 110, "Excellent", { Bust: 40, Waist: 33, Length: 84 }, "yellow-pinafore"),
    P("TQ-0714", "Speckled button-front midi dress", "Unbranded", "80s", "Dresses", "M", 145, "Very good", { Bust: 47, Waist: 39, Length: 118 }, "polka-button-dress"),
    P("TQ-0713", "Blue floral sheath dress", "Unbranded", "90s", "Dresses", "M", 135, "Very good", { Bust: 46, Waist: 38, Length: 96 }, "lavender-floral-dress"),
    P("TQ-0712", "Teal V-neck skater dress", "Unbranded", "2010s", "Dresses", "S", 120, "Excellent", { Bust: 42, Waist: 34, Length: 92 }, "green-vneck-dress"),
    P("TQ-0711", "Speedway graphic tee", "Unbranded", "2000s", "Tops", "L", 75, "Good", { "Pit to pit": 55, Length: 72 }, "speedway-tee", "sold"),
    P("TQ-0710", "Navy stripe ringer tee", "Unbranded", "90s", "Tops", "M", 65, "Excellent", { "Pit to pit": 52, Length: 70 }, "striped-tee"),
    P("TQ-0709", "Sage V-neck sweater", "Unbranded", "90s", "Knitwear", "M", 120, "Very good", { "Pit to pit": 55, Length: 64, Sleeve: 58 }, "mint-sweater"),
    P("TQ-0708", "Coral stripe open-knit jumper", "Unbranded", "2000s", "Knitwear", "S", 95, "Excellent", { "Pit to pit": 48, Length: 58, Sleeve: 57 }, "striped-knit"),
    P("TQ-0707", "Manhattan college sweatshirt", "Unbranded", "90s", "Knitwear", "M", 110, "Very good", { "Pit to pit": 56, Length: 66, Sleeve: 60 }, "college-sweatshirt"),
    P("TQ-0706", "Patchwork knit sweater", "Unbranded", "90s", "Knitwear", "L", 165, "Excellent", { "Pit to pit": 61, Length: 68, Sleeve: 60 }, "green-knit-sweater"),
    P("TQ-0705", "Olive bomber with shearling collar", "Timberland", "90s", "Outerwear", "L", 340, "Very good", { "Pit to pit": 62, Length: 66, Sleeve: 63 }, "olive-bomber", "sold"),
    P("TQ-0704", "Check wool double-breasted coat", "Unbranded", "80s", "Outerwear", "M", 290, "Good", { "Pit to pit": 52, Length: 92, Sleeve: 60 }, "tweed-coat"),
    P("TQ-0703", "Asymmetric zip denim jacket", "Unbranded", "Y2K", "Outerwear", "S", 150, "Very good", { "Pit to pit": 46, Length: 52, Sleeve: 60 }, "denim-jacket"),
    P("TQ-0702", "Green leather biker jacket", "Unbranded", "2000s", "Outerwear", "M", 320, "Very good", { "Pit to pit": 57, Length: 64, Sleeve: 63 }, "green-leather-jacket"),
    P("TQ-0701", "Embroidered tiger souvenir jacket", "Unbranded", "Y2K", "Outerwear", "L", 260, "Excellent", { "Pit to pit": 60, Length: 68, Sleeve: 62 }, "tiger-souvenir-jacket"),
  ];
  const CATS = ["Outerwear", "Knitwear", "Tops", "Dresses", "Bottoms", "Shoes"];

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const byCode = (c) => PRODUCTS.find((p) => p.code === c);
  const photo = (p) => IMG + p.img + ".jpg";
  const wa = (t) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(t)}`;
  const ICON = {
    lock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    unlock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.8"/></svg>',
    shuffle: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    wa: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  };

  const state = { cat: "All", hideSold: false };
  let bag = [];
  let form = { name: "", area: "", mode: "delivery" };
  try {
    const saved = JSON.parse(sessionStorage.getItem("tq-option-bag") || "null");
    if (saved) ({ bag, form } = saved);
  } catch {}
  const saveBag = () => { try { sessionStorage.setItem("tq-option-bag", JSON.stringify({ bag, form })); } catch {} };

  /* ----- catalogue ----- */
  function liveCount(cat) {
    return PRODUCTS.filter((p) => p.status === "live" && (cat === "All" || p.cat === cat)).length;
  }
  function renderChips() {
    document.querySelectorAll("[data-chips]").forEach((el) => {
      el.innerHTML = ["All", ...CATS].map((c) =>
        `<button class="chip" type="button" data-cat="${c}" aria-pressed="${c === state.cat}">${c}<span class="chip-n">${liveCount(c)}</span></button>`).join("");
    });
    document.querySelectorAll("[data-hide-sold]").forEach((b) => b.setAttribute("aria-pressed", state.hideSold));
  }
  function card(p) {
    const inBag = bag.includes(p.code);
    const flag = p.status === "sold" ? "Sold" : p.status === "reserved" ? "Reserved" : "";
    return `<article class="card is-${p.status}">
      <div class="card-media">
        <button class="card-ph" type="button" data-open="${p.code}" aria-label="View ${esc(p.name)}"><img src="${photo(p)}" alt="${esc(p.name)}" loading="lazy" width="720" height="900"></button>
        ${flag ? `<span class="card-flag">${flag}</span>` : `<span class="card-price"><b>${p.price}</b><small>QAR</small></span>`}
        ${p.status === "live" ? `<button class="card-add${inBag ? " in" : ""}" type="button" data-add="${p.code}" aria-label="${inBag ? "In your bag" : "Add " + esc(p.name) + " to bag"}">${inBag ? ICON.check : ICON.plus}<span class="card-add-tx">${inBag ? "In bag" : "Add to bag"}</span></button>` : ""}
      </div>
      <div class="card-info">
        <h3 class="card-name">${esc(p.name)}</h3>
        <p class="card-meta">${esc(p.brand)} · ${esc(p.era)} · ${esc(p.cond)}</p>
        <p class="card-row"><span class="card-size">${esc(p.size)}</span><span class="card-amount">${p.price} QAR</span></p>
      </div>
    </article>`;
  }
  function renderGrid() {
    const order = { live: 0, reserved: 1, sold: 2 };
    const list = PRODUCTS
      .filter((p) => (state.cat === "All" || p.cat === state.cat) && !(state.hideSold && p.status === "sold"))
      .sort((a, b) => order[a.status] - order[b.status]);
    document.querySelectorAll("[data-grid]").forEach((el) => {
      el.innerHTML = list.length ? list.map(card).join("") : `<p class="grid-empty">No pieces match these filters.</p>`;
    });
    document.querySelectorAll("[data-live-count]").forEach((el) => (el.textContent = liveCount("All")));
    document.querySelectorAll("[data-bag-count]").forEach((el) => (el.textContent = bag.length));
    renderChips();
    if (ob) renderOutfit();
  }
  function setCat(cat) {
    state.cat = cat;
    renderGrid();
  }

  /* ----- overlays (iOS-safe scroll lock, hidden overlays never block taps) ----- */
  let lockY = 0, locked = false, lastFocus = null;
  const lock = () => { if (locked) return; locked = true; lockY = scrollY; document.body.style.top = -lockY + "px"; document.body.classList.add("locked"); };
  const unlock = () => { if (!locked) return; locked = false; document.body.classList.remove("locked"); document.body.style.top = ""; scrollTo({ top: lockY, behavior: "instant" }); };
  document.body.insertAdjacentHTML("beforeend", `
    <div class="ov-scrim" hidden></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle" hidden></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="Your bag" hidden></aside>
    <div class="toast" role="status" aria-live="polite"></div>`);
  const scrim = $(".ov-scrim"), sheet = $(".sheet"), drawer = $(".drawer");
  function show(el) {
    lastFocus = document.activeElement;
    scrim.hidden = false; el.hidden = false; lock();
    requestAnimationFrame(() => { scrim.classList.add("on"); el.classList.add("on"); });
    setTimeout(() => el.querySelector(".ov-x")?.focus({ preventScroll: true }), 60);
  }
  function closeAll() {
    [scrim, sheet, drawer].forEach((e) => e.classList.remove("on"));
    setTimeout(() => { [scrim, sheet, drawer].forEach((e) => (e.hidden = true)); unlock(); lastFocus?.focus?.({ preventScroll: true }); }, 260);
  }
  scrim.addEventListener("click", closeAll);
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

  function openSheet(code) {
    const p = byCode(code), inBag = bag.includes(code);
    const rows = Object.entries(p.m).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v} cm</td></tr>`).join("");
    const action = p.status === "live"
      ? `<button class="btn btn-primary" type="button" data-sheet-add>${inBag ? "In your bag. View bag" : "Add to bag"}</button>`
      : `<button class="btn btn-primary" type="button" disabled>${p.status === "sold" ? "Sold" : "Reserved"}</button>`;
    sheet.innerHTML = `
      <div class="sh-media"><img src="${photo(p)}" alt="${esc(p.name)}"></div>
      <div class="sh-body">
        <p class="sh-meta">${esc(p.brand)} · ${esc(p.era)} · ${esc(p.cat)} · ${p.code}</p>
        <h2 class="sh-title" id="shTitle">${esc(p.name)}</h2>
        <p class="sh-price">${p.price} QAR</p>
        <table class="sh-table"><tbody>
          <tr><td>Tagged size</td><td>${esc(p.size)}</td></tr>${rows}<tr><td>Condition</td><td>${esc(p.cond)}</td></tr>
        </tbody></table>
        <p class="sh-note">${COND_NOTE[p.cond]} Measured flat. Lay a piece you own flat to compare.</p>
        <div class="sh-actions">${action}
          ${ob && p.status === "live" ? '<button class="btn btn-secondary" type="button" data-sheet-outfit>Build an outfit with this</button>' : ""}
          <a class="btn btn-secondary" target="_blank" rel="noopener" href="${wa(`Hi Thriftesque, is the ${p.name} (${p.code}) still available?`)}">Ask about this piece</a>
        </div>
      </div>
      <button class="ov-x" type="button" aria-label="Close">×</button>`;
    sheet.querySelector(".ov-x").onclick = closeAll;
    const add = sheet.querySelector("[data-sheet-add]");
    if (add) add.onclick = () => { if (!inBag) addToBag(code, true); sheet.classList.remove("on"); sheet.hidden = true; openBag(); };
    const build = sheet.querySelector("[data-sheet-outfit]");
    if (build) build.onclick = () => { obUse(p); closeAll(); setTimeout(() => document.getElementById("outfit")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }), 280); };
    show(sheet);
  }

  /* ----- bag ----- */
  const fee = () => (form.mode === "pickup" ? 0 : (AREAS.find(([a]) => a === form.area)?.[1] ?? 0));
  function message(items, sub) {
    let t = "Hi Thriftesque! I'd like to order:\n\n";
    items.forEach((p, i) => (t += `${i + 1}. ${p.name} (size ${p.size}), ${p.price} QAR [${p.code}]\n`));
    t += `\nSubtotal: ${sub} QAR\n` + (form.mode === "delivery" ? `Delivery: ${fee()} QAR\n` : "Pickup: free\n");
    t += `Total: ${sub + fee()} QAR\n\nName: ${form.name || "-"}\n` + (form.mode === "delivery" ? `Deliver to: ${form.area || "-"}` : "I'll pick up");
    return t;
  }
  function renderBag() {
    if (!bag.length) {
      drawer.innerHTML = `<div class="bag-head"><h2>Your bag</h2><button class="ov-x" type="button" aria-label="Close bag">×</button></div>
        <div class="bag-body bag-empty"><h3>Your bag is empty</h3><p>Add a piece from the drop and it shows up here.</p><button class="btn btn-primary" type="button" data-close>Shop the drop</button></div>`;
    } else {
      const items = bag.map(byCode), sub = items.reduce((s, p) => s + p.price, 0);
      const date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const ready = form.name.trim() && (form.mode === "pickup" || form.area);
      drawer.innerHTML = `<div class="bag-head"><h2>Your bag</h2><button class="ov-x" type="button" aria-label="Close bag">×</button></div>
        <div class="bag-body">
          <div class="receipt">
            <div class="rc-head"><b>THRIFTESQUE</b><span>Drop 07 · ${date} · ${items.length} item${items.length > 1 ? "s" : ""}</span></div>
            ${items.map((p) => `<div class="rc-line"><img src="${photo(p)}" alt="">
              <div><div class="rc-name">${esc(p.name)}</div><div class="rc-detail">Size ${esc(p.size)} · ${p.code}</div><button class="rc-rm" type="button" data-rm="${p.code}">Remove</button></div>
              <div class="rc-amt">${p.price}</div></div>`).join("")}
            <div class="rc-sum">
              <div><span>Subtotal</span><span>${sub} QAR</span></div>
              <div><span>${form.mode === "delivery" ? "Delivery" : "Pickup"}</span><span>${form.mode === "delivery" ? (form.area ? fee() + " QAR" : "choose area") : "free"}</span></div>
              <div class="rc-total"><span>Total</span><span>${sub + fee()} QAR</span></div>
            </div>
          </div>
          <div class="fields">
            <label class="field"><span>Your name</span><input id="bagName" autocomplete="name" placeholder="Name for the order" value="${esc(form.name)}"></label>
            <div class="field"><span>Delivery or pickup</span>
              <div class="seg">
                <button type="button" data-mode="delivery" aria-pressed="${form.mode === "delivery"}">Delivery<small>from 15 QAR</small></button>
                <button type="button" data-mode="pickup" aria-pressed="${form.mode === "pickup"}">Pickup<small>Free, we share the location</small></button>
              </div></div>
            ${form.mode === "delivery" ? `<label class="field"><span>Area</span><select id="bagArea"><option value="">Choose your area</option>${AREAS.map(([a]) => `<option ${a === form.area ? "selected" : ""}>${a}</option>`).join("")}</select></label>` : ""}
          </div>
        </div>
        <div class="bag-foot">
          <a class="btn btn-wa" ${ready ? `href="${wa(message(items, sub))}" target="_blank" rel="noopener"` : 'aria-disabled="true" role="link"'}>${ICON.wa}Send order on WhatsApp</a>
          <p class="bag-hint">${ready ? "Opens WhatsApp with this receipt as your message." : !form.name.trim() ? "Add your name to send the order." : "Choose your area to send the order."}</p>
        </div>`;
      drawer.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { bag = bag.filter((c) => c !== b.dataset.rm); saveBag(); renderGrid(); renderBag(); }));
      drawer.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { form.mode = b.dataset.mode; saveBag(); renderBag(); }));
      drawer.querySelector("#bagName").oninput = (e) => { form.name = e.target.value; saveBag(); renderFootOnly(items, sub); };
      const area = drawer.querySelector("#bagArea");
      if (area) area.onchange = () => { form.area = area.value; saveBag(); renderBag(); };
    }
    drawer.querySelector(".ov-x").onclick = closeAll;
    drawer.querySelector("[data-close]")?.addEventListener("click", closeAll);
  }
  function renderFootOnly(items, sub) {
    const ready = form.name.trim() && (form.mode === "pickup" || form.area);
    const a = drawer.querySelector(".btn-wa"), hint = drawer.querySelector(".bag-hint");
    if (ready) { a.href = wa(message(items, sub)); a.target = "_blank"; a.rel = "noopener"; a.removeAttribute("aria-disabled"); a.removeAttribute("role"); }
    else { a.removeAttribute("href"); a.setAttribute("aria-disabled", "true"); a.setAttribute("role", "link"); }
    hint.textContent = ready ? "Opens WhatsApp with this receipt as your message." : !form.name.trim() ? "Add your name to send the order." : "Choose your area to send the order.";
  }
  function openBag() { renderBag(); show(drawer); }
  function addToBag(code, quiet) {
    if (bag.includes(code)) return openBag();
    bag.push(code); saveBag(); renderGrid();
    document.querySelectorAll("[data-open-bag]").forEach((b) => { b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump"); });
    if (!quiet) toast(`Added ${byCode(code).name}`);
  }
  let toastT;
  function toast(t) {
    const el = $(".toast"); el.textContent = t; el.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("on"), 2000);
  }

  /* ----- outfit builder: a vertical stack of cut-out pieces. Arrows or a swipe change one slot; Shuffle changes the unlocked ones ----- */
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cutout = (p) => IMG + "cutouts/" + p.img + ".webp";
  const ob = document.querySelector("[data-outfit]");
  const OB_SLOTS = [
    { key: "top", label: "Top", cats: ["Tops", "Knitwear", "Outerwear"], mode: "separates" },
    { key: "dress", label: "Dress", cats: ["Dresses"], mode: "dress" },
    { key: "bottom", label: "Bottom", cats: ["Bottoms"], mode: "separates" },
    { key: "shoes", label: "Shoes", cats: ["Shoes"] },
  ];
  const obState = { mode: "separates", pick: {}, lock: {} };
  const obPool = (s) => PRODUCTS.filter((p) => p.status === "live" && s.cats.includes(p.cat)).map((p) => p.code);
  const obActive = () => OB_SLOTS.filter((s) => !s.mode || s.mode === obState.mode);
  const obItems = () => obActive().map((s) => byCode(obState.pick[s.key])).filter(Boolean);
  let obLive, obSwiped = false;
  function obStep(key, dir) {
    const pool = obPool(OB_SLOTS.find((x) => x.key === key)), i = pool.indexOf(obState.pick[key]);
    obState.pick[key] = pool[(i + dir + pool.length) % pool.length];
    renderOutfit({ [key]: dir > 0 ? "in-r" : "in-l" });
  }
  function obShuffle(slots = obActive()) {
    const anim = {};
    for (const s of slots) {
      if (obState.lock[s.key]) continue;
      const pool = obPool(s);
      let next = pool[Math.floor(Math.random() * pool.length)];
      if (pool.length > 1 && next === obState.pick[s.key]) next = pool[(pool.indexOf(next) + 1) % pool.length];
      obState.pick[s.key] = next;
      anim[s.key] = "in-pop";
    }
    return anim;
  }
  const obFill = () => obShuffle(obActive().filter((s) => !obState.pick[s.key]));
  function obUse(p) {
    const s = OB_SLOTS.find((x) => x.cats.includes(p.cat));
    if (!s) return;
    if (s.mode) obState.mode = s.mode;
    obState.pick[s.key] = p.code;
    obState.lock[s.key] = true;
    renderOutfit({ ...obFill(), [s.key]: "in-pop" });
  }
  function renderOutfit(anim = {}) {
    // Keep keyboard focus on the same control across re-renders.
    const f = document.activeElement;
    const keep = f && ob.contains(f) ? [...f.attributes].filter((x) => x.name.startsWith("data-ob")).map((x) => `[${x.name}="${x.value}"]`).join("") : "";
    const items = obItems(), total = items.reduce((t, p) => t + p.price, 0);
    const allIn = items.length > 0 && items.every((p) => bag.includes(p.code));
    const ask = `Hi Thriftesque, is this outfit still available?\n\n${items.map((p, i) => `${i + 1}. ${p.name} (size ${p.size}), ${p.price} QAR [${p.code}]`).join("\n")}\n\nTotal: ${total} QAR`;
    const motion = reduced() ? {} : anim;
    ob.innerHTML = `
      <div class="ob-stage">
      <div class="ob-modes" role="group" aria-label="Outfit type">
        <button type="button" data-ob-mode="separates" aria-pressed="${obState.mode === "separates"}">Top + bottom</button>
        <button type="button" data-ob-mode="dress" aria-pressed="${obState.mode === "dress"}">Dress</button>
      </div>${obActive().map((s) => {
        const p = byCode(obState.pick[s.key]), locked = !!obState.lock[s.key], name = s.label.toLowerCase();
        return `<div class="ob-row ob-row-${s.key}">
          <button type="button" class="ob-nav" data-ob-step="${s.key}" data-ob-dir="-1" aria-label="Previous ${name}">‹</button>
          <div class="ob-item" data-ob-swipe="${s.key}">
            <button type="button" class="ob-pick" data-open="${p.code}" aria-label="${s.label}: ${esc(p.name)}, size ${esc(p.size)}, ${p.price} QAR. View details">
              <img class="${motion[s.key] || ""}" src="${cutout(p)}" alt="" draggable="false"></button>
            <button type="button" class="ob-lock" data-ob-lock="${s.key}" aria-pressed="${locked}" aria-label="Keep this ${name} when shuffling">${locked ? ICON.lock : ICON.unlock}</button>
          </div>
          <button type="button" class="ob-nav" data-ob-step="${s.key}" data-ob-dir="1" aria-label="Next ${name}">›</button>
        </div>`;
      }).join("")}</div>
      <ul class="ob-list">${obActive().map((s) => {
        const p = byCode(obState.pick[s.key]);
        return `<li><span class="ob-k">${s.label}</span><span class="ob-n">${esc(p.name)}<small>Size ${esc(p.size)} · ${p.code}</small></span><b>${p.price} QAR</b></li>`;
      }).join("")}
        <li class="ob-total"><span>Outfit total</span><b>${total} QAR</b></li>
      </ul>
      <div class="ob-actions">
        <button type="button" class="btn btn-secondary ob-shuffle" data-ob-shuffle>${ICON.shuffle}<span class="ob-sh-tx">Shuffle</span></button>
        <button type="button" class="btn btn-primary" data-ob-add>${allIn ? "Outfit is in your bag" : `Add outfit · ${total} QAR`}</button>
      </div>
      <a class="ob-ask" target="_blank" rel="noopener" href="${wa(ask)}">Ask about this outfit on WhatsApp</a>`;
    if (keep) ob.querySelector(keep)?.focus({ preventScroll: true });
    if (Object.keys(anim).length) obLive.textContent = "Outfit: " + items.map((p) => p.name).join(", ");
  }
  if (ob) {
    ob.insertAdjacentHTML("afterend", '<p class="sr" aria-live="polite"></p>');
    obLive = ob.nextElementSibling;
    // Swipe a piece sideways to change it. Vertical movement still scrolls the page (touch-action: pan-y).
    let sx = 0, sy = 0, skey = "";
    ob.addEventListener("pointerdown", (e) => { const it = e.target.closest("[data-ob-swipe]"); skey = it ? it.dataset.obSwipe : ""; sx = e.clientX; sy = e.clientY; obSwiped = false; });
    ob.addEventListener("pointerup", (e) => {
      if (!skey) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { obSwiped = true; setTimeout(() => (obSwiped = false), 80); obStep(skey, dx < 0 ? 1 : -1); }
      skey = "";
    });
    ob.addEventListener("click", (e) => {
      if (obSwiped) { obSwiped = false; e.stopPropagation(); e.preventDefault(); return; }
      const t = e.target.closest("[data-ob-mode],[data-ob-step],[data-ob-lock],[data-ob-shuffle],[data-ob-add]");
      if (!t) return;
      if (t.dataset.obMode) { obState.mode = t.dataset.obMode; renderOutfit(obFill()); }
      else if (t.dataset.obStep) obStep(t.dataset.obStep, Number(t.dataset.obDir));
      else if (t.dataset.obLock) { obState.lock[t.dataset.obLock] = !obState.lock[t.dataset.obLock]; renderOutfit(); }
      else if (t.hasAttribute("data-ob-shuffle")) renderOutfit(obShuffle());
      else if (t.hasAttribute("data-ob-add")) {
        const items = obItems();
        if (items.every((p) => bag.includes(p.code))) return openBag();
        items.forEach((p) => { if (!bag.includes(p.code)) bag.push(p.code); });
        saveBag(); renderGrid(); openBag();
      }
    }, true);
    obShuffle();
  }

  /* ----- looks: moodboards of pieces that go together. Production: suggested by AI in the dashboard, approved by the team,
     stored, and retired automatically once a piece is no longer live. These samples were picked by hand for the mockup. ----- */
  const looksEl = document.querySelector("[data-looks]");
  const LOOKS = [
    { id: "denim-day", title: "Denim day", note: "A patchwork knit over a denim midi skirt, with black Chelsea boots.", codes: ["TQ-0706", "TQ-0718", "TQ-0721"] },
    { id: "stripes", title: "Stripes and dark denim", note: "A navy ringer tee with rigid straight jeans and white cut-out heels.", codes: ["TQ-0710", "TQ-0716", "TQ-0720"] },
    { id: "leather", title: "Leather and light wash", note: "The green leather biker over light wash jeans, with Chelsea boots.", codes: ["TQ-0702", "TQ-0717", "TQ-0721"] },
    { id: "florals", title: "Florals for dinner", note: "The blue floral sheath dress with white cut-out heels.", codes: ["TQ-0713", "TQ-0720"] },
  ];
  // Where each piece sits on a 4:5 board, by slot: x, y, width, height in %, rotation in degrees.
  const BOARD = {
    top: [4, 3, 56, 42, -5], bottom: [44, 27, 52, 61, 4], shoes: [6, 62, 38, 30, -7],
    dress: [6, 4, 60, 82, -3], shoesWithDress: [58, 60, 38, 32, 7],
  };
  const slotOf = (p) => OB_SLOTS.find((x) => x.cats.includes(p.cat))?.key;
  const lookItems = (l) => l.codes.map(byCode);
  const liveLooks = () => LOOKS.filter((l) => lookItems(l).every((p) => p?.status === "live"));
  function board(l, big) {
    const items = lookItems(l), hasDress = items.some((p) => slotOf(p) === "dress");
    return `<div class="look-board${big ? " big" : ""}" aria-hidden="true">
      <svg class="look-chrome" viewBox="0 0 64 58"><use href="#chromeHeart"/></svg>
      ${items.map((p) => {
        const k = slotOf(p), [x, y, w, h, r] = BOARD[k === "shoes" && hasDress ? "shoesWithDress" : k];
        return `<img src="${cutout(p)}" alt="" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%;transform:rotate(${r}deg)" draggable="false">
          <span class="look-tag" style="left:${Math.min(x + w - 14, 80)}%;top:${y + 2}%">${p.price}</span>`;
      }).join("")}
    </div>`;
  }
  function renderLooks() {
    looksEl.innerHTML = liveLooks().map((l) => {
      const items = lookItems(l), total = items.reduce((t, p) => t + p.price, 0);
      return `<article class="look">
        <button type="button" class="look-open" data-look="${l.id}" aria-label="Open look: ${esc(l.title)}, ${items.length} pieces, ${total} QAR">${board(l)}</button>
        <div class="look-info"><h3>${esc(l.title)}</h3><p>${items.length} pieces · ${total} QAR</p></div>
      </article>`;
    }).join("") || `<p class="grid-empty">New looks are on the way.</p>`;
  }
  function openLook(id) {
    const l = LOOKS.find((x) => x.id === id), items = lookItems(l), total = items.reduce((t, p) => t + p.price, 0);
    const allIn = items.every((p) => bag.includes(p.code));
    const ask = `Hi Thriftesque, is this look still available? (${l.title})\n\n${items.map((p, i) => `${i + 1}. ${p.name} (size ${p.size}), ${p.price} QAR [${p.code}]`).join("\n")}\n\nTotal: ${total} QAR`;
    sheet.innerHTML = `
      <div class="sh-media look-media">${board(l, true)}</div>
      <div class="sh-body">
        <p class="sh-meta">AI pick · ${items.length} pieces</p>
        <h2 class="sh-title" id="shTitle">${esc(l.title)}</h2>
        <p class="sh-note">${esc(l.note)}</p>
        <ul class="look-list">${items.map((p) => `<li><img src="${cutout(p)}" alt=""><span>${esc(p.name)}<small>Size ${esc(p.size)} · ${p.code}</small></span><b>${p.price} QAR</b></li>`).join("")}
          <li class="look-total"><span>Look total</span><b>${total} QAR</b></li></ul>
        <div class="sh-actions">
          <button class="btn btn-primary" type="button" data-look-add>${allIn ? "Look is in your bag. View bag" : `Add look to bag · ${total} QAR`}</button>
          ${ob ? '<button class="btn btn-secondary" type="button" data-look-build>Remix it in the outfit builder</button>' : ""}
          <a class="btn btn-secondary" target="_blank" rel="noopener" href="${wa(ask)}">Ask about this look</a>
        </div>
      </div>
      <button class="ov-x" type="button" aria-label="Close">×</button>`;
    sheet.querySelector(".ov-x").onclick = closeAll;
    sheet.querySelector("[data-look-add]").onclick = () => {
      items.forEach((p) => { if (!bag.includes(p.code)) bag.push(p.code); });
      saveBag(); renderGrid(); sheet.classList.remove("on"); sheet.hidden = true; openBag();
    };
    const build = sheet.querySelector("[data-look-build]");
    if (build) build.onclick = () => {
      obState.mode = items.some((p) => slotOf(p) === "dress") ? "dress" : "separates";
      obState.lock = {};
      const anim = {};
      items.forEach((p) => { const k = slotOf(p); obState.pick[k] = p.code; obState.lock[k] = true; anim[k] = "in-pop"; });
      renderOutfit({ ...obFill(), ...anim });
      closeAll();
      setTimeout(() => document.getElementById("outfit")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }), 280);
    };
    show(sheet);
  }
  if (looksEl) {
    // One chrome heart shape, reused by every board.
    document.body.insertAdjacentHTML("beforeend", `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
      <linearGradient id="chromeG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7fbff"/><stop offset=".28" stop-color="#9fb0cc"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".72" stop-color="#5b6d8e"/><stop offset="1" stop-color="#dfe9f8"/></linearGradient>
      <symbol id="chromeHeart" viewBox="0 0 64 58"><path d="M32 56S2 38 2 18A15 15 0 0 1 32 10a15 15 0 0 1 30 8c0 20-30 38-30 38z" fill="url(#chromeG)" stroke="#3d4b66" stroke-opacity=".35"/><ellipse cx="18" cy="16" rx="7" ry="4" fill="#fff" opacity=".85" transform="rotate(-30 18 16)"/></symbol>
    </defs></svg>`);
    renderLooks();
  }

  /* ----- wiring ----- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open],[data-add],[data-cat],[data-open-bag],[data-hide-sold],[data-go-cat],[data-look]");
    if (!t) return;
    if (t.dataset.look) openLook(t.dataset.look);
    else if (t.dataset.open) openSheet(t.dataset.open);
    else if (t.dataset.add) addToBag(t.dataset.add);
    else if (t.dataset.cat) setCat(t.dataset.cat);
    else if (t.hasAttribute("data-open-bag")) openBag();
    else if (t.hasAttribute("data-hide-sold")) { state.hideSold = !state.hideSold; renderGrid(); }
    else if (t.dataset.goCat) { e.preventDefault(); setCat(t.dataset.goCat); document.getElementById("shop")?.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" }); }
  });
  document.querySelectorAll("[data-wa]").forEach((a) => (a.href = wa("Hi Thriftesque!")));
  document.querySelectorAll("[data-photo]").forEach((img) => (img.src = IMG + img.dataset.photo + ".jpg"));
  // Headers that sit over a hero turn solid once the page scrolls.
  const hdr = document.querySelector("[data-scroll-header]");
  if (hdr) {
    const sync = () => hdr.classList.toggle("solid", scrollY > 24);
    addEventListener("scroll", sync, { passive: true });
    sync();
  }
  const bar = document.querySelector(".optbar"), cur = bar?.querySelector("[aria-current]");
  if (bar && cur) bar.scrollLeft = cur.offsetLeft - (bar.clientWidth - cur.offsetWidth) / 2;
  renderGrid();
})();
