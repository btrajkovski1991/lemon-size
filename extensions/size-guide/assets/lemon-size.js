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

  function getCollections(trigger) {
    const raw = trigger.getAttribute("data-collection-handles") || "";
    // keep as comma list, but normalize whitespace
    return raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .join(",");
  }

  async function fetchChart(trigger) {
    const proxyBase =
      trigger.getAttribute("data-proxy-base") || "/apps/lemon-size/size-chart";
    const productId = trigger.getAttribute("data-product-id") || "";
    const productHandle = trigger.getAttribute("data-product-handle") || "";
    const collectionHandles = getCollections(trigger);

    const url = new URL(proxyBase, window.location.origin);

    if (productId) url.searchParams.set("product_id", productId);
    if (productHandle) url.searchParams.set("product_handle", productHandle);

    // ✅ NEW: pass collection handles
    if (collectionHandles) url.searchParams.set("collection_handles", collectionHandles);

    const res = await fetch(url.toString(), { credentials: "same-origin" });
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
    const proxyBase =
      trigger.getAttribute("data-proxy-base") || "/apps/lemon-size/size-chart";
    const productId = trigger.getAttribute("data-product-id") || "";
    const productHandle = trigger.getAttribute("data-product-handle") || "";
    const collectionHandles = getCollections(trigger);

    const url = new URL(proxyBase, window.location.origin);
    url.searchParams.set("mode", "exists");

    if (productId) url.searchParams.set("product_id", productId);
    if (productHandle) url.searchParams.set("product_handle", productHandle);

    // ✅ NEW: pass collection handles
    if (collectionHandles) url.searchParams.set("collection_handles", collectionHandles);

    const res = await fetch(url.toString(), { credentials: "same-origin" });

    // 204/200 = yes, 404 = no
    return res.ok;
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