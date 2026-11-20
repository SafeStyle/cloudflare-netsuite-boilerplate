/*
 * Walkthrough player. Plain JavaScript, no build step and no network requests, so
 * the page also works when index.html is opened straight from disk.
 *
 * It draws a simulated Windows desktop (browser, File Explorer, Command Prompt,
 * Notepad) and plays the steps registered in steps.js. Each step's `run(s)` sets up
 * the screen from scratch and then animates it with the helpers on `s`, so any step
 * can be jumped to directly. See docs/walkthrough.md.
 */
"use strict";
(function () {
  const WT = (window.WT = { steps: [], screens: {} });
  const STAGE_W = 1280;
  const STAGE_H = 800;
  const CANCEL = Symbol("cancelled");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const st = { i: 0, paused: true, started: false, auto: true, speed: 1, token: null, scale: 1, finished: false };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const esc = (WT.esc = (text) =>
    String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]));

  let stage, cursor, notes, layer;
  const term = { lines: [] };

  // --- the desktop -------------------------------------------------------------

  const winButtons = '<span class="wb"><i>&#x2013;</i><i>&#x25A1;</i><i>&#x2715;</i></span>';

  function buildStage() {
    stage = $("#stage");
    stage.innerHTML = `
      <div class="desk">
        <div class="win browser" data-app="browser">
          <div class="b-tabs"><div id="bTabs"></div>${winButtons}</div>
          <div class="b-tool">
            <span class="nb">&#x2190;</span><span class="nb">&#x2192;</span><span class="nb">&#x27F3;</span>
            <div class="b-addr" id="bAddr"><span class="b-lock" id="bLock"></span><span id="bUrl"></span></div>
            <span class="nb" id="bDl">&#x2913;</span><span class="b-me">A</span>
          </div>
          <div class="b-load" id="bLoad"></div>
          <div class="b-view" id="bView"></div>
          <div class="b-fly" id="bFly" hidden></div>
        </div>
        <div class="win explorer" data-app="explorer">
          <div class="x-title"><span class="x-tab"><i class="ic-folder"></i><span id="xTab">Downloads</span></span>${winButtons}</div>
          <div class="x-cmd"><span>&#xFF0B; New</span><span>Cut</span><span>Copy</span><span>Paste</span><span>Rename</span><span>Sort</span><span>View</span><span id="xExtract" hidden>Extract all</span></div>
          <div class="x-bar"><span class="nb">&#x2190;</span><span class="nb">&#x2192;</span><span class="nb">&#x2191;</span><div class="x-addr" id="xAddr"></div><div class="x-search">Search</div></div>
          <div class="x-main">
            <div class="x-nav"><p><i class="ic-home"></i>Home</p><p><i class="ic-folder"></i>Desktop</p><p id="xNavDl"><i class="ic-folder"></i>Downloads</p><p><i class="ic-folder"></i>Documents</p><p><i class="ic-pc"></i>This PC</p><p id="xNavC"><i class="ic-drive"></i>Local Disk (C:)</p></div>
            <div class="x-list"><div class="x-head"><span>Name</span><span>Date modified</span><span>Type</span><span>Size</span></div><div id="xItems"></div></div>
          </div>
          <div class="x-status" id="xStatus"></div>
        </div>
        <div class="win terminal" data-app="terminal">
          <div class="t-title"><span class="t-tab"><i class="ic-cmd"></i>Command Prompt</span><span class="t-plus">&#xFF0B;</span>${winButtons}</div>
          <pre class="t-body" id="tBody"></pre>
        </div>
        <div class="win notepad" data-app="notepad">
          <div class="n-title"><span class="n-tab"><i class="ic-note"></i><span id="nTab">Untitled</span></span>${winButtons}</div>
          <div class="n-menu"><span id="nFile">File</span><span>Edit</span><span>View</span></div>
          <pre class="n-body" id="nBody"></pre>
          <div class="n-status"><span id="nPos">Ln 1, Col 1</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span></div>
        </div>
        <div class="layer" id="layer"></div>
      </div>
      <div class="taskbar">
        <div class="tb-apps">
          <span class="tb" data-tb="start"><i class="ic-start"></i></span>
          <span class="tb" data-tb="browser"><i class="ic-browser"></i></span>
          <span class="tb" data-tb="explorer"><i class="ic-folder big"></i></span>
          <span class="tb" data-tb="terminal"><i class="ic-cmd big"></i></span>
          <span class="tb" data-tb="notepad"><i class="ic-note big"></i></span>
        </div>
        <div class="tb-clock">10:24 AM<br>21/11/2026</div>
      </div>
      <div id="notes"></div>
      <div id="cursor"><svg viewBox="0 0 20 28" width="20" height="28"><path d="M2 2v20l5.2-4.8 3.6 8.2 3-1.3-3.6-8.1H17z" fill="#fff" stroke="#111" stroke-width="1.5" stroke-linejoin="round"/></svg></div>
      <div class="sim-badge">Simulated screens &middot; sample data</div>`;
    cursor = $("#cursor");
    notes = $("#notes");
    layer = $("#layer");
    cursor.style.left = "640px";
    cursor.style.top = "420px";
  }

  function fit() {
    const wrap = $("#stageWrap");
    const scale = Math.min(wrap.clientWidth / STAGE_W, (window.innerHeight - 150) / STAGE_H, 1.25);
    st.scale = Math.max(0.25, scale);
    stage.style.transform = `scale(${st.scale})`;
    wrap.style.height = `${STAGE_H * st.scale}px`;
  }

  /** Position of an element in stage units. */
  function box(node) {
    const r = node.getBoundingClientRect();
    const s = stage.getBoundingClientRect();
    return { l: (r.left - s.left) / st.scale, t: (r.top - s.top) / st.scale, w: r.width / st.scale, h: r.height / st.scale };
  }

  // --- the helpers a step gets ---------------------------------------------------

  function makeApi(token) {
    const alive = () => {
      if (token.cancelled) throw CANCEL;
    };
    const find = (target) => (typeof target === "string" ? stage.querySelector(target) : target);
    const need = (target) => {
      const node = find(target);
      if (!node) console.warn("walkthrough: nothing matches", target);
      return node;
    };

    const s = {
      PROMPT: "",

      /** Wait `ms` at normal speed. Pausing freezes it; changing step cancels it. */
      async wait(ms) {
        let left = reducedMotion ? Math.min(ms, 60) : ms;
        let last = performance.now();
        while (left > 0) {
          await new Promise((r) => setTimeout(r, 30));
          alive();
          const now = performance.now();
          if (!st.paused) left -= (now - last) * st.speed;
          last = now;
        }
        alive();
      },

      $: find,

      /** Bring one application's window to the front. */
      app(name) {
        stage.querySelectorAll(".win").forEach((w) => w.classList.toggle("on", w.dataset.app === name));
        stage.querySelectorAll(".tb").forEach((b) => {
          b.classList.toggle("active", b.dataset.tb === name);
          if (b.dataset.tb === name) b.classList.add("open");
        });
      },

      /** Mark which apps have a window open (shown under the taskbar icons). */
      open(...names) {
        stage.querySelectorAll(".tb").forEach((b) => b.classList.toggle("open", names.includes(b.dataset.tb)));
      },

      /**
       * Click an app's taskbar icon, then show its window. `setup` fills the window
       * first, e.g. `() => s.notepad({...})`.
       */
      async switchTo(name, setup) {
        await s.click(`.tb[data-tb="${name}"]`);
        if (setup) setup();
        s.app(name);
        await s.wait(350);
      },

      // Browser ----------------------------------------------------------------
      browser({ url, tabs, active, html, secure = true }) {
        s.app("browser");
        if (tabs) {
          const on = active ?? tabs.length - 1;
          $("#bTabs").innerHTML =
            tabs.map((title, i) => `<span class="b-tab${i === on ? " on" : ""}"><i></i><b>${esc(title)}</b><u>&#x2715;</u></span>`).join("") +
            '<span class="b-new">&#xFF0B;</span>';
        }
        if (url !== undefined) {
          $("#bUrl").textContent = url;
          $("#bLock").className = "b-lock" + (secure ? "" : " plain");
        }
        if (html !== undefined) {
          $("#bView").innerHTML = html;
          $("#bView").scrollTop = 0;
        }
        $("#bFly").hidden = true;
      },

      /** Type an address, show the loading bar, then the page. */
      async go(url, page) {
        s.app("browser");
        const urlEl = $("#bUrl");
        await s.click("#bAddr");
        $("#bAddr").classList.add("focus");
        urlEl.textContent = "";
        for (const ch of url) {
          urlEl.textContent += ch;
          await s.wait(16);
        }
        await s.wait(250);
        $("#bAddr").classList.remove("focus");
        await s.load(page);
      },

      /** A page load: loading bar, then swap tabs, address and content. */
      async load(page) {
        const bar = $("#bLoad");
        bar.classList.remove("run");
        void bar.offsetWidth;
        bar.classList.add("run");
        await s.wait(520);
        s.browser(page);
        bar.classList.remove("run");
        await s.wait(250);
      },

      fly(html) {
        const f = $("#bFly");
        f.hidden = !html;
        f.innerHTML = html || "";
      },

      async scroll(target, offset = 120) {
        const view = $("#bView");
        const node = typeof target === "number" ? null : need(target);
        const top = node ? Math.max(0, view.scrollTop + box(node).t - box(view).t - offset) : target;
        view.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
        await s.wait(550);
      },

      // Pointer ----------------------------------------------------------------
      async move(target, ax = 0.5, ay = 0.5) {
        const node = need(target);
        if (!node) return;
        const view = $("#bView");
        if (view.contains(node)) {
          const b = box(node);
          const v = box(view);
          if (b.t < v.t + 8 || b.t + b.h > v.t + v.h - 8) await s.scroll(node, v.h / 2 - 20);
        }
        const b = box(node);
        const x = b.l + b.w * ax;
        const y = b.t + b.h * ay;
        const dx = x - parseFloat(cursor.style.left);
        const dy = y - parseFloat(cursor.style.top);
        const ms = Math.min(900, Math.max(280, Math.hypot(dx, dy) * 0.9));
        cursor.style.transitionDuration = `${reducedMotion ? 0 : ms / st.speed}ms`;
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
        await s.wait(ms + 90);
      },

      async click(target, ax = 0.5, ay = 0.5) {
        const node = need(target);
        if (!node) return;
        await s.move(node, ax, ay);
        cursor.classList.add("down");
        node.classList.add("hit");
        const ring = el('<div class="ripple"></div>');
        ring.style.left = cursor.style.left;
        ring.style.top = cursor.style.top;
        stage.appendChild(ring);
        setTimeout(() => ring.remove(), 600);
        await s.wait(170);
        cursor.classList.remove("down");
        node.classList.remove("hit");
        await s.wait(120);
      },

      /** Type into a mock field (any element); `mask` shows dots, as a password box does. */
      async type(target, text, { delay = 34, mask = false, clear = true } = {}) {
        const node = need(target);
        if (!node) return;
        node.classList.add("focus");
        if (clear) node.textContent = "";
        for (const ch of text) {
          node.textContent += mask ? "\u2022" : ch;
          await s.wait(delay);
        }
        await s.wait(200);
        node.classList.remove("focus");
      },

      /** Paste: the text appears at once, with a brief flash. */
      async paste(target, text) {
        const node = need(target);
        if (!node) return;
        node.textContent = text;
        node.classList.add("pasted");
        await s.wait(700);
        node.classList.remove("pasted");
      },

      set(target, html) {
        const node = need(target);
        if (node) node.innerHTML = html;
      },
      on(target, cls = "on") {
        need(target)?.classList.add(cls);
      },
      off(target, cls = "on") {
        need(target)?.classList.remove(cls);
      },
      show(target) {
        const node = need(target);
        if (node) node.hidden = false;
      },
      hide(target) {
        const node = need(target);
        if (node) node.hidden = true;
      },

      // Explanations on the screen ---------------------------------------------
      /**
       * A label pointing at something on screen. `pos` is where the label sits
       * relative to the target: right, left, top or bottom. `kind` is info or warn.
       */
      note(target, text, pos = "right", kind = "info") {
        const node = need(target);
        if (!node) return;
        const b = box(node);
        const ring = el('<div class="ring"></div>');
        Object.assign(ring.style, { left: `${b.l - 5}px`, top: `${b.t - 5}px`, width: `${b.w + 10}px`, height: `${b.h + 10}px` });
        ring.classList.add(kind);
        const tip = el(`<div class="tip ${kind}"><span>${text}</span></div>`);
        notes.append(ring, tip);
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let x = pos === "right" ? b.l + b.w + 18 : pos === "left" ? b.l - tw - 18 : b.l + b.w / 2 - tw / 2;
        let y = pos === "bottom" ? b.t + b.h + 18 : pos === "top" ? b.t - th - 18 : b.t + b.h / 2 - th / 2;
        x = Math.min(STAGE_W - tw - 10, Math.max(10, x));
        y = Math.min(STAGE_H - th - 58, Math.max(10, y));
        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
      },
      clearNotes() {
        notes.innerHTML = "";
      },

      // Dialogs ------------------------------------------------------------------
      overlay(html, dim = true) {
        layer.innerHTML = html;
        layer.className = "layer on" + (dim ? " dim" : "");
        return layer.firstElementChild;
      },
      closeOverlay() {
        layer.innerHTML = "";
        layer.className = "layer";
      },

      // Command Prompt -----------------------------------------------------------
      terminal(lines) {
        s.app("terminal");
        term.lines = lines.slice();
        renderTerm();
      },
      async cmd(text, delay = 42) {
        s.app("terminal");
        if (!term.lines.length) term.lines.push(esc(s.PROMPT));
        const at = term.lines.length - 1;
        for (const ch of text) {
          term.lines[at] += esc(ch);
          renderTerm();
          await s.wait(delay);
        }
        await s.wait(350);
      },
      async out(lines, delay = 110) {
        for (const line of lines) {
          term.lines.push(line);
          renderTerm();
          await s.wait(delay);
        }
      },
      prompt() {
        term.lines.push("", esc(s.PROMPT));
        renderTerm();
      },

      // Notepad ------------------------------------------------------------------
      notepad({ title, html, pos }) {
        s.app("notepad");
        if (title) $("#nTab").textContent = title;
        if (html !== undefined) $("#nBody").innerHTML = html;
        if (pos) $("#nPos").textContent = pos;
      },

      // File Explorer ------------------------------------------------------------
      explorer({ tab, path, items, status, extract = false }) {
        s.app("explorer");
        $("#xTab").textContent = tab;
        $("#xAddr").innerHTML = path.map((p) => `<span>${esc(p)}</span>`).join("<i>&#x203A;</i>");
        $("#xItems").innerHTML = items
          .map(
            (it, i) =>
              `<div class="x-row${it.sel ? " sel" : ""}" id="xi${i}"><span><i class="ic-${it.icon}"></i>${esc(it.name)}</span><span>${it.date || "21/11/2026 10:02 AM"}</span><span>${it.type}</span><span>${it.size || ""}</span></div>`,
          )
          .join("");
        $("#xStatus").textContent = status || `${items.length} items`;
        $("#xExtract").hidden = !extract;
      },
    };
    return s;
  }

  function renderTerm() {
    const body = $("#tBody");
    body.innerHTML = term.lines.join("\n") + '<span class="caret"></span>';
    body.scrollTop = body.scrollHeight;
  }

  // --- the player ----------------------------------------------------------------

  function resetScreen() {
    notes.innerHTML = "";
    layer.innerHTML = "";
    layer.className = "layer";
    $("#bFly").hidden = true;
    $("#bAddr").classList.remove("focus");
    $("#bLoad").classList.remove("run");
  }

  async function play(index) {
    if (st.token) st.token.cancelled = true;
    const token = (st.token = { cancelled: false });
    st.i = Math.max(0, Math.min(WT.steps.length - 1, index));
    st.finished = false;
    const step = WT.steps[st.i];
    renderPanel();
    resetScreen();
    try {
      history.replaceState(null, "", `#step-${st.i + 1}`);
    } catch {
      /* file:// in some browsers */
    }

    const s = makeApi(token);
    s.PROMPT = WT.PROMPT || "C:\\>";
    try {
      await step.run(s);
      const reading = (step.what + (step.why || "") + (step.notes || []).map((n) => n.text).join("")).replace(/<[^>]+>/g, "").length;
      st.finished = true;
      renderControls();
      await s.wait(Math.min(15000, 2600 + reading * 42));
      if (st.auto && st.i < WT.steps.length - 1) play(st.i + 1);
    } catch (error) {
      if (error !== CANCEL) console.error(error);
    }
  }

  function renderPanel() {
    const step = WT.steps[st.i];
    $("#pChapter").textContent = step.chapter;
    $("#pCount").textContent = `Step ${st.i + 1} of ${WT.steps.length}`;
    $("#pTitle").textContent = step.title;
    $("#pWhat").innerHTML = step.what;
    $("#pWhyWrap").hidden = !step.why;
    $("#pWhy").innerHTML = step.why || "";
    $("#pNotes").innerHTML = (step.notes || [])
      .map((n) => `<div class="pnote is-${n.kind}"><b>${n.kind === "warn" ? "Security" : n.kind === "tip" ? "Tip" : "Note"}</b><span>${n.text}</span></div>`)
      .join("");
    $("#panel").scrollTop = 0;

    document.querySelectorAll("#timeline button").forEach((b) => {
      const i = Number(b.dataset.i);
      b.classList.toggle("now", i === st.i);
      b.classList.toggle("seen", i < st.i);
      if (i === st.i) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
    });
    document.querySelectorAll("#timeline .ch").forEach((c) => c.classList.toggle("now", c.dataset.ch === step.chapter));
    renderControls();
  }

  function renderControls() {
    $("#btnPlay").textContent = st.paused ? "\u25B6 Play" : "\u275A\u275A Pause";
    $("#btnPlay").setAttribute("aria-label", st.paused ? "Play" : "Pause");
    $("#btnPrev").disabled = st.i === 0;
    $("#btnNext").disabled = st.i === WT.steps.length - 1;
    $("#startCard").hidden = st.started;
    stage.classList.toggle("paused", st.paused && st.started);
  }

  function buildTimeline() {
    const nav = $("#timeline");
    let chapter = null;
    let group = null;
    WT.steps.forEach((step, i) => {
      if (step.chapter !== chapter) {
        chapter = step.chapter;
        group = el(`<div class="ch" data-ch="${esc(chapter)}"><span>${esc(chapter)}</span><div></div></div>`);
        nav.appendChild(group);
      }
      const b = el(`<button type="button" data-i="${i}" title="${esc(step.title)}" aria-label="Step ${i + 1}: ${esc(step.title)}"></button>`);
      b.addEventListener("click", () => jump(i));
      group.lastElementChild.appendChild(b);
    });
  }

  function jump(i) {
    st.started = true;
    st.paused = false;
    play(i);
  }

  function togglePause() {
    if (!st.started) return jump(st.i);
    st.paused = !st.paused;
    if (!st.paused && st.finished && st.auto && st.i < WT.steps.length - 1) return play(st.i + 1);
    renderControls();
  }

  WT.start = function () {
    buildStage();
    buildTimeline();
    fit();
    window.addEventListener("resize", fit);

    $("#btnPlay").addEventListener("click", togglePause);
    $("#btnStart").addEventListener("click", () => jump(st.i));
    $("#btnPrev").addEventListener("click", () => jump(st.i - 1));
    $("#btnNext").addEventListener("click", () => jump(st.i + 1));
    $("#btnReplay").addEventListener("click", () => jump(st.i));
    $("#optAuto").addEventListener("change", (e) => (st.auto = e.target.checked));
    $("#optSpeed").addEventListener("change", (e) => (st.speed = Number(e.target.value)));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("select, input, a")) return;
      if (e.key === "ArrowRight" && st.i < WT.steps.length - 1) jump(st.i + 1);
      else if (e.key === "ArrowLeft" && st.i > 0) jump(st.i - 1);
      else if (e.key === " ") {
        e.preventDefault();
        togglePause();
      }
    });

    // Links: #step-12 opens at a step. ?play starts straight away, ?play=step plays
    // just that step, and ?speed=2 sets the speed.
    const query = new URLSearchParams(location.search);
    const wanted = Number((/^#step-(\d+)$/.exec(location.hash) || [])[1]);
    st.i = wanted >= 1 && wanted <= WT.steps.length ? wanted - 1 : 0;
    if (Number(query.get("speed")) > 0) st.speed = Number(query.get("speed"));
    if (query.has("play")) {
      st.started = true;
      st.paused = false;
      if (query.get("play") === "step") st.auto = $("#optAuto").checked = false;
    }
    // Inside the app, link to its documentation. Anywhere else (GitHub Pages, or
    // opened from disk), link to the code.
    const inApp = location.protocol.startsWith("http") && location.pathname.startsWith("/walkthrough/");
    const link = $("#topLink");
    link.href = inApp ? "/docs" : `https://${WT.data.GH_URL}`;
    link.textContent = inApp ? "Open the app's documentation" : "Get the code on GitHub";
    link.hidden = false;
    window.addEventListener("hashchange", () => {
      const step = Number((/^#step-(\d+)$/.exec(location.hash) || [])[1]);
      if (step >= 1 && step <= WT.steps.length && step - 1 !== st.i) jump(step - 1);
    });
    // Draw the chosen step. Until Start is pressed it is held on its first frame.
    play(st.i);
  };
})();
