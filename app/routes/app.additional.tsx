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
              src="/images/lemon-size-mark.svg"
              alt="Lemon Size"
              style={{ width: "100%", maxWidth: 96, height: "auto", display: "block" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 18, fontWeight: 850 }}>Need help with Lemon Size?</div>
            <div style={{ fontSize: 14, opacity: 0.76, marginTop: 8, lineHeight: 1.55 }}>
              For setup questions, storefront troubleshooting, or merchant support, contact us at{" "}
              <a href="mailto:hello@lemon.dev">hello@lemon.dev</a>.
            </div>
          </div>
        </div>
      </s-section>

      <s-section heading="Theme Setup">
        <s-paragraph>
          Lemon Size appears on the storefront through a theme app extension. After you create charts
          and assignments, open the theme customizer, go to a product template, and add the Lemon
          Size app block.
        </s-paragraph>
        <s-paragraph>If the size guide button does not appear, check these items first:</s-paragraph>
        <s-unordered-list>
          <s-list-item>The Lemon Size app block is enabled on the product template.</s-list-item>
          <s-list-item>The product matches an assignment or fallback rule.</s-list-item>
          <s-list-item>The selected size chart has valid rows and columns.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Recommended Merchant Flow">
        <s-unordered-list>
          <s-list-item>Create the first chart and confirm the base unit is correct.</s-list-item>
          <s-list-item>Add a direct assignment to the first products you want to test.</s-list-item>
          <s-list-item>Add the Lemon Size app block to the product template in Online Store.</s-list-item>
          <s-list-item>Open a real product page and verify the chart, guide text, and guide image.</s-list-item>
          <s-list-item>Add keyword rules only after direct matching is working correctly.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Starter Tables Included On Fresh Install">
        <s-paragraph>
          Lemon Size automatically creates a starter chart library for a new install or reinstall
          when the shop has no saved charts yet. These are real starter tables, not placeholder
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
          Built-in fallback keyword rules are also added automatically for these categories so the
          app is easier to test during first setup.
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
              Make sure the chart has a guide image URL saved and that Display guide image on storefront is enabled.
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
    </s-page>
  );
}
