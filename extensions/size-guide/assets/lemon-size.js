(function () {
  if (window.__LEMON_SIZE_INIT__) return;
  window.__LEMON_SIZE_INIT__ = true;

  function openModal(modal, trigger) {
    modal.hidden = false;
    modal._trigger = trigger;
    const closeBtn = modal.querySelector(".lemon-size__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (modal._trigger) modal._trigger.focus();
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseCsvAttr(trigger, attrName) {
    const raw = trigger.getAttribute(attrName) || "";
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(",");
  }

  function buildProxyUrl(trigger, mode) {
    const proxyBase =
      trigger.getAttribute("data-proxy-base") || "/apps/lemon-size/size-chart";

    const productId = trigger.getAttribute("data-product-id") || "";
    const productHandle = trigger.getAttribute("data-product-handle") || "";
    const collectionHandles = parseCsvAttr(trigger, "data-collection-handles");

    const productType = trigger.getAttribute("data-product-type") || "";
    const productVendor = trigger.getAttribute("data-product-vendor") || "";
    const productTags = parseCsvAttr(trigger, "data-product-tags");

    const url = new URL(proxyBase, window.location.origin);

    if (mode) url.searchParams.set("mode", mode);
    if (productId) url.searchParams.set("product_id", productId);
    if (productHandle) url.searchParams.set("product_handle", productHandle);
    if (collectionHandles)
      url.searchParams.set("collection_handles", collectionHandles);

    if (productType) url.searchParams.set("product_type", productType);
    if (productVendor) url.searchParams.set("product_vendor", productVendor);
    if (productTags) url.searchParams.set("product_tags", productTags);

    return url;
  }

  async function fetchChart(trigger) {
    const url = buildProxyUrl(trigger, null);
    const res = await fetch(url.toString(), { credentials: "same-origin" });

    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch (e) {}

    if (!res.ok) {
      const msg =
        (json && (json.error || json.message || json.reason)) ||
        `Request failed (${res.status}).`;
      throw new Error(msg);
    }

    if (!json) throw new Error("Response was not JSON.");
    return json;
  }

  async function hasChartFor(trigger) {
    const url = buildProxyUrl(trigger, "exists");
    const res = await fetch(url.toString(), { credentials: "same-origin" });

    if (res.status === 404) return false;
    if (!res.ok) return false;
    return true;
  }

  function toNumMaybe(v) {
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  }

  function convertValue(v, fromUnit, toUnit) {
    const n = toNumMaybe(v);
    if (n == null) return v;

    // cm <-> in
    if (fromUnit === "cm" && toUnit === "in") return (n / 2.54).toFixed(2);
    if (fromUnit === "in" && toUnit === "cm") return (n * 2.54).toFixed(1);
    return v;
  }

  function shouldConvertColumn(colName) {
    const c = String(colName || "").toUpperCase();
    // Only convert length-ish columns
    return c.includes("FOOT") || c.includes("LENGTH") || c.includes("SLEEVE") || c.includes("SHOULDER");
  }

  function setUnitButtons(modal, activeUnit) {
    modal.querySelectorAll("[data-lemon-unit]").forEach((btn) => {
      const u = (btn.getAttribute("data-lemon-unit") || "").toLowerCase();
      btn.classList.toggle("is-active", u === activeUnit);
    });
  }

  function getGuideImage(chartTitle) {
    const map = {
      "tops": "/size-guides/tops.png",
      "jacket": "/size-guides/tops.png",
      "blazer": "/size-guides/tops.png",

      "bottoms": "/size-guides/bottoms.png",

      "dress": "/size-guides/dress.png",
      "bikini": "/size-guides/dress.png",

      "bra": "/size-guides/bra.png",

      "shoes": "/size-guides/shoes.png",

      "ring": "/size-guides/ring.png",
      "bracelet": "/size-guides/bracelet.png",
      "necklace": "/size-guides/necklace.png",

      "headwear": "/size-guides/headwear.png",

      "pet clothing": "/size-guides/pet-clothing.png",
      "pet collar": "/size-guides/pet-collar.png",
    };

    const key = String(chartTitle || "").toLowerCase();
    for (const k in map) {
      if (key.includes(k)) return map[k];
    }
    return "/size-guides/default.png";
  }

  function normalizeColumns(columns) {
    const cols = Array.isArray(columns) ? columns.map(String) : [];
    // If the chart columns include "SIZE", we remove it because row.label already represents size
    return cols.filter((c) => c.trim().toUpperCase() !== "SIZE");
  }

  function renderTable(chart, displayUnit) {
    const baseUnit = String(chart.unit || "cm").toLowerCase();
    const cols = normalizeColumns(chart.columns);

    const head = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("");

    const body = (chart.rows || [])
      .map((r) => {
        const label = escapeHtml(String(r.label ?? ""));
        const cells = cols
          .map((c) => {
            const raw = r.values && r.values[c] != null ? r.values[c] : "";
            const val =
              baseUnit && displayUnit && baseUnit !== displayUnit && shouldConvertColumn(c)
                ? convertValue(raw, baseUnit, displayUnit)
                : raw;

            return `<td>${escapeHtml(String(val))}</td>`;
          })
          .join("");

        return `<tr><td class="lemon-size__sizecell"><strong>${label}</strong></td>${cells}</tr>`;
      })
      .join("");

    return `
      <div class="lemon-size__tablewrap">
        <table class="lemon-size__table">
          <thead><tr><th>Size</th>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function renderGuide(chart) {
    const img = chart.guideImage || getGuideImage(chart.title);
    const title = chart.guideTitle || "How to measure";
    const text = chart.guideText || "";
    const tips = chart.tips || "";
    const disclaimer = chart.disclaimer || "";

    // split guideText into paragraphs (nice on storefront)
    const paragraphs = String(text)
      .trim()
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("");

    return `
      <div class="lemon-size__section lemon-size__measure">
        <div class="lemon-size__measure-head">
          <h3 class="lemon-size__h3">${escapeHtml(title)}</h3>
        </div>

        <div class="lemon-size__measure-grid">
          <div class="lemon-size__measure-media">
            <img class="lemon-size__measure-img" src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy">
          </div>

          <div class="lemon-size__measure-copy">
            ${paragraphs || `<p>Follow the instructions to choose the right size.</p>`}

            ${tips ? `<div class="lemon-size__tips"><strong>Tip:</strong> ${escapeHtml(tips)}</div>` : ""}

            ${disclaimer ? `<div class="lemon-size__disclaimer">${escapeHtml(disclaimer)}</div>` : ""}
          </div>
        </div>
      </div>
    `;
  }

  function render(modal, contentEl, data) {
    if (!data || !data.chart) {
      contentEl.innerHTML = `<div class="lemon-size__error">No size chart configured.</div>`;
      return;
    }

    const chart = data.chart;

    const titleEl = modal.querySelector("[data-lemon-size-title]");
    const subEl = modal.querySelector("[data-lemon-size-subtitle]");

    if (titleEl) titleEl.textContent = chart.title || "Size guide";

    const baseUnit = String(chart.unit || "cm").toLowerCase();
    modal._lemonBaseUnit = baseUnit;
    modal._lemonDisplayUnit = modal._lemonDisplayUnit || baseUnit;

    if (subEl) subEl.textContent = `Units: ${modal._lemonDisplayUnit.toUpperCase()}`;
    setUnitButtons(modal, modal._lemonDisplayUnit);

    // Nike-style layout: table + measure section
    const tableHtml = renderTable(chart, modal._lemonDisplayUnit);
    const guideHtml = renderGuide(chart);

    contentEl.innerHTML = `
      <div class="lemon-size__content">
        <div class="lemon-size__section lemon-size__chart">
          ${tableHtml}
        </div>
        ${guideHtml}
      </div>
    `;
  }

  function init() {
    document
      .querySelectorAll("[data-lemon-size-modal]")
      .forEach((m) => (m.hidden = true));

    const roots = Array.from(document.querySelectorAll("[data-lemon-size-root]"));
    roots.forEach((root) => { root.hidden = true; });

    roots.forEach(async (root) => {
      if (root.__lemonBound) return;
      root.__lemonBound = true;

      const btn = root.querySelector("[data-lemon-size-trigger]");
      const modal = root.querySelector("[data-lemon-size-modal]");
      const content = root.querySelector("[data-lemon-size-chart]");

      if (!btn || !modal || !content) {
        root.remove();
        return;
      }

      try {
        const ok = await hasChartFor(btn);
        if (!ok) { root.remove(); return; }
        root.hidden = false;
      } catch (e) {
        root.remove();
        return;
      }

      // unit toggle buttons (if your modal has them)
      modal.querySelectorAll("[data-lemon-unit]").forEach((unitBtn) => {
        unitBtn.addEventListener("click", () => {
          const u = (unitBtn.getAttribute("data-lemon-unit") || "").toLowerCase();
          if (!u) return;

          modal._lemonDisplayUnit = u;

          const subEl = modal.querySelector("[data-lemon-size-subtitle]");
          if (subEl) subEl.textContent = `Units: ${u.toUpperCase()}`;

          setUnitButtons(modal, u);

          if (modal._lemonData) render(modal, content, modal._lemonData);
        });
      });

      btn.addEventListener("click", async () => {
        content.innerHTML = `<div class="lemon-size__loading">Loading…</div>`;
        openModal(modal, btn);

        try {
          const data = await fetchChart(btn);
          modal._lemonData = data;
          render(modal, content, data);
        } catch (err) {
          console.error("[LemonSize] Fetch/render error:", err);
          content.innerHTML = `<div class="lemon-size__error">Couldn’t load size chart.</div>`;
        }
      });

      root.addEventListener("click", (e) => {
        const close = e.target.closest("[data-lemon-size-close]");
        if (!close) return;
        closeModal(modal);
      });

      root.__lemonModal = modal;
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      document.querySelectorAll("[data-lemon-size-root]").forEach((root) => {
        const modal = root.__lemonModal;
        if (!modal || modal.hidden) return;
        closeModal(modal);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();