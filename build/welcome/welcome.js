// FrostWolf welcome guide: one step at a time (Back / Next, dots, arrow keys, #step in the URL).
"use strict";
(function () {
  const steps = Array.from(document.querySelectorAll(".step"));
  const dots = document.getElementById("dots");
  const back = document.getElementById("back");
  const next = document.getElementById("next");
  let current = 0;

  steps.forEach((s, i) => {
    const d = document.createElement("button");
    d.type = "button";
    d.className = "dot";
    d.title = s.dataset.title || "";
    d.setAttribute("aria-label", `Step ${i + 1}: ${s.dataset.title || ""}`);
    d.addEventListener("click", () => show(i));
    dots.append(d);
  });

  function show(i, fromHash) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    steps.forEach((s, j) => s.classList.toggle("active", j === current));
    Array.from(dots.children).forEach((d, j) => {
      d.classList.toggle("active", j === current);
      d.classList.toggle("past", j < current);
    });
    back.style.visibility = current === 0 ? "hidden" : "visible";
    next.style.visibility = current === steps.length - 1 ? "hidden" : "visible";
    next.textContent = current === 0 ? "Start →" : "Next →";
    steps[current].scrollTop = 0;
    if (!fromHash) {
      history.replaceState(null, "", "#" + steps[current].id);
    }
  }

  back.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  document.querySelectorAll('[data-go="next"]').forEach((b) => b.addEventListener("click", () => show(current + 1)));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") show(current + 1);
    if (e.key === "ArrowLeft") show(current - 1);
  });

  // Search engines: click a card to make it the default. FrostWolf (frostwolf.cfg) watches this local
  // page for a "#setengine=<name>" address and changes the default; web pages can't open this page.
  const engines = Array.from(document.querySelectorAll(".card.engine"));
  const status = document.getElementById("engine-status");
  function mark(name) {
    engines.forEach((c) => {
      const on = c.dataset.engine === name;
      c.classList.toggle("selected", on);
      c.setAttribute("aria-pressed", String(on));
    });
  }
  function choose(card) {
    const name = card.dataset.engine;
    mark(name);
    location.hash = "setengine=" + encodeURIComponent(name);
    history.replaceState(null, "", "#search");
    if (status) {
      status.textContent = `✓ ${name} is now your default search engine.`;
      status.classList.add("ok");
    }
  }
  engines.forEach((c) => {
    c.addEventListener("click", () => choose(c));
    c.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(c);
      }
    });
  });
  const currentEngine = new URLSearchParams(location.search).get("engine");
  if (currentEngine && engines.some((c) => c.dataset.engine === currentEngine)) {
    mark(currentEngine);
  }

  const start = steps.findIndex((s) => "#" + s.id === location.hash);
  show(start >= 0 ? start : 0, true);
})();
