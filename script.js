const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMAIL = "maxsloam.work@gmail.com";

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isTyping(target) {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/* ---------- Nav ---------- */

const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

function setMenuOpen(open) {
  navLinks.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
}

navToggle.addEventListener("click", () => {
  setMenuOpen(!navLinks.classList.contains("open"));
});

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  setMenuOpen(false);
  target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
}

// Section links scroll smoothly; project links (#/slug) are handled by the viewer below
document.addEventListener("click", event => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute("href");
  if (href === "#" || href.startsWith("#/")) return;
  if (!document.getElementById(href.slice(1))) return;
  event.preventDefault();
  scrollToSection(href.slice(1));
});

/* ---------- Copy email ---------- */

function copyEmail(button) {
  navigator.clipboard.writeText(EMAIL).then(() => {
    if (!button) return;
    const originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error("Failed to copy email:", err);
    window.location.href = `mailto:${EMAIL}`;
  });
}

document.querySelectorAll("[data-copy-email]").forEach(button => {
  button.addEventListener("click", () => copyEmail(button));
});

/* ---------- Project cards ---------- */

function mediaHtml(project, className) {
  const first = project.media && project.media[0];
  if (!first) {
    return `<div class="${className} project-cover" aria-hidden="true"><span>${escapeHtml(project.title)}</span></div>`;
  }
  const contain = first.fit === "contain";
  const style = first.bg ? ` style="background:${first.bg}"` : "";
  return `<div class="${className}"${style}>
      <img src="${first.src}" alt="${escapeHtml(first.alt)}" class="project-image${contain ? " fit-contain" : ""}" loading="lazy" />
    </div>`;
}

function cardHtml(project) {
  const metrics = project.featured && project.metrics
    ? `<ul class="card-metrics">${project.metrics.slice(0, 3).map(m =>
        `<li><strong>${escapeHtml(m.value)}</strong><span>${escapeHtml(m.label)}</span></li>`).join("")}</ul>`
    : "";
  const github = project.featured && project.repo
    ? `<a class="card-github" href="https://github.com/${project.repo}" target="_blank" rel="noreferrer">GitHub ↗</a>`
    : "";

  return `<article class="card project-card${project.featured ? " featured" : ""} reveal" data-slug="${project.slug}">
      ${mediaHtml(project, "project-media")}
      <div class="project-body">
        <p class="project-label">${escapeHtml(project.label)}</p>
        <h3><a class="project-open" href="#/${project.slug}">${escapeHtml(project.title)}</a></h3>
        <p>${escapeHtml(project.summary)}</p>
        ${metrics}
        <ul class="tags">${project.tags.slice(0, project.featured ? 5 : 3).map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        <div class="card-links">
          <span class="card-open-hint" aria-hidden="true">Read more →</span>
          ${github}
        </div>
      </div>
    </article>`;
}

document.querySelector("[data-featured]").innerHTML = PROJECTS.filter(p => p.featured).map(cardHtml).join("");
document.querySelector("[data-grid]").innerHTML = PROJECTS.filter(p => !p.featured).map(cardHtml).join("");

function cardFor(slug) {
  return document.querySelector(`.project-card[data-slug="${slug}"]`);
}

/* ---------- Scroll reveal ---------- */

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  revealItems.forEach(item => observer.observe(item));
} else {
  revealItems.forEach(item => item.classList.add("visible"));
}

/* ---------- Live GitHub repo panel ---------- */

