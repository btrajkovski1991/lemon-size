(function () {
  if (window.__LEMON_SIZE_INIT__) return;
  window.__LEMON_SIZE_INIT__ = true;

  function openModal(modal, trigger) {
    modal.hidden = false;
    modal._trigger = trigger;

    // lock background scroll
    document.documentElement.classList.add("lemon-size--lock");
    document.body.classList.add("lemon-size--lock");

    const closeBtn = modal.querySelector(".lemon-size__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;

    document.documentElement.classList.remove("lemon-size--lock");
    document.body.classList.remove("lemon-size--lock");

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
    if (res.status === 404) return false;
    if (!res.ok) return false;
    return true;
  }

  /** ---------------------------
   * Unit conversion (smart)
   * --------------------------*/

  function toNumMaybe(v) {
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  }

  function convertNumber(n, fromUnit, toUnit) {
    if (fromUnit === "cm" && toUnit === "in") return n / 2.54;
    if (fromUnit === "in" && toUnit === "cm") return n * 2.54;
    return n;
  }

  function formatConverted(n, toUnit) {
    // inches: 2 decimals, cm: 1 decimal
    if (toUnit === "in") return n.toFixed(2);
    if (toUnit === "cm") return n.toFixed(1);
    return String(n);
  }

  // Converts:
  // "92" -> "36.22"
  // "90-95" -> "35.43-37.40"
  // "90 – 95" -> same
  function convertValueSmart(v, fromUnit, toUnit) {
    const s = String(v ?? "").trim();
    if (!s) return s;

    // handle ranges like "90-95" or "90 – 95"
    const range = s.split(/[-–—]/).map((x) => x.trim()).filter(Boolean);
    if (range.length === 2) {
      const a = toNumMaybe(range[0]);
      const b = toNumMaybe(range[1]);
      if (a == null || b == null) return s;

      const ca = convertNumber(a, fromUnit, toUnit);
      const cb = convertNumber(b, fromUnit, toUnit);
      return `${formatConverted(ca, toUnit)}-${formatConverted(cb, toUnit)}`;
    }

    const n = toNumMaybe(s);
    if (n == null) return s;

    const cn = convertNumber(n, fromUnit, toUnit);
    return formatConverted(cn, toUnit);
  }

  // Detect columns that are “measurements” vs “labels”
  function isMeasurementColumn(colName) {
    const c = String(colName || "").toUpperCase();

    // do NOT convert obvious size labels
    if (c.includes("SIZE")) return false;
    if (c.includes("US")) return false;
    if (c.includes("EUR")) return false;
    if (c.includes("EU")) return false;

    // convert typical measurement columns
    const good =
      c.includes("CHEST") ||
      c.includes("BUST") ||
      c.includes("UNDERBUST") ||
      c.includes("WAIST") ||
      c.includes("HIP") ||
      c.includes("INSEAM") ||
      c.includes("LENGTH") ||
      c.includes("SLEEVE") ||
      c.includes("SHOULDER") ||
      c.includes("NECK") ||
      c.includes("BACK") ||
      c.includes("HEAD") ||
      c.includes("WRIST") ||
      c.includes("FOOT") ||
      c.includes("DIAMETER") ||
      c.includes("CIRCUMFERENCE");

    return good;
  }

  // We only show conversion toggle when base unit is convertible.
  function isConvertibleUnit(unit) {
    const u = String(unit || "").toLowerCase();
    return u === "cm" || u === "in";
  }

  function setUnitButtons(modal, activeUnit) {
    modal.querySelectorAll("[data-lemon-unit]").forEach((btn) => {
      const u = btn.getAttribute("data-lemon-unit");
      btn.classList.toggle("is-active", u === activeUnit);
      btn.setAttribute("aria-selected", u === activeUnit ? "true" : "false");
    });
  }

  function renderTable(chart, displayUnit) {
    const { unit, columns, rows } = chart;
    const baseUnit = String(unit || "").toLowerCase();
    const cols = Array.isArray(columns) ? columns : [];

    // Table head (do not hardcode "Size" here; your column list already includes it)
    const head = cols.map((c) => `<th>${escapeHtml(String(c))}</th>`).join("");

    const body = (rows || [])
      .map((r) => {
        const cells = cols
          .map((c) => {
            const raw = r.values && r.values[c] != null ? r.values[c] : "";

            const val =
              isConvertibleUnit(baseUnit) &&
              isConvertibleUnit(displayUnit) &&
              baseUnit !== displayUnit &&
              isMeasurementColumn(c)
                ? convertValueSmart(raw, baseUnit, displayUnit)
                : raw;

            return `<td>${escapeHtml(String(val))}</td>`;
          })
          .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `
      <table class="lemon-size__table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  function setMeasureBlock(root, chart) {
    const measureTitle = root.querySelector("[data-lemon-measure-title]");
    const measureText = root.querySelector("[data-lemon-measure-text]");
    const measureImg = root.querySelector("[data-lemon-measure-img]");
    const tipsEl = root.querySelector("[data-lemon-tips]");
    const discEl = root.querySelector("[data-lemon-disclaimer]");

    const title = chart.guideTitle || "How to measure";
    const text = chart.guideText || "";
    const img = chart.guideImage || "";

    if (measureTitle) measureTitle.textContent = title;
    if (measureText) measureText.innerHTML = escapeHtml(text).replaceAll("\n", "<br>");

    if (measureImg) {
      if (img) {
        measureImg.src = img;
        measureImg.hidden = false;
      } else {
        measureImg.hidden = true;
      }
    }

    if (tipsEl) {
      if (chart.tips) {
        tipsEl.innerHTML = escapeHtml(chart.tips).replaceAll("\n", "<br>");
        tipsEl.closest(".lemon-size__note")?.classList.remove("is-hidden");
      } else {
        tipsEl.closest(".lemon-size__note")?.classList.add("is-hidden");
      }
    }

    if (discEl) {
      if (chart.disclaimer) {
        discEl.innerHTML = escapeHtml(chart.disclaimer).replaceAll("\n", "<br>");
        discEl.closest(".lemon-size__note")?.classList.remove("is-hidden");
      } else {
        discEl.closest(".lemon-size__note")?.classList.add("is-hidden");
      }
    }
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

  // base unit from DB (cm/in/mm) — display defaults to base
  const baseUnit = (chart.unit || "cm").toLowerCase();
  modal._lemonBaseUnit = baseUnit;
  modal._lemonDisplayUnit = modal._lemonDisplayUnit || baseUnit;

  if (subEl) subEl.textContent = `Units: ${modal._lemonDisplayUnit.toUpperCase()}`;
  setUnitButtons(modal, modal._lemonDisplayUnit);

  // --- Table ---
  contentEl.innerHTML = renderTable(chart, modal._lemonDisplayUnit);

  // --- Guide fields (from Prisma) ---
  const guideTitleEl = modal.querySelector("[data-lemon-guide-title]");
  const guideTextEl = modal.querySelector("[data-lemon-guide-text]");
  const guideImgEl = modal.querySelector("[data-lemon-guide-img]");
  const tipsEl = modal.querySelector("[data-lemon-guide-tips]");
  const discEl = modal.querySelector("[data-lemon-guide-disclaimer]");

  const guideTitle = chart.guideTitle || "How to measure";
  const guideText = chart.guideText || "";
  const guideImage = chart.guideImage || "";
  const tips = chart.tips || "";
  const disclaimer = chart.disclaimer || "";

  if (guideTitleEl) guideTitleEl.textContent = guideTitle;

  if (guideTextEl) {
    guideTextEl.textContent = guideText;
    // if empty, keep some spacing but not blank ugliness
    if (!guideText.trim()) guideTextEl.textContent = "—";
  }

  if (guideImgEl) {
    if (guideImage && String(guideImage).trim()) {
      guideImgEl.src = guideImage;
      guideImgEl.hidden = false;
    } else {
      // fallback to auto image mapping if you want
      // guideImgEl.src = getGuideImage(chart.title || "");
      // guideImgEl.hidden = false;

      guideImgEl.hidden = true;
      guideImgEl.removeAttribute("src");
    }
  }

  if (tipsEl) {
    if (tips && tips.trim()) {
      tipsEl.classList.remove("is-hidden");
      tipsEl.innerHTML = `<strong>Tips</strong><div>${escapeHtml(tips)}</div>`;
    } else {
      tipsEl.classList.add("is-hidden");
      tipsEl.innerHTML = "";
    }
  }

  if (discEl) {
    if (disclaimer && disclaimer.trim()) {
      discEl.classList.remove("is-hidden");
      discEl.innerHTML = `<strong>Note</strong><div>${escapeHtml(disclaimer)}</div>`;
    } else {
      discEl.classList.add("is-hidden");
      discEl.innerHTML = "";
    }
  }
}


  function init() {
    document.querySelectorAll("[data-lemon-size-modal]").forEach((m) => (m.hidden = true));

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
      const img = root.querySelector("[data-lemon-productimg]");

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

      // product image from Liquid
      const productImg = btn.getAttribute("data-product-image") || "";
      if (img) {
        if (productImg) img.src = productImg;
        img.alt = btn.getAttribute("data-product-handle") || "";
      }

      // Unit toggle
      modal.querySelectorAll("[data-lemon-unit]").forEach((unitBtn) => {
        unitBtn.addEventListener("click", () => {
          if (unitBtn.disabled) return;

          const u = (unitBtn.getAttribute("data-lemon-unit") || "").toLowerCase();
          if (!u) return;

          modal._lemonDisplayUnit = u;

          const subEl = modal.querySelector("[data-lemon-size-subtitle]");
          if (subEl) subEl.textContent = `Units: ${u.toUpperCase()}`;

          setUnitButtons(modal, u);

          if (modal._lemonData) render(modal, root, content, modal._lemonData);
        });
      });

      btn.addEventListener("click", async () => {
        content.innerHTML = `<div class="lemon-size__loading">Loading…</div>`;
        openModal(modal, btn);

        try {
          const data = await fetchChart(btn);
          modal._lemonData = data;
          render(modal, root, content, data);
        } catch (err) {
          console.error("[LemonSize] Fetch/render error:", err);
          content.innerHTML =
            `<div class="lemon-size__error">Couldn’t load size chart.</div>`;
        }
      });

      root.addEventListener("click", (e) => {
        const close = e.target.closest("[data-lemon-size-close]");
        if (!close) return;
        closeModal(modal);
      });

      modal.addEventListener("click", (e) => {
        // click outside dialog closes
        if (e.target && e.target.matches && e.target.matches(".lemon-size__overlay")) {
          closeModal(modal);
        }
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