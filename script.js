// Utilities
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const isTouch =
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0 ||
  window.matchMedia("(pointer: coarse)").matches;

// Year in footer
if ($("#year")) $("#year").textContent = new Date().getFullYear();

// Theme and accent persistence
const storedTheme = localStorage.getItem("theme");
if (storedTheme) document.documentElement.setAttribute("data-theme", storedTheme);
const storedAccent = localStorage.getItem("accentPreset");
if (storedAccent) applyAccent(storedAccent);

// Progress bar
const progress = $("#progress");
if (progress) {
  const setProgress = () => {
    const h = document.documentElement;
    const scrolled =
      ((h.scrollTop || document.body.scrollTop) /
        ((h.scrollHeight || document.body.scrollHeight) - h.clientHeight)) *
      100;
    progress.style.width = scrolled + "%";
  };
  document.addEventListener("scroll", setProgress, { passive: true });
  setProgress();
}

// Intersection reveals
const revealEls = $$("[data-reveal], .stagger");
if (revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          io.unobserve(e.target);
          $$(".num", e.target).forEach(countUp);
        }
      });
    },
    { threshold: 0.2 }
  );
  revealEls.forEach((el) => io.observe(el));
}

// Count up animation
function countUp(el) {
  const target = +el.getAttribute("data-count");
  if (!target || Number.isNaN(target)) return;
  const duration = 1000;
  const start = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* Hero title animation (stable + fallback) */
(function animateTitle() {
  const title = $("#heroTitle");
  if (!title) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const walker = document.createTreeWalker(
    title,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return node.nodeValue.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
    false
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const words = node.nodeValue.split(/(\s+)/);
    const frag = document.createDocumentFragment();
    words.forEach((w) => {
      if (/^\s+$/.test(w)) {
        frag.appendChild(document.createTextNode(w));
      } else {
        const outer = document.createElement("span");
        outer.className = "word";
        outer.style.display = "inline-block";
        outer.style.overflow = "hidden";

        const inner = document.createElement("span");
        inner.textContent = w;
        inner.style.display = "inline-block";
        inner.style.transform = "translateY(110%)";

        outer.appendChild(inner);
        frag.appendChild(outer);
      }
    });
    node.parentNode.replaceChild(frag, node);
  });

  const spans = $$(".word > span", title);

  const play = () => {
    if (reduce) {
      spans.forEach((s) => (s.style.transform = "translateY(0)"));
      return;
    }
    spans.forEach((s, i) => {
      setTimeout(() => {
        s.style.transition = "transform 300ms cubic-bezier(0.22,1,0.36,1)";
        s.style.transform = "translateY(0)";
      }, 15 * i);
    });
    setTimeout(() => {
      spans.forEach((s) => (s.style.transform = "translateY(0)"));
    }, 800);
  };

  if (document.visibilityState === "visible") play();
  else document.addEventListener("visibilitychange", play, { once: true });
})();

// Magnetic buttons
$$(".magnetic").forEach((btn) => {
  const strength = 14;
  const handle = (e) => {
    const rect = btn.getBoundingClientRect();
    const mx = e.clientX - (rect.left + rect.width / 2);
    const my = e.clientY - (rect.top + rect.height / 2);
    btn.style.transform = `translate(${(mx / rect.width) * strength}px,${
      (my / rect.height) * strength
    }px)`;
    const shine = $(".shine", btn);
    if (shine) {
      shine.style.setProperty("--mx", `${mx * 0.1}px`);
      shine.style.setProperty("--my", `${my * 0.1}px`);
    }
  };
  const leave = () => (btn.style.transform = "translate(0,0)");
  btn.addEventListener("mousemove", handle);
  btn.addEventListener("mouseleave", leave);
});