const LANGUAGE_COLOURS = {
  "C++": "#f34b7d",
  C: "#8a8a8a",
  Python: "#3572A5",
  "Jupyter Notebook": "#DA5B0B",
  CMake: "#DA3434",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#663399",
  Java: "#b07219",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Makefile: "#427819",
};

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(iso) {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return relativeTime.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

// GitHub allows 60 unauthenticated requests an hour, so results are cached for the session
async function loadRepo(repo) {
  const key = `gh:${repo}`;
  try {
    const cached = JSON.parse(sessionStorage.getItem(key));
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) return cached.data;
  } catch (err) {
    // storage unavailable, fetch instead
  }

  const api = `https://api.github.com/repos/${repo}`;
  const info = await fetchJson(api);
  const [languages, runs] = await Promise.allSettled([
    fetchJson(`${api}/languages`),
    fetchJson(`${api}/actions/runs?per_page=1&branch=${encodeURIComponent(info.default_branch)}`),
  ]);

  const run = runs.status === "fulfilled" && runs.value.workflow_runs && runs.value.workflow_runs[0];
  const data = {
    url: info.html_url,
    description: info.description,
    pushedAt: info.pushed_at,
    stars: info.stargazers_count,
    languages: languages.status === "fulfilled" ? languages.value : {},
    ci: run ? { conclusion: run.conclusion, status: run.status, url: run.html_url } : null,
  };

  try {
    sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch (err) {
    // ignore
  }
  return data;
}

function repoStatsHtml(data) {
  const total = Object.values(data.languages).reduce((sum, bytes) => sum + bytes, 0);
  const languages = Object.entries(data.languages)
    .map(([name, bytes]) => ({ name, share: total ? (bytes / total) * 100 : 0 }))
    .filter(l => l.share >= 0.5);
  const colour = name => LANGUAGE_COLOURS[name] || "#8a8a85";

  const bar = languages.length
    ? `<div class="lang-bar" aria-hidden="true">${languages.map(l =>
        `<span style="width:${l.share}%;background:${colour(l.name)}"></span>`).join("")}</div>
      <ul class="lang-list">${languages.slice(0, 4).map(l =>
        `<li><i style="background:${colour(l.name)}"></i>${escapeHtml(l.name)} ${l.share.toFixed(1)}%</li>`).join("")}</ul>`
    : "";

  let ci = "";
  if (data.ci) {
    const running = data.ci.status !== "completed";
    const passed = data.ci.conclusion === "success";
    const text = running ? "running" : passed ? "passing" : data.ci.conclusion || "unknown";
    const cls = running ? "" : passed ? " ok" : " fail";
    ci = `<li>CI <a href="${data.ci.url}" target="_blank" rel="noreferrer"><strong class="status${cls}">${escapeHtml(text)}</strong></a></li>`;
  }

  // Low star counts undersell a portfolio, so only show them once they mean something
  const stars = data.stars >= 5 ? `<li>Stars <strong>${data.stars}</strong></li>` : "";

  return `${data.description ? `<p class="repo-desc">${escapeHtml(data.description)}</p>` : ""}
    ${bar}
    <ul class="repo-stats">
      <li>Last push <strong>${timeAgo(data.pushedAt)}</strong></li>
      ${ci}
      ${stars}
    </ul>`;
}

function fillRepoPanel(panel, repo) {
  loadRepo(repo).then(data => {
    if (!panel.isConnected) return;
    panel.querySelector("[data-repo-stats]").innerHTML = repoStatsHtml(data);
  }).catch(err => {
    console.warn("Couldn't load GitHub stats:", err);
    if (!panel.isConnected) return;
    panel.querySelector("[data-repo-stats]").innerHTML =
      `<p class="repo-desc">Repository details aren't available right now.</p>`;
  });
}

/* ---------- Project viewer ---------- */

const viewer = document.querySelector(".viewer");
const viewerScroll = viewer.querySelector(".viewer-scroll");
const viewerContent = viewer.querySelector(".viewer-content");
const viewerCount = viewer.querySelector(".viewer-count");
let currentIndex = -1;
let pushedEntry = false;

function slugFromHash() {
  const match = location.hash.match(/^#\/([\w-]+)$/);
  return match ? match[1] : null;
}

function indexOfSlug(slug) {
  return PROJECTS.findIndex(p => p.slug === slug);
}

function galleryHtml(project) {
  if (!project.media || !project.media.length) {
    return `<div class="detail-cover project-cover" aria-hidden="true"><span>${escapeHtml(project.title)}</span></div>`;
  }
  const first = project.media[0];
  const thumbs = project.media.length > 1
    ? `<div class="gallery-thumbs">${project.media.map((m, i) =>
        `<button type="button" class="gallery-thumb" data-thumb="${i}" aria-label="Show image ${i + 1}"${i === 0 ? ' aria-current="true"' : ""}
          ${m.bg ? `style="background:${m.bg}"` : ""}><img src="${m.src}" alt="" loading="lazy" /></button>`).join("")}</div>`
    : "";
  return `<figure class="gallery-main">
      <div class="gallery-frame${first.bg ? " has-bg" : ""}"${first.bg ? ` style="background:${first.bg}"` : ""}>
        <img src="${first.src}" alt="${escapeHtml(first.alt)}" />
      </div>
      ${first.caption ? `<figcaption>${escapeHtml(first.caption)}</figcaption>` : "<figcaption hidden></figcaption>"}
    </figure>
    ${thumbs}`;
}

function architectureHtml(stages) {
  const kinds = new Set(stages.flat().map(n => n.kind).filter(Boolean));
  const legend = kinds.size
    ? `<div class="arch-legend">${kinds.has("cpp") ? '<span class="kind-cpp">C++</span>' : ""}${kinds.has("py") ? '<span class="kind-py">Python</span>' : ""}</div>`
    : "";
  const body = stages.map(stage =>
    `<div class="arch-stage">${stage.map(node =>
      `<div class="arch-node${node.kind ? ` kind-${node.kind}` : ""}">${escapeHtml(node.name)}${node.note ? `<small>${escapeHtml(node.note)}</small>` : ""}</div>`).join("")}</div>`)
    .join('<div class="arch-arrow" aria-hidden="true"></div>');
  return `<section class="detail-section">
      <h3>Architecture</h3>
      <div class="arch" role="img" aria-label="${escapeHtml(stages.map(s => s.map(n => n.name).join(" and ")).join(", then "))}">${body}</div>
      ${legend}
    </section>`;
}

function detailHtml(project, index) {
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];

  const metrics = project.metrics
    ? `<ul class="metrics">${project.metrics.map(m =>
        `<li><span class="metric-value">${escapeHtml(m.value)}</span><span class="metric-label">${escapeHtml(m.label)}</span></li>`).join("")}</ul>`
    : "";

  const sections = project.sections.map(s =>
    `<section class="detail-section"><h3>${escapeHtml(s.heading)}</h3>${s.body}</section>`).join("");

  const extraLinks = (project.links || []).map(l =>
    `<a class="btn btn-small btn-secondary" href="${l.href}" target="_blank" rel="noreferrer">${escapeHtml(l.text)} ↗</a>`).join("");

  const repoPanel = project.repo
    ? `<div class="panel" data-repo-panel>
        <p class="panel-title">Repository</p>
        <a class="repo-name" href="https://github.com/${project.repo}" target="_blank" rel="noreferrer">${escapeHtml(project.repo)}</a>
        <div data-repo-stats><div class="skeleton"></div><div class="skeleton" style="width:70%"></div><div class="skeleton" style="width:45%"></div></div>
        <div class="panel-links">
          <a class="btn btn-small" href="https://github.com/${project.repo}" target="_blank" rel="noreferrer">View on GitHub ↗</a>
          ${extraLinks}
        </div>
      </div>`
    : `<div class="panel">
        <p class="panel-title">Repository</p>
        <p class="repo-desc">The code for this one isn't public.</p>
        ${extraLinks ? `<div class="panel-links">${extraLinks}</div>` : ""}
      </div>`;

  return `<header class="detail-head">
      <p class="project-label">${escapeHtml(project.label)}</p>
      <h2 id="viewer-title" tabindex="-1">${escapeHtml(project.title)}</h2>
      <p class="lead">${escapeHtml(project.summary)}</p>
    </header>
    <div class="detail-layout">
      <div class="detail-main">
        <div>${galleryHtml(project)}</div>
        ${metrics}
        ${sections}
      </div>
      <aside class="detail-side">
        ${repoPanel}
        <div class="panel">
          <p class="panel-title">Stack</p>
          <ul class="tags">${project.tags.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
        </div>
      </aside>
    </div>
    ${project.architecture ? `<div class="detail-wide">${architectureHtml(project.architecture)}</div>` : ""}
    <nav class="detail-nav" aria-label="More projects">
      <button type="button" data-viewer-prev><small>← Previous</small>${escapeHtml(prev.title)}</button>
      <button type="button" data-viewer-next><small>Next →</small>${escapeHtml(next.title)}</button>
    </nav>`;
}

function renderProject(index, direction) {
  const project = PROJECTS[index];
  currentIndex = index;
  viewerContent.innerHTML = detailHtml(project, index);
  viewerCount.innerHTML = `${index + 1} of ${PROJECTS.length}<span class="count-title"> · ${escapeHtml(project.title)}</span>`;
  viewerScroll.scrollTop = 0;
  document.title = `${project.title} | Max Sloam`;

  viewerContent.classList.remove("slide-next", "slide-prev");
  if (direction) {
    void viewerContent.offsetWidth; // restart the animation
    viewerContent.classList.add(direction > 0 ? "slide-next" : "slide-prev");
  }

  const panel = viewerContent.querySelector("[data-repo-panel]");
  if (panel) fillRepoPanel(panel, project.repo);
}

function viewerMediaEl() {
  return viewerContent.querySelector(".gallery-frame, .detail-cover");
}

// Morphs the card image into the project page image (and back) where the browser supports it
function transition(update, fromEl, toEl) {
  if (!document.startViewTransition || reducedMotion || !fromEl) {
    update();
    return false;
  }
  fromEl.style.viewTransitionName = "project-media";
  const vt = document.startViewTransition(() => {
    fromEl.style.viewTransitionName = "";
    update();
    const target = toEl();
    if (target) target.style.viewTransitionName = "project-media";
  });
  vt.finished.finally(() => {
    const target = toEl();
    if (target) target.style.viewTransitionName = "";
  });
  return true;
}

function openProject(index, { push = true } = {}) {
  if (index < 0) return;
  const project = PROJECTS[index];
  const url = `${location.pathname}${location.search}#/${project.slug}`;

  if (viewer.open) {
    if (index !== currentIndex) renderProject(index, index > currentIndex ? 1 : -1);
    history.replaceState({ viewer: true }, "", url);
    return;
  }

  if (push) {
    history.pushState({ viewer: true }, "", url);
    pushedEntry = true;
  }

  const card = cardFor(project.slug);
  const fromEl = card && card.querySelector(".project-media");
  const animated = transition(() => {
    renderProject(index);
    viewer.showModal();
    document.body.classList.add("locked");
    viewer.querySelector("#viewer-title").focus({ preventScroll: true });
  }, fromEl, viewerMediaEl);

  if (!animated && !reducedMotion) {
    viewer.classList.remove("fade-in");
    void viewer.offsetWidth;
    viewer.classList.add("fade-in");
  }
}

function finishClose({ animate = true, restoreFocus = true } = {}) {
  if (!viewer.open) return;
  const project = PROJECTS[currentIndex];
  const card = cardFor(project.slug);
  const update = () => {
    viewer.close();
    document.body.classList.remove("locked");
    document.title = "Max Sloam | Portfolio";
    if (!card || !restoreFocus) return;
    try {
      card.scrollIntoView({ block: "center", behavior: "instant" });
    } catch (err) {
      card.scrollIntoView({ block: "center" });
    }
    card.querySelector(".project-open").focus({ preventScroll: true });
  };

  if (animate && card) {
    transition(update, viewerMediaEl(), () => card.querySelector(".project-media"));
  } else {
    update();
  }
}

function closeViewer({ hash = "#projects", animate = true, restoreFocus = true, useBack = true } = {}) {
  if (!viewer.open) return;
  // If we added a history entry when opening, going back removes it; popstate then closes the viewer
  if (pushedEntry && useBack) {
    pushedEntry = false;
    history.back();
    return;
  }
  pushedEntry = false;
  history.replaceState(null, "", `${location.pathname}${location.search}${hash}`);
  finishClose({ animate, restoreFocus });
}

function step(delta) {
  if (!viewer.open) return;
  const index = (currentIndex + delta + PROJECTS.length) % PROJECTS.length;
  renderProject(index, delta);
  history.replaceState({ viewer: true }, "", `${location.pathname}${location.search}#/${PROJECTS[index].slug}`);
}

function route() {
  const index = indexOfSlug(slugFromHash());
  if (index >= 0) {
    openProject(index, { push: false });
  } else if (viewer.open) {
    pushedEntry = false;
    finishClose();
  }
}

window.addEventListener("popstate", route);

// Any link to #/slug opens that project
document.addEventListener("click", event => {
  const link = event.target.closest('a[href^="#/"]');
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
  const index = indexOfSlug(link.getAttribute("href").slice(2));
  if (index < 0) return;
  event.preventDefault();
  openProject(index);
});

viewer.addEventListener("click", event => {
  if (event.target.closest("[data-viewer-close]")) closeViewer();
  else if (event.target.closest("[data-viewer-prev]")) step(-1);
  else if (event.target.closest("[data-viewer-next]")) step(1);

  const thumb = event.target.closest("[data-thumb]");
  if (thumb) {
    const media = PROJECTS[currentIndex].media[Number(thumb.dataset.thumb)];
    const frame = viewerContent.querySelector(".gallery-frame");
    const img = frame.querySelector("img");
    const caption = viewerContent.querySelector(".gallery-main figcaption");
    img.src = media.src;
    img.alt = media.alt;
    frame.style.background = media.bg || "";
    frame.classList.toggle("has-bg", Boolean(media.bg));
    caption.textContent = media.caption || "";
    caption.hidden = !media.caption;
    viewerContent.querySelectorAll("[data-thumb]").forEach(t => t.setAttribute("aria-current", String(t === thumb)));
  }
});

// Esc closes through our own handler so the URL stays in sync
viewer.addEventListener("cancel", event => {
  event.preventDefault();
  closeViewer();
});

// Swipe left/right on touch screens; vertical scrolling stays native (touch-action: pan-y)
(() => {
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let horizontal = null;

  viewerScroll.addEventListener("pointerdown", event => {
    if (event.pointerType !== "touch") return;
    tracking = true;
    horizontal = null;
    startX = event.clientX;
    startY = event.clientY;
    viewerContent.style.transition = "none";
  });

  viewerScroll.addEventListener("pointermove", event => {
    if (!tracking) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (horizontal === null && Math.hypot(dx, dy) > 10) horizontal = Math.abs(dx) > Math.abs(dy);
    if (horizontal) {
      viewerContent.style.transform = `translateX(${dx * 0.4}px)`;
      viewerContent.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.4));
    }
  });

  function end(event) {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    viewerContent.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    viewerContent.style.transform = "";
    viewerContent.style.opacity = "";
    if (horizontal && event.type === "pointerup" && Math.abs(dx) > 60) step(dx < 0 ? 1 : -1);
    setTimeout(() => {
      viewerContent.style.transition = "";
    }, 220);
  }

  viewerScroll.addEventListener("pointerup", end);
  viewerScroll.addEventListener("pointercancel", end);
})();

/* ---------- Keyboard: arrows move between projects in the viewer ---------- */

document.addEventListener("keydown", event => {
  if (!viewer.open || isTyping(event.target)) return;
  if (event.key === "ArrowRight") step(1);
  else if (event.key === "ArrowLeft") step(-1);
});

/* ---------- Open a project linked directly (#/slug) ---------- */

route();
