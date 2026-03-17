(function () {
  if (window.__LEMON_SIZE_INIT__) return;
  window.__LEMON_SIZE_INIT__ = true;

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

  function getGuideBase(trigger) {
    return trigger.getAttribute("data-guides-base") || "https://lemon-size.vercel.app";
  }

  function getGuideImage(trigger, chartTitle) {
    const base = getGuideBase(trigger);

    const map = {
      tops: `${base}/images/size-guides/tops.png`,
      bottoms: `${base}/images/size-guides/bottoms.png`,
      dress: `${base}/images/size-guides/dress.png`,
      bra: `${base}/images/size-guides/bra.png`,
      shoes: `${base}/images/size-guides/shoes.png`,
      ring: `${base}/images/size-guides/ring.png`,
      bracelet: `${base}/images/size-guides/bracelet.png`,
      necklace: `${base}/images/size-guides/necklace.png`,
      headwear: `${base}/images/size-guides/headwear.png`,
      "pet clothing": `${base}/images/size-guides/pet-clothing.png`,
      "pet collar": `${base}/images/size-guides/pet-collar.png`,
    };

    const key = String(chartTitle || "").toLowerCase();

    for (const k in map) {
      if (key.includes(k)) return map[k];
    }

    return `${base}/images/size-guides/default.png`;
  }

  function normalizeGuideImageUrl(trigger, rawUrl) {
    if (!rawUrl || !String(rawUrl).trim()) return "";

    const clean = String(rawUrl).trim();

    if (/^https?:\/\//i.test(clean)) return clean;

    if (clean.startsWith("//")) {
      return window.location.protocol + clean;
    }

    if (clean.startsWith("/")) {
      return `${window.location.origin}${clean}`;
    }

    return clean;
  }

  function buildProxyUrl(trigger, mode, options) {
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

    if (options && options.heightCm) url.searchParams.set("height_cm", String(options.heightCm));
    if (options && options.weightKg) url.searchParams.set("weight_kg", String(options.weightKg));

    return url;
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

  async function fetchChart(trigger, options) {
    const url = buildProxyUrl(trigger, null, options);
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

  function convertNumber(n, fromUnit, toUnit) {
    if (fromUnit === "cm" && toUnit === "in") return n / 2.54;
    if (fromUnit === "in" && toUnit === "cm") return n * 2.54;
    return n;
  }

  function fmt(n, unit) {
    if (unit === "in") return n.toFixed(2).replace(/\.00$/, "");
    if (unit === "cm") return n.toFixed(1).replace(/\.0$/, "");
    return String(n);
  }

  function shouldConvertColumn(colName) {
    const c = String(colName || "").toUpperCase();

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
    if (subEl) subEl.textContent = `Units: ${String(displayUnit).toUpperCase()}`;

    const unitWrap = modal.querySelector(".lemon-size__unit");
    const canToggle = baseUnit === "cm" || baseUnit === "in";
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

    const head = cols.map((c) => `<th>${escapeHtml(String(c))}</th>`).join("");

    const body = rows
      .map((r) => {
        const cells = cols
          .map((c) => {
            let raw =
              r && r.values && r.values[c] != null
                ? r.values[c]
                : String(c).toUpperCase().includes("SIZE")
                  ? r && r.label
                  : "";

            if (
              (baseUnit === "cm" || baseUnit === "in") &&
              (displayUnit === "cm" || displayUnit === "in") &&
              baseUnit !== displayUnit &&
              shouldConvertColumn(c)
            ) {
              const n = toNumMaybe(raw);
              if (n != null) raw = fmt(convertNumber(n, baseUnit, displayUnit), displayUnit);
            }

            return `<td>${escapeHtml(String(raw ?? ""))}</td>`;
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

  function renderRecommendation(modal, recommendation) {
    const box = modal.querySelector("[data-lemon-recommend-box]");
    if (!box) return;

    if (!recommendation || !recommendation.size) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }

    box.hidden = false;
    box.innerHTML = `
      <div class="lemon-size__recommendCard">
        <div class="lemon-size__recommendBadge">Recommended size</div>
        <div class="lemon-size__recommendSize">${escapeHtml(recommendation.size)}</div>
        <div class="lemon-size__recommendText">${escapeHtml(recommendation.message || "")}</div>
        <div class="lemon-size__recommendMeta">
          Confidence: ${escapeHtml(recommendation.confidence || "Low")}
          <span>•</span>
          Sample: ${escapeHtml(String(recommendation.sampleSize || 0))}
        </div>
      </div>
    `;
  }

  function renderGuide(modal, chart) {
    const guide = chart || {};
    const fallback = defaultGuideFor(guide.title);
    const trigger = modal._lemonTrigger || null;

    const title = guide.guideTitle || fallback.guideTitle || "How to measure";
    const text = guide.guideText || fallback.guideText || "";
    const tips = guide.tips || "";
    const disclaimer = guide.disclaimer || "";

   const showGuideImageFlag =
  guide.showGuideImage === true ||
  String(guide.showGuideImage).toLowerCase() === "true" ||
  (guide.showGuideImage == null && !!guide.guideImage);

    let imgUrl = "";
    if (showGuideImageFlag && trigger) {
      imgUrl = normalizeGuideImageUrl(trigger, guide.guideImage);
    }

    console.log("[LemonSize] full guide object:", guide);
    console.log("[LemonSize] guide.showGuideImage:", guide.showGuideImage);
    console.log("[LemonSize] guide.guideImage:", guide.guideImage);
    console.log("[LemonSize] showGuideImageFlag:", showGuideImageFlag);
    console.log("[LemonSize] final imgUrl:", imgUrl);

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
      imgEl.hidden = true;
      imgEl.setAttribute("hidden", "");
      imgEl.removeAttribute("src");

      if (imgUrl) {
        imgEl.onload = function () {
          imgEl.hidden = false;
          imgEl.removeAttribute("hidden");

          if (imgWrap) {
            imgWrap.hidden = false;
            imgWrap.removeAttribute("hidden");
            imgWrap.classList.remove("is-hidden");
          }
        };

        imgEl.onerror = function () {
          console.error("[LemonSize] image failed to load:", imgEl.src);

          imgEl.hidden = true;
          imgEl.setAttribute("hidden", "");
          imgEl.removeAttribute("src");

          if (imgWrap) {
            imgWrap.hidden = true;
            imgWrap.setAttribute("hidden", "");
            imgWrap.classList.add("is-hidden");
          }
        };

        imgEl.src = imgUrl;
        imgEl.alt = title || guide.title || "How to measure size guide";
      }
    }
  }

  function render(modal, contentEl, data) {
    const chart = data && Object.prototype.hasOwnProperty.call(data, "chart") ? data.chart : null;

    if (!chart) {
      contentEl.innerHTML = `<div class="lemon-size__empty">No size chart configured.</div>`;
      renderRecommendation(modal, null);
      return;
    }

    const titleEl = modal.querySelector("[data-lemon-size-title]");
    if (titleEl) titleEl.textContent = chart.title || "Size guide";

    const baseUnit = String(chart.unit || "cm").toLowerCase();
    modal._lemonBaseUnit = baseUnit;

    const canToggle = baseUnit === "cm" || baseUnit === "in";
    if (!modal._lemonDisplayUnit || !canToggle) modal._lemonDisplayUnit = baseUnit;

    setUnitUI(modal, baseUnit, modal._lemonDisplayUnit);
    contentEl.innerHTML = renderTable(chart, modal._lemonDisplayUnit);
    renderGuide(modal, chart);
    renderRecommendation(modal, data.recommendation || null);
  }

  async function runRecommendation(modal, btn, content) {
    const hEl = modal.querySelector("[data-lemon-height]");
    const wEl = modal.querySelector("[data-lemon-weight]");
    const heightCm = hEl ? Number(hEl.value || "") : null;
    const weightKg = wEl ? Number(wEl.value || "") : null;

    if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
      const box = modal.querySelector("[data-lemon-recommend-box]");
      if (box) {
        box.hidden = false;
        box.innerHTML = `
          <div class="lemon-size__recommendError">
            Please enter both height and weight.
          </div>
        `;
      }
      return;
    }

    const recBtn = modal.querySelector("[data-lemon-recommend-btn]");
    if (recBtn) {
      recBtn.disabled = true;
      recBtn.textContent = "Checking…";
    }

    try {
      const data = await fetchChart(btn, { heightCm, weightKg });
      console.log("[LemonSize] fetched recommendation chart data:", data);
      modal._lemonData = data;
      render(modal, content, data);
    } catch (error) {
      console.error("[LemonSize] recommendation error:", error);
      const box = modal.querySelector("[data-lemon-recommend-box]");
      if (box) {
        box.hidden = false;
        box.innerHTML = `
          <div class="lemon-size__recommendError">
            Couldn’t calculate recommendation right now.
          </div>
        `;
      }
    } finally {
      if (recBtn) {
        recBtn.disabled = false;
        recBtn.textContent = "Recommend size";
      }
    }
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
      const recommendBtn = root.querySelector("[data-lemon-recommend-btn]");

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

      const productImg = btn.getAttribute("data-product-image") || "";
      if (img && productImg) img.src = productImg;

      modal.querySelectorAll("[data-lemon-unit]").forEach((unitBtn) => {
        unitBtn.addEventListener("click", () => {
          const u = (unitBtn.getAttribute("data-lemon-unit") || "").toLowerCase();
          if (!u) return;

          const base = modal._lemonBaseUnit || "cm";
          if (!(base === "cm" || base === "in")) return;
          if (!(u === "cm" || u === "in")) return;

          modal._lemonDisplayUnit = u;
          setUnitUI(modal, base, u);

          if (modal._lemonData) render(modal, content, modal._lemonData);
        });
      });

      btn.addEventListener("click", async () => {
        openModal(modal, btn);

        if (modal._lemonData) {
          render(modal, content, modal._lemonData);
          return;
        }

        content.innerHTML = `<div class="lemon-size__loading">Loading…</div>`;

        try {
          const data = await fetchChart(btn);
          console.log("[LemonSize] fetched chart data:", data);
          modal._lemonData = data;
          render(modal, content, data);
        } catch (err) {
          console.error("[LemonSize] Fetch/render error:", err);
          content.innerHTML = `<div class="lemon-size__error">Couldn’t load size chart.</div>`;
        }
      });

      if (recommendBtn) {
        recommendBtn.addEventListener("click", () => {
          runRecommendation(modal, btn, content);
        });
      }

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