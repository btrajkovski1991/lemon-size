(function () {
  if (window.__LEMON_SIZE_INIT__) return;
  window.__LEMON_SIZE_INIT__ = true;

  function mountModalToBody(modal) {
    if (!modal || modal.__lemonMountedToBody) return;
    document.body.appendChild(modal);
    modal.__lemonMountedToBody = true;
  }

  function openModal(modal, trigger) {
    modal.hidden = false;
    modal._trigger = trigger;
    document.documentElement.classList.add("lemon-size__lock");
    document.body.classList.add("lemon-size__lock");

    const closeBtn = modal.querySelector(".lemon-size__close");
    if (closeBtn) closeBtn.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.documentElement.classList.remove("lemon-size__lock");
    document.body.classList.remove("lemon-size__lock");
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

  function normalizeGuideImageUrl(rawUrl) {
    if (!rawUrl || !String(rawUrl).trim()) return "";
    const clean = String(rawUrl).trim();

    if (/^https?:\/\//i.test(clean)) return clean;

    if (clean.startsWith("//")) {
      return window.location.protocol + clean;
    }

    return clean;
  }

  function buildProxyUrl(trigger, mode) {
    const proxyBase = trigger.getAttribute("data-proxy-base") || "/apps/lemon-size/size-chart";

    const productId = trigger.getAttribute("data-product-id") || "";
    const productHandle = trigger.getAttribute("data-product-handle") || "";
    const productTitle = trigger.getAttribute("data-product-title") || "";
    const collectionHandles = parseCsvAttr(trigger, "data-collection-handles");
    const productType = trigger.getAttribute("data-product-type") || "";
    const productVendor = trigger.getAttribute("data-product-vendor") || "";
    const productTags = parseCsvAttr(trigger, "data-product-tags");
    const availableSizes = parseCsvAttr(trigger, "data-available-sizes");

    const url = new URL(proxyBase, window.location.origin);

    if (mode) url.searchParams.set("mode", mode);
    if (productId) url.searchParams.set("product_id", productId);
    if (productHandle) url.searchParams.set("product_handle", productHandle);
    if (productTitle) url.searchParams.set("product_title", productTitle);
    if (collectionHandles) url.searchParams.set("collection_handles", collectionHandles);
    if (productType) url.searchParams.set("product_type", productType);
    if (productVendor) url.searchParams.set("product_vendor", productVendor);
    if (productTags) url.searchParams.set("product_tags", productTags);
    if (availableSizes) url.searchParams.set("available_sizes", availableSizes);

    return url;
  }

  function buildAnalyticsUrl(trigger, chart) {
    const analyticsBase = trigger.getAttribute("data-analytics-base") || "/apps/lemon-size/analytics";
    const url = new URL(analyticsBase, window.location.origin);

    const productId = trigger.getAttribute("data-product-id") || "";
    const productHandle = trigger.getAttribute("data-product-handle") || "";
    const productTitle = trigger.getAttribute("data-product-title") || "";
    const chartId = chart && chart.id ? String(chart.id) : "";

    url.searchParams.set("event", "open");
    if (productId) url.searchParams.set("product_id", productId);
    if (productHandle) url.searchParams.set("product_handle", productHandle);
    if (productTitle) url.searchParams.set("product_title", productTitle);
    if (chartId) url.searchParams.set("chart_id", chartId);

    return url;
  }

  function trackChartView(trigger, data) {
    const chart = data && Object.prototype.hasOwnProperty.call(data, "chart") ? data.chart : null;
    if (!chart || !chart.id) return;

    const url = buildAnalyticsUrl(trigger, chart);

    fetch(url.toString(), {
      method: "GET",
      credentials: "same-origin",
      keepalive: true,
    }).catch(function (error) {
      console.error("[LemonSize] analytics tracking failed:", error);
    });
  }

  async function requestJson(url) {
    const res = await fetch(url.toString(), { credentials: "same-origin" });
    const text = await res.text();

    let payload = null;
    try {
      payload = JSON.parse(text);
    } catch (e) {}

    if (!res.ok) {
      const msg =
        (payload && (payload.error || payload.message || payload.reason)) ||
        `Request failed (${res.status}).`;
      throw new Error(msg);
    }

    if (!payload) throw new Error("Response was not JSON.");
    return payload;
  }

  async function fetchChart(trigger) {
    const url = buildProxyUrl(trigger, null);
    return requestJson(url);
  }

  async function hasChartFor(trigger) {
    const url = buildProxyUrl(trigger, "exists");
    const res = await fetch(url.toString(), { credentials: "same-origin" });
    if (res.status === 404) return false;
    if (!res.ok) return false;
    return true;
  }

  function toNumMaybe(v) {
    const s = String(v ?? "")
      .trim()
      .replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function isLengthUnit(unit) {
    return unit === "cm" || unit === "in" || unit === "mm";
  }

  function hasExplicitUnit(value) {
    return /\b(mm|millimeter|millimeters|cm|cms|centimeter|centimeters|in|inch|inches)\b/i.test(
      String(value || ""),
    );
  }

  function convertNumber(n, fromUnit, toUnit) {
    if (fromUnit === toUnit) return n;

    var mmValue = n;
    if (fromUnit === "cm") mmValue = n * 10;
    else if (fromUnit === "in") mmValue = n * 25.4;
    else if (fromUnit === "mm") mmValue = n;

    if (toUnit === "mm") return mmValue;
    if (toUnit === "cm") return mmValue / 10;
    if (toUnit === "in") return mmValue / 25.4;
    return n;
  }

  function fmt(n, unit) {
    if (unit === "in") return n.toFixed(2).replace(/\.00$/, "");
    if (unit === "cm") return n.toFixed(1).replace(/\.0$/, "");
    if (unit === "mm") return n.toFixed(1).replace(/\.0$/, "");
    return String(n);
  }

  function normalizeUnitLabel(text, toUnit) {
    return String(text)
      .replace(/\b(mm|millimeter|millimeters)\b/gi, toUnit)
      .replace(/\b(cm|cms|centimeter|centimeters)\b/gi, toUnit)
      .replace(/\b(in|inch|inches)\b/gi, toUnit);
  }

  function convertMeasurementText(raw, fromUnit, toUnit) {
    const value = String(raw ?? "");
    if (!value.trim()) return value;

    let convertedAny = false;
    const converted = value.replace(/-?\d+(?:[.,]\d+)?/g, (match) => {
      const n = toNumMaybe(match);
      if (n == null) return match;
      convertedAny = true;
      return fmt(convertNumber(n, fromUnit, toUnit), toUnit);
    });

    if (!convertedAny) return value;
    if (!hasExplicitUnit(value)) return converted;

    return normalizeUnitLabel(converted, toUnit);
  }

  function shouldConvertColumn(colName) {
    const c = String(colName || "").toUpperCase();

    const jewelryMeasurementKeys = [
      "DIAMETER",
      "CIRCUMFERENCE",
      "INSIDE DIAMETER",
      "INNER DIAMETER",
      "FINGER SIZE",
      "CHAIN LENGTH",
      "NECKLACE LENGTH",
      "BRACELET LENGTH",
      "THICKNESS",
      "WIDTH",
      "DROP LENGTH",
      "DROP",
      "GIRTH",
    ];

    if (jewelryMeasurementKeys.some((key) => c.includes(key))) {
      return true;
    }

    if (
      c.includes("SIZE") ||
      c.includes("US") ||
      c.includes("UK") ||
      c.includes("EUR") ||
      c.includes("EU") ||
      c.includes("JP")
    ) {
      return false;
    }

    const keys = [
      "LENGTH",
      "CHEST",
      "WAIST",
      "HIP",
      "INSEAM",
      "SHOULDER",
      "SLEEVE",
      "BUST",
      "UNDERBUST",
      "NECK",
      "BACK",
      "HEAD",
      "WRIST",
      "FOOT",
      "CALF",
      "THIGH",
      "ARM",
      "LEG",
      "HEIGHT",
      "BAND",
    ];

    return keys.some((k) => c.includes(k));
  }

  function setUnitButtons(modal, activeUnit) {
    modal.querySelectorAll("[data-lemon-unit]").forEach((btn) => {
      const u = (btn.getAttribute("data-lemon-unit") || "").toLowerCase();
      btn.classList.toggle("is-active", u === activeUnit);
      btn.setAttribute("aria-selected", u === activeUnit ? "true" : "false");
    });
  }

  function setUnitUI(modal, baseUnit, displayUnit) {
    const subEl = modal.querySelector("[data-lemon-size-subtitle]");
    const matchReason = String(modal._lemonMatchReason || "").trim();
    if (subEl) {
      const unitText = `Units: ${String(displayUnit).toUpperCase()}`;
      subEl.textContent = matchReason ? `${unitText} • ${matchReason}` : unitText;
    }

    const unitWrap = modal.querySelector(".lemon-size__unit");
    const canToggle = isLengthUnit(baseUnit);
    if (unitWrap) unitWrap.hidden = !canToggle;

    setUnitButtons(modal, displayUnit);
  }

  function defaultGuideFor(title) {
    const t = String(title || "").toLowerCase();

    if (t.includes("shoe")) {
      return {
        guideTitle: "How to measure",
        guideText:
          "Place your foot on paper. Mark heel and longest toe. Measure the distance and match it to the chart.",
      };
    }

    if (t.includes("top") || t.includes("jacket") || t.includes("blazer")) {
      return {
        guideTitle: "How to measure",
        guideText:
          "Measure chest around the fullest part, shoulder across, and length from highest shoulder point to hem.",
      };
    }

    if (t.includes("bottom") || t.includes("pants") || t.includes("short")) {
      return {
        guideTitle: "How to measure",
        guideText:
          "Measure waist at the narrowest point, hips at the fullest point, and inseam from crotch to ankle.",
      };
    }

    if (t.includes("dress")) {
      return {
        guideTitle: "How to measure",
        guideText:
          "Measure bust, waist, and hips, then compare to the chart. If between sizes, size up for comfort.",
      };
    }

    if (t.includes("ring")) {
      return {
        guideTitle: "How to measure",
        guideText:
          "Measure the inner diameter of a ring that fits you, then match it to the chart.",
      };
    }

    return {
      guideTitle: "How to measure",
      guideText:
        "Use a soft measuring tape and compare your measurements to the chart. If between sizes, size up.",
    };
  }

  function renderTable(chart, displayUnit) {
    const baseUnit = String(chart.unit || "cm").toLowerCase();
    const cols = Array.isArray(chart.columns) ? chart.columns : [];
    const rows = Array.isArray(chart.rows) ? chart.rows : [];

    const head = cols
      .map((c, index) => {
        const classes = index === 0 ? ' class="lemon-size__stickyCol"' : "";
        return `<th${classes}>${escapeHtml(String(c))}</th>`;
      })
      .join("");

    const body = rows
      .map((r) => {
        const cells = cols
          .map((c, index) => {
            let raw =
              r && r.values && r.values[c] != null
                ? r.values[c]
                : String(c).toUpperCase().includes("SIZE")
                  ? r && r.label
                  : "";

            if (
              isLengthUnit(baseUnit) &&
              isLengthUnit(displayUnit) &&
              baseUnit !== displayUnit &&
              shouldConvertColumn(c)
            ) {
              raw = convertMeasurementText(raw, baseUnit, displayUnit);
            }

            const classes = index === 0 ? ' class="lemon-size__stickyCol"' : "";
            return `<td${classes}>${escapeHtml(String(raw ?? ""))}</td>`;
          })
          .join("");

        return `<tr>${cells}</tr>`;
      })
      .join("");

    return `
      <div class="lemon-size__tableWrap">
        <table class="lemon-size__table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    `;
  }

  function renderGuide(modal, chart) {
    const guide = chart || {};
    const fallback = defaultGuideFor(guide.title);

    const title = guide.guideTitle || fallback.guideTitle || "How to measure";
    const text = guide.guideText || fallback.guideText || "";
    const tips = guide.tips || "";
    const disclaimer = guide.disclaimer || "";
    const rawGuideImage = String(guide.guideImage || "").trim();
    const showGuideImageFlag =
      guide.showGuideImage === true || String(guide.showGuideImage).toLowerCase() === "true";

    let imgUrl = "";
    if (showGuideImageFlag && rawGuideImage) {
      imgUrl = normalizeGuideImageUrl(rawGuideImage);
    }

    const titleEl = modal.querySelector("[data-lemon-guide-title]");
    const textEl = modal.querySelector("[data-lemon-guide-text]");
    const tipsEl = modal.querySelector("[data-lemon-guide-tips]");
    const discEl = modal.querySelector("[data-lemon-guide-disclaimer]");
    const imgEl = modal.querySelector("[data-lemon-guide-img]");
    const imgWrap = modal.querySelector("[data-lemon-guide-imgwrap]");

    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;

    const tipsRow = tipsEl ? tipsEl.closest(".lemon-size__mutedRow") : null;
    const discRow = discEl ? discEl.closest(".lemon-size__mutedRow") : null;

    if (tipsEl) tipsEl.textContent = tips;
    if (discEl) discEl.textContent = disclaimer;

    if (tipsRow) tipsRow.classList.toggle("is-hidden", !tips);
    if (discRow) discRow.classList.toggle("is-hidden", !disclaimer);

    if (imgWrap) {
      imgWrap.classList.add("is-hidden");
      imgWrap.hidden = true;
      imgWrap.setAttribute("hidden", "");
    }

    if (imgEl) {
      const hideGuideImage = function () {
        imgEl.hidden = true;
        imgEl.setAttribute("hidden", "");
        imgEl.removeAttribute("src");

        if (imgWrap) {
          imgWrap.hidden = true;
          imgWrap.setAttribute("hidden", "");
          imgWrap.classList.add("is-hidden");
        }
      };

      const showGuideImage = function () {
        imgEl.hidden = false;
        imgEl.removeAttribute("hidden");

        if (imgWrap) {
          imgWrap.hidden = false;
          imgWrap.removeAttribute("hidden");
          imgWrap.classList.remove("is-hidden");
        }
      };

      imgEl.hidden = true;
      imgEl.setAttribute("hidden", "");
      imgEl.removeAttribute("src");

      if (imgUrl) {
        // Show the wrapper as soon as we have a valid image URL. If the image fails,
        // the error handler will hide it again.
        showGuideImage();

        imgEl.onload = showGuideImage;

        imgEl.onerror = function () {
          console.error("[LemonSize] image failed to load:", imgEl.src);
          hideGuideImage();
        };

        imgEl.src = imgUrl;
        imgEl.alt = title || guide.title || "How to measure size guide";

        // Cached images may already be available before onload fires.
        if (imgEl.complete && imgEl.naturalWidth > 0) {
          showGuideImage();
        }
      } else {
        hideGuideImage();
      }
    }
  }

  function renderStateCard(kind, title, message, options) {
    const note = options && options.note ? `<div class="lemon-size__stateNote">${escapeHtml(String(options.note))}</div>` : "";
    const actions =
      options && options.retry
        ? `<button type="button" class="lemon-size__stateBtn" data-lemon-retry>Try again</button>`
        : "";

    return `
      <div class="lemon-size__state lemon-size__state--${escapeHtml(kind)}">
        <div class="lemon-size__stateEyebrow">${kind === "error" ? "Unable to load" : "Size guide unavailable"}</div>
        <div class="lemon-size__stateTitle">${escapeHtml(title)}</div>
        <div class="lemon-size__stateText">${escapeHtml(message)}</div>
        ${note}
        ${actions ? `<div class="lemon-size__stateActions">${actions}</div>` : ""}
      </div>
    `;
  }

  async function loadAndRenderChart(modal, content, trigger) {
    content.innerHTML = `<div class="lemon-size__loading">Loading…</div>`;

    try {
      const data = await fetchChart(trigger);
      modal._lemonData = data;
      render(modal, content, data);
      return data;
    } catch (err) {
      console.error("[LemonSize] Fetch/render error:", err);
      const message =
        err && typeof err.message === "string" && err.message
          ? err.message
          : "Couldn’t load the size guide right now.";
      content.innerHTML = renderStateCard(
        "error",
        "We couldn’t open the size guide",
        message,
        {
          note: "Please try again in a moment. If this keeps happening, contact the store for sizing help.",
          retry: true,
        },
      );
      return null;
    }
  }

  function setMeasureExpanded(modal, expanded) {
    const toggleBtn = modal.querySelector("[data-lemon-measure-toggle]");
    const body = modal.querySelector("[data-lemon-measure-body]");
    if (!toggleBtn || !body) return;

    modal._lemonMeasureExpanded = expanded;
    body.hidden = !expanded;
    body.classList.toggle("is-hidden", !expanded);
    toggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
    toggleBtn.textContent = expanded ? "Hide guide" : "Show guide";
  }

  function render(modal, contentEl, data) {
    const chart = data && Object.prototype.hasOwnProperty.call(data, "chart") ? data.chart : null;

    if (!chart) {
      const message =
        (data && (data.message || data.error)) ||
        "No size chart is available for this product right now.";
      contentEl.innerHTML = renderStateCard(
        "empty",
        "No size guide for this product",
        String(message),
        {
          note: "You can still use the product details or contact the store if you need fit advice.",
        },
      );
      return;
    }

    const titleEl = modal.querySelector("[data-lemon-size-title]");
    if (titleEl) titleEl.textContent = chart.title || "Size guide";

    const baseUnit = String(chart.unit || "cm").toLowerCase();
    modal._lemonBaseUnit = baseUnit;
    modal._lemonMatchReason = chart.matchReason || "";

    const canToggle = isLengthUnit(baseUnit);
    if (!modal._lemonDisplayUnit || !canToggle) modal._lemonDisplayUnit = baseUnit;

    setUnitUI(modal, baseUnit, modal._lemonDisplayUnit);
    contentEl.innerHTML = renderTable(chart, modal._lemonDisplayUnit);
    renderGuide(modal, chart);
    if (typeof modal._lemonMeasureExpanded !== "boolean") {
      modal._lemonMeasureExpanded = true;
    }
    setMeasureExpanded(modal, modal._lemonMeasureExpanded);
  }

  function init() {
    document.querySelectorAll("[data-lemon-size-modal]").forEach((m) => (m.hidden = true));

    const roots = Array.from(document.querySelectorAll("[data-lemon-size-root]"));
    roots.forEach((root) => (root.hidden = true));

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

      modal._lemonTrigger = btn;

      try {
        const ok = await hasChartFor(btn);
        if (!ok) {
          root.remove();
          return;
        }
        root.hidden = false;
      } catch (e) {
        console.error("[LemonSize] hasChartFor failed:", e);
        root.remove();
        return;
      }

      mountModalToBody(modal);
      const productImg = btn.getAttribute("data-product-image") || "";
      if (img && productImg) img.src = productImg;

      const measureToggle = modal.querySelector("[data-lemon-measure-toggle]");
      if (measureToggle) {
        setMeasureExpanded(modal, true);
        measureToggle.addEventListener("click", () => {
          setMeasureExpanded(modal, !modal._lemonMeasureExpanded);
        });
      }

      content.addEventListener("click", (event) => {
        const retryBtn = event.target.closest("[data-lemon-retry]");
        if (!retryBtn) return;
        loadAndRenderChart(modal, content, btn);
      });

      modal.querySelectorAll("[data-lemon-unit]").forEach((unitBtn) => {
        unitBtn.addEventListener("click", () => {
          const u = (unitBtn.getAttribute("data-lemon-unit") || "").toLowerCase();
          if (!u) return;

          const base = modal._lemonBaseUnit || "cm";
          if (!isLengthUnit(base)) return;
          if (!isLengthUnit(u)) return;

          modal._lemonDisplayUnit = u;
          setUnitUI(modal, base, u);

          if (modal._lemonData) render(modal, content, modal._lemonData);
        });
      });

      btn.addEventListener("click", async () => {
        openModal(modal, btn);

        if (modal._lemonData) {
          render(modal, content, modal._lemonData);
          trackChartView(btn, modal._lemonData);
          return;
        }

        const data = await loadAndRenderChart(modal, content, btn);
        if (data) trackChartView(btn, data);
      });

      modal.addEventListener("click", (e) => {
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
