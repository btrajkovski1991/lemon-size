export default function AdditionalPage() {
  return (
    <s-page heading="Help" inlineSize="large">
      <s-section heading="Support">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(120px, 180px) minmax(0, 1fr)",
            gap: 18,
            alignItems: "center",
            padding: 16,
            borderRadius: 16,
            border: "1px solid #e7e7e7",
            background: "white",
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 14,
              border: "1px solid #f0f0f0",
              background: "#fafafa",
              display: "grid",
              placeItems: "center",
            }}
          >
            <img
              src="/images/lemondev-logo-black.svg"
              alt="Lemon Dev"
              style={{ width: "100%", maxWidth: 140, height: "auto", display: "block" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 18, fontWeight: 850 }}>Need help with Lemon Size?</div>
            <div style={{ fontSize: 14, opacity: 0.76, marginTop: 8, lineHeight: 1.55 }}>
              For merchant support, setup questions, or storefront issues, contact us at{" "}
              <a href="mailto:hello@lemon.dev">hello@lemon.dev</a>.
            </div>
          </div>
        </div>
      </s-section>

      <s-section heading="Theme Setup">
        <s-paragraph>
          Lemon Size renders on the storefront through a theme app extension. After creating charts
          and assignments, open the theme customizer, go to a product template, and enable the Lemon
          Size block.
        </s-paragraph>
        <s-paragraph>If the size guide button does not appear, check these items first:</s-paragraph>
        <s-unordered-list>
          <s-list-item>The app block is enabled on the product template.</s-list-item>
          <s-list-item>The product matches an assignment or fallback rule.</s-list-item>
          <s-list-item>The selected size chart has valid rows and columns.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Recommended Merchant Flow">
        <s-unordered-list>
          <s-list-item>Create the chart first and confirm the unit is correct.</s-list-item>
          <s-list-item>Add a direct assignment for the first products you want to test.</s-list-item>
          <s-list-item>Add the Lemon Size block to the product template in Online Store.</s-list-item>
          <s-list-item>Open a real product page and verify the chart, guide text, and guide image.</s-list-item>
          <s-list-item>Add keyword rules only after direct matching is working.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Starter Tables Included On Fresh Install">
        <s-paragraph>
          Lemon Size now creates a built-in starter chart library automatically for a new install or
          reinstall when the shop has no saved charts yet. These are real starter tables, not just
          suggestions.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Tops (product)</s-list-item>
          <s-list-item>Bottoms</s-list-item>
          <s-list-item>Blazer</s-list-item>
          <s-list-item>Jacket</s-list-item>
          <s-list-item>Dress</s-list-item>
          <s-list-item>Bikini</s-list-item>
          <s-list-item>Bra</s-list-item>
          <s-list-item>Brief</s-list-item>
          <s-list-item>Shoes</s-list-item>
          <s-list-item>Socks</s-list-item>
          <s-list-item>Headwear</s-list-item>
          <s-list-item>Ring Size</s-list-item>
          <s-list-item>Necklace Size</s-list-item>
          <s-list-item>Bracelet Size</s-list-item>
        </s-unordered-list>
        <s-paragraph>
          Built-in fallback keyword rules are also added automatically for these fashion categories
          so the app works faster on first setup.
        </s-paragraph>
      </s-section>

      <s-section heading="Troubleshooting">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ padding: 14, border: "1px solid #e7e7e7", borderRadius: 12, background: "white" }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>The button does not show</div>
            <div style={{ fontSize: 13, opacity: 0.76, marginTop: 6 }}>
              Check that the app block is enabled and that the product resolves to a size chart.
            </div>
          </div>
          <div style={{ padding: 14, border: "1px solid #e7e7e7", borderRadius: 12, background: "white" }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>The wrong chart shows</div>
            <div style={{ fontSize: 13, opacity: 0.76, marginTop: 6 }}>
              Review direct assignments first. They take priority over keyword fallback rules.
            </div>
          </div>
          <div style={{ padding: 14, border: "1px solid #e7e7e7", borderRadius: 12, background: "white" }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>The guide image does not appear</div>
            <div style={{ fontSize: 13, opacity: 0.76, marginTop: 6 }}>
              Make sure the chart has a guide image URL saved and that Display guide image on storefront is checked.
            </div>
          </div>
        </div>
      </s-section>

      <s-section heading="Merchant Checklist">
        <s-unordered-list>
          <s-list-item>Create at least one chart.</s-list-item>
          <s-list-item>Mark a default chart if you want a global fallback.</s-list-item>
          <s-list-item>Add direct assignments before relying on keyword rules.</s-list-item>
          <s-list-item>Preview several products before publishing the theme.</s-list-item>
        </s-unordered-list>
      </s-section>


      <s-section heading="App Store Readiness">
        <s-paragraph>
          A strict review checklist is available in <code>APP_STORE_READY_CHECKLIST.md</code> in the
          project root.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/launch/shopify-app-store/app-store-requirements"
              target="_blank"
            >
              Shopify App Store requirements
            </s-link>
          </s-list-item>
          <s-list-item>
            <s-link
              href="https://shopify.dev/docs/apps/launch/app-store-review/pass-app-review"
              target="_blank"
            >
              Pass app review
            </s-link>
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
