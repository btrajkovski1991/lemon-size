export default function AdditionalPage() {
  return (
    <s-page heading="Help">
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

      <s-section heading="Merchant Checklist">
        <s-unordered-list>
          <s-list-item>Create at least one chart.</s-list-item>
          <s-list-item>Mark a default chart if you want a global fallback.</s-list-item>
          <s-list-item>Add direct assignments before relying on keyword rules.</s-list-item>
          <s-list-item>Preview several products before publishing the theme.</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section slot="aside" heading="Navigation">
        <s-unordered-list>
          <s-list-item>
            <s-link href="/app/size-charts">Manage size charts</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/assignments">Manage assignments</s-link>
          </s-list-item>
          <s-list-item>
            <s-link href="/app/keyword-rules">Manage keyword rules</s-link>
          </s-list-item>
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
