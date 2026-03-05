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
    return c.includes("FOOT") || c.includes("LENGTH");
  }

  function setUnitButtons(modal, activeUnit) {
    modal.querySelectorAll("[data-lemon-unit]").forEach((btn) => {
      const u = btn.getAttribute("data-lemon-unit");
      btn.classList.toggle("is-active", u === activeUnit);
    });
  }

  function renderTable(chart, displayUnit) {
    const { title, unit, columns, rows } = chart;
    const baseUnit = (unit || "").toLowerCase();
    const cols = Array.isArray(columns) ? columns : [];

    const head = cols
      .map((c) => `<th>${escapeHtml(String(c))}</th>`)
      .join("");

    const body = (rows || [])
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

        return `<tr><td><strong>${label}</strong></td>${cells}</tr>`;
      })
      .join("");

    return `
      <table class="lemon-size__table">
        <thead><tr><th>Size</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
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

    // default unit = chart.unit, fallback to "cm"
    const baseUnit = (chart.unit || "cm").toLowerCase();
    modal._lemonBaseUnit = baseUnit;
    modal._lemonDisplayUnit = modal._lemonDisplayUnit || baseUnit;

    if (subEl) {
      subEl.textContent = `Units: ${modal._lemonDisplayUnit.toUpperCase()}`;
    }

    setUnitButtons(modal, modal._lemonDisplayUnit);

    contentEl.innerHTML = renderTable(chart, modal._lemonDisplayUnit);
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
      const img = root.querySelector("[data-lemon-productimg]");

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

      // set product image (from Liquid)
      const productImg = btn.getAttribute("data-product-image") || "";
      if (img && productImg) img.src = productImg;

      // unit toggle
      modal.querySelectorAll("[data-lemon-unit]").forEach((unitBtn) => {
        unitBtn.addEventListener("click", () => {
          const u = (unitBtn.getAttribute("data-lemon-unit") || "").toLowerCase();
          if (!u) return;

          modal._lemonDisplayUnit = u;
          const subEl = modal.querySelector("[data-lemon-size-subtitle]");
          if (subEl) subEl.textContent = `Units: ${u.toUpperCase()}`;
          setUnitButtons(modal, u);

          // re-render from cached data if present
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