// Tilt effect (idempotent)
function initTilts(scope = document) {
  $$(".tilt", scope).forEach((card) => {
    if (card.dataset.tiltInit) return;
    card.dataset.tiltInit = "1";
    const maxTilt = 8;
    const onMove = (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateX(${
        -py * maxTilt
      }deg) rotateY(${px * maxTilt}deg)`;
      const shine = $(".shine", card);
      if (shine) {
        shine.style.setProperty("--px", `${(px + 0.5) * 100}%`);
        shine.style.setProperty("--py", `${(py + 0.5) * 100}%`);
      }
    };
    const onLeave = () => {
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    };
    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
  });
}
initTilts(document);

// Events carousel: infinite loop + drag (guarded for pages without it)
(function setupCarousel() {
  const track = $("#eventTrack");
  if (!track) return;

  const prev = $("#prevEvt");
  const next = $("#nextEvt");
  let baseWidth = 0;

  (function prepare() {
    const baseItems = $$(".evt", track);
    const clonesA = baseItems.map((n) => n.cloneNode(true));
    const clonesB = baseItems.map((n) => n.cloneNode(true));
    clonesA.forEach((n) => track.appendChild(n));
    clonesB.forEach((n) => track.appendChild(n));
    initTilts(track);
    requestAnimationFrame(() => {
      baseWidth = track.scrollWidth / 3;
      track.scrollLeft = baseWidth;
    });
  })();

  function normalizeScroll() {
    if (!baseWidth) return;
    if (track.scrollLeft < baseWidth * 0.5) {
      track.scrollLeft += baseWidth;
    } else if (track.scrollLeft > baseWidth * 1.5) {
      track.scrollLeft -= baseWidth;
    }
  }

  (function dragToScroll() {
    let active = false;
    let startX = 0;
    let startScroll = 0;

    const onPointerDown = (e) => {
      e.preventDefault();
      active = true;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add("dragging");
      track.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!active) return;
      const dx = e.clientX - startX;
      track.scrollLeft = startScroll - dx;
      normalizeScroll();
    };
    const onPointerUp = (e) => {
      active = false;
      track.classList.remove("dragging");
      track.releasePointerCapture?.(e.pointerId);
    };
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  })();

  function scrollByAmount(dir = 1) {
    const cardW =
      track.querySelector(".card")?.getBoundingClientRect().width || 280;
    track.scrollLeft += dir * (cardW + 16);
    normalizeScroll();
  }
  prev && prev.addEventListener("click", () => scrollByAmount(-1));
  next && next.addEventListener("click", () => scrollByAmount(1));
  track.addEventListener("scroll", normalizeScroll, { passive: true });
})();

// Gallery lightbox (supports both grid and masonry)
(function galleryLightbox() {
  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  if (!lightbox || !lightboxImg) return;

  const tiles = [
    ...$$(".gallery-grid .tile"),
    ...$$(".masonry .tile"),
  ];
  tiles.forEach((tile) => {
    tile.addEventListener("click", () => {
      const img = $("img", tile);
      if (!img) return;
      lightboxImg.src = img.src;
      lightbox.classList.add("open");
    });
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox || e.target === lightboxImg) {
      lightbox.classList.remove("open");
    }
  });
})();

// Custom cursor
const cursor = $("#cursor");
if (cursor && !isTouch) {
  document.addEventListener("mousemove", (e) => {
    cursor.style.opacity = "1";
    cursor.style.transform = `translate(${e.clientX - 9}px,${
      e.clientY - 9
    }px)`;
  });
  document.addEventListener("mouseleave", () => {
    cursor.style.opacity = "0";
  });
} else {
  cursor && cursor.remove();
}

// Space background (particles)
(function spaceBG() {
  const c = $("#space");
  if (!c) return;
  const x = c.getContext("2d");
  let w, h, dpr, stars;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = c.clientWidth;
    h = c.clientHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    makeStars();
  }
  function makeStars() {
    const count = Math.round((w * h) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      s: Math.random() * 0.5 + 0.2,
    }));
  }
  function draw(t) {
    x.clearRect(0, 0, w, h);
    for (const st of stars) {
      st.x += st.s * 0.08;
      if (st.x > w) st.x = 0;
      const glow = Math.sin((t * 0.001 + st.x) * 0.8) * 0.4 + 0.6;
      x.fillStyle = `rgba(${78 * glow},${140 * glow},${255 * glow},${0.75})`;
      x.beginPath();
      x.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      x.fill();
    }
    requestAnimationFrame(draw);
  }
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();

// Sticky nav hide/show - DISABLED
// (function smartNav() {
//   const nav = $("#nav");
//   if (!nav) return;
//   let last = window.scrollY;
//   let ticking = false;
//   function onScroll() {
//     const cur = window.scrollY;
//     if (!ticking) {
//       window.requestAnimationFrame(() => {
//         const down = cur > last && cur > 120;
//         nav.style.transform = down ? "translateY(-100%)" : "translateY(0)";
//         last = cur;
//         ticking = false;
//       });
//       ticking = true;
//     }
//   }
//   window.addEventListener("scroll", onScroll, { passive: true });
// })();

/* Live Now + Upcoming countdown (guarded for pages without it) */
(function liveAndUpcoming() {
  const liveNowCard = $("#liveNow");
  const upCard = $("#upCard");
  if (!liveNowCard && !upCard) return;

  // Live Now
  if (liveNowCard) {
    const liveNowBadge = $("#liveNowBadge");
    const liveNowName = $("#liveNowName");
    const liveNowWhen = $("#liveNowWhen");
    const LIVE_NOW = null; // set to object to enable live

    if (LIVE_NOW) {
      liveNowCard.dataset.status = "live";
      if (liveNowBadge) liveNowBadge.textContent = "Live";
      if (liveNowName) liveNowName.textContent = LIVE_NOW.name || "Live Session";
      if (liveNowWhen) liveNowWhen.textContent = "Streaming now";
    } else {
      liveNowCard.dataset.status = "offline";
      if (liveNowBadge) liveNowBadge.textContent = "Live";
      if (liveNowName) liveNowName.textContent = "No live events now";
      if (liveNowWhen) liveNowWhen.textContent = "—";
    }
  }

  // Upcoming countdown
  if (upCard) {
    const upBadge = $("#upBadge");
    const upName = $("#upName");
    const upWhen = $("#upWhen");
    const upCountdown = $("#upCountdown");

    const now = new Date();
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2,
      16,
      0,
      0
    );

    if (upBadge) upBadge.textContent = "Upcoming";
    if (upName) upName.textContent = "GFX Workshop";
    if (upWhen) upWhen.textContent = "In 2 days • 4:00 PM";
    upCard.dataset.status = "upcoming";

    function fmt(n) {
      return String(n).padStart(2, "0");
    }
    function tick() {
      const diff = target - new Date();
      if (diff <= 0) {
        upCard.dataset.status = "live";
        if (upBadge) upBadge.textContent = "Live";
        if (upWhen) upWhen.textContent = "Happening now";
        if (upCountdown) upCountdown.textContent = "00:00:00";
        return;
      }
      const s = Math.floor(diff / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      if (upCountdown) {
        upCountdown.textContent =
          (d > 0 ? d + "d " : "") + `${fmt(h)}:${fmt(m)}:${fmt(sec)}`;
      }
      requestAnimationFrame(tick);
    }
    tick();
  }
})();

/* Bottom color switcher */
(function colorSwitcher() {
  const switcher = $("#switcher");
  const themeBtn = $("#switchTheme");
  if (!switcher || !themeBtn) return;

  function toggleTheme() {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", cur);
    localStorage.setItem("theme", cur);
  }

  themeBtn.addEventListener("click", toggleTheme);

  switcher.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    const preset = btn.getAttribute("data-preset");
    applyAccent(preset);
    localStorage.setItem("accentPreset", preset);
  });

  if (!localStorage.getItem("theme")) {
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)")
      .matches;
    document.documentElement.setAttribute(
      "data-theme",
      prefersLight ? "light" : "dark"
    );
  }
})();

/* FAQ toggles: robust and card-wide click */
(function fixFaqToggle() {
  const activate = () => {
    const items = Array.from(document.querySelectorAll("#faqs .faq-item"));
    if (!items.length) return;

    items.forEach((it) => {
      const btn = it.querySelector(".faq-q");
      if (btn && !btn.hasAttribute("type")) btn.setAttribute("type", "button");

      const toggle = () => {
        const open = it.classList.toggle("open");
        if (btn) btn.setAttribute("aria-expanded", String(open));
      };

      btn && btn.addEventListener("click", toggle);

      // Also allow clicking the card except inside the answer content
      it.addEventListener("click", (e) => {
        if (e.target.closest(".faq-a")) return;
        if (e.target.closest("a, button:not(.faq-q)")) return;
        if (!e.target.closest(".faq-q")) toggle();
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", activate);
  } else {
    activate();
  }
})();

function applyAccent(preset) {
  const root = document.documentElement;
  const PALETTES = {
    ocean: ["78, 141, 255", "255, 101, 132", "90, 255, 180"],
    violet: ["168, 85, 247", "99, 102, 241", "244, 114, 182"],
    sunset: ["251, 146, 60", "239, 68, 68", "250, 204, 21"],
    emerald: ["16, 185, 129", "59, 130, 246", "34, 197, 94"],
    amber: ["245, 158, 11", "99, 102, 241", "244, 63, 94"],
  };
  const p = PALETTES[preset] || PALETTES.ocean;
  root.style.setProperty("--accent-2", p[0]);
  root.style.setProperty("--accent", p[1]);
  root.style.setProperty("--accent-3", p[2]);
}   
/* Fast logo preloader with progress */
(function fastLogoPreloader() {
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loaderFill");
  const pctEl = document.getElementById("loaderPct");
  if (!loader || !fill || !pctEl) return;

  document.documentElement.classList.add("is-loading");

  const set = (p) => {
    const val = Math.max(0, Math.min(100, Math.round(p)));
    fill.style.width = val + "%";
    pctEl.textContent = val + "%";
  };

  // Track <img> elements (background images aren't included, but we finish fast on DOM ready)
  const imgs = Array.from(document.images || []);
  const total = Math.max(1, imgs.length);
  let loaded = 0;

  const bump = () => {
    loaded += 1;
    // Cap at 90% until we decide to finish, keeps a sense of motion
    const progress = Math.min(90, (loaded / total) * 90);
    set(progress);
  };

  imgs.forEach((img) => {
    if (img.complete) return bump();
    img.addEventListener("load", bump, { once: true });
    img.addEventListener("error", bump, { once: true });
  });

  // Finish quickly when DOM is ready (fast)
  const minShow = 150; // lower = faster; try 0–150ms
  const start = performance.now();

  const finish = () => {
    set(100);
    loader.classList.add("hide");
    document.documentElement.classList.remove("is-loading");
    setTimeout(() => loader.remove(), 220); // match CSS fade duration
  };

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      const elapsed = performance.now() - start;
      const delay = Math.max(0, minShow - elapsed);
      setTimeout(finish, delay);
    },
    { once: true }
  );

  // Safety cap if DOMContentLoaded is delayed unusually
  setTimeout(finish, 3000);
})();