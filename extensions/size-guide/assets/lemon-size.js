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

    // ✅ NEW attrs from Liquid
    const productType = trigger.getAttribute("data-product-type") || "";
    const productVendor = trigger.getAttribute("data-product-vendor") || "";
    const productTags = parseCsvAttr(trigger, "data-product-tags");

    const url = new URL(proxyBase, window.location.origin);

    if (mode) url.searchParams.set("mode", mode);

    if (productId) url.searchParams.set("product_id", productId);
    if (productHandle) url.searchParams.set("product_handle", productHandle);
    if (collectionHandles)
      url.searchParams.set("collection_handles", collectionHandles);

    // ✅ NEW: pass product meta for TYPE/VENDOR/TAG rules
    if (productType) url.searchParams.set("product_type", productType);
    if (productVendor) url.searchParams.set("product_vendor", productVendor);
    if (productTags) url.searchParams.set("product_tags", productTags);

    return url;
  }

  async function fetchChart(trigger) {
    const url = buildProxyUrl(trigger, null);

    const res = await fetch(url.toString(), { credentials: "same-origin" });

    // for real fetch we expect JSON
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (e) {}

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

    // ✅ IMPORTANT:
    // 204/200 => show button
    // 404 => no match => hide button (normal, don't throw)
    if (res.status === 404) return false;

    // other non-OK statuses are real errors (401, 500, etc.)
    if (!res.ok) return false;

    return true;
  }

  function render(container, data) {
    if (!data || !data.chart) {
      container.innerHTML = `<div class="lemon-size__error">No size chart configured.</div>`;
      return;
    }

    const { title, unit, columns, rows } = data.chart;
    const cols = Array.isArray(columns) ? columns : [];

    const head = cols.map((c) => `<th>${escapeHtml(String(c))}</th>`).join("");
    const body = (rows || [])
      .map((r) => {
        const label = escapeHtml(String(r.label ?? ""));
        const cells = cols
          .map((c) => {
            const v = r.values && r.values[c] != null ? r.values[c] : "";
            return `<td>${escapeHtml(String(v))}</td>`;
          })
          .join("");
        return `<tr><td><strong>${label}</strong></td>${cells}</tr>`;
      })
      .join("");

    container.innerHTML = `
      <div class="lemon-size__title">${escapeHtml(title || "Size guide")}</div>
      <div class="lemon-size__sub">${unit ? `Units: ${escapeHtml(unit)}` : ""}</div>
      <table class="lemon-size__table">
        <thead><tr><th>Size</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function init() {
    document
      .querySelectorAll("[data-lemon-size-modal]")
      .forEach((m) => (m.hidden = true));

    const roots = Array.from(document.querySelectorAll("[data-lemon-size-root]"));

    // hide all until verified
    roots.forEach((root) => {
      root.hidden = true;
    });

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
        if (!ok) {
          root.remove();
          return;
        }
        root.hidden = false;
      } catch (e) {
        root.remove();
        return;
      }

      btn.addEventListener("click", async () => {
        content.innerHTML = `<div class="lemon-size__loading">Loading…</div>`;
        openModal(modal, btn);

        try {
          const data = await fetchChart(btn);
          render(content, data);
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