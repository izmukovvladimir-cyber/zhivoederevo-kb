/* blog-goals.js: read-through and CTA goals for blog article pages. Vanilla, no deps.
 *
 * Include once per ARTICLE page, after the Metrika tag, with the counter id in data-ym:
 *   <script src="/blog-goals.js" data-ym="12345678" defer></script>
 * Optional data-body="CSS selector" names the article body
 * (default: [data-article-body], article, main; falls back to <body>).
 *
 * Fires into Yandex Metrika:
 *   read_75    once per page, when the bottom of the viewport passes 75% of the article body
 *   cta_click  on a click of a CTA link: t.me / telegram.me, ?start=, /product/, any utm_ param;
 *              params {slug} so the report can split clicks per article
 * Both goals must exist in the counter as "JavaScript event" goals with identifiers
 * read_75 and cta_click, otherwise Metrika drops the hits silently.
 * No counter id -> no-op. Safe to load twice (guarded).
 */
(function () {
  "use strict";
  if (typeof window === "undefined" || !window.document) return;
  if (window.__blogGoalsBound) return;
  window.__blogGoalsBound = true;

  var doc = window.document;
  var tag = doc.currentScript || doc.querySelector("script[data-ym][src*='blog-goals']");
  var raw = tag && tag.getAttribute ? tag.getAttribute("data-ym") : null;
  if (!raw || !/^\d+$/.test(raw)) return;
  var YM = parseInt(raw, 10);
  var bodySel = (tag.getAttribute("data-body") || "[data-article-body], article, main");

  function slug() {
    var parts = window.location.pathname.replace(/\/+$/, "").split("/");
    return (parts[parts.length - 1] || "").replace(/\.html?$/, "");
  }

  function goal(name, params) {
    try {
      if (typeof window.ym === "function") window.ym(YM, "reachGoal", name, params);
    } catch (e) { /* analytics must never break the page */ }
  }

  // ---- read_75
  var readFired = false;
  var ticking = false;

  function articleEl() {
    return doc.querySelector(bodySel) || doc.body;
  }

  function checkRead() {
    ticking = false;
    if (readFired) return;
    var el = articleEl();
    if (!el || !el.getBoundingClientRect) return;
    var rect = el.getBoundingClientRect();
    var height = el.offsetHeight || rect.height || 0;
    if (height <= 0) return;
    var viewportH = window.innerHeight || doc.documentElement.clientHeight || 0;
    var seen = viewportH - rect.top; // px of the article above the viewport bottom
    if (seen >= height * 0.75) {
      readFired = true;
      window.removeEventListener("scroll", onScroll);
      goal("read_75", { slug: slug() });
    }
  }

  function onScroll() {
    if (ticking || readFired) return;
    ticking = true;
    (window.requestAnimationFrame || function (f) { return setTimeout(f, 100); })(checkRead);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", checkRead);
  } else {
    checkRead();
  }

  // ---- cta_click
  var CTA = [
    /^(https?:)?\/\/(www\.)?(t|telegram)\.me\//i,
    /^tg:\/\//i,
    /[?&]start=/i,
    /\/product\//i,
    /[?&]utm_[a-z]+=/i
  ];

  function isCta(href) {
    for (var i = 0; i < CTA.length; i++) if (CTA[i].test(href)) return true;
    return false;
  }

  doc.addEventListener("click", function (ev) {
    var node = ev.target;
    while (node && node !== doc && !(node.tagName && node.tagName.toUpperCase() === "A")) {
      node = node.parentNode;
    }
    if (!node || node === doc) return;
    var href = node.getAttribute("href") || "";
    if (href && isCta(href)) goal("cta_click", { slug: slug() });
  }, true);
})();
