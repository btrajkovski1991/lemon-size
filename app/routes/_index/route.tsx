import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import styles from "./styles.module.css";

const features = [
  {
    title: "Reusable size tables",
    description:
      "Create clothing, footwear, ring, necklace, bracelet, and custom size guides with columns, rows, guide notes, and optional visual references.",
  },
  {
    title: "Flexible matching rules",
    description:
      "Assign size guides by product, collection, product type, vendor, tag, keyword fallback, or a default chart for broad catalog coverage.",
  },
  {
    title: "Storefront guidance",
    description:
      "Display a size-guide modal on Shopify product pages so shoppers can review measurements without leaving the product they are considering.",
  },
  {
    title: "Unit switching",
    description:
      "Support measurement-based tables in cm, mm, and inches, with storefront conversion for supported measurement columns.",
  },
  {
    title: "Import and duplication",
    description:
      "Speed up setup with CSV or pasted-table import, quick templates, and table duplication for similar product families.",
  },
  {
    title: "Usage analytics",
    description:
      "Track size-guide opens, popular tables, active products, and recent storefront usage to understand how shoppers interact with sizing help.",
  },
];

const appAreas = [
  "Home: onboarding checklist, matched-chart preview, and rule conflict visibility.",
  "Assignments: direct matching rules for product and catalog-based targeting.",
  "Keyword rules: fallback matching based on product content when direct rules do not apply.",
  "Rule tester: manual simulation for titles, vendors, tags, collections, and product details.",
  "Size tables: the editor for charts, guide text, guide images, templates, duplication, and imports.",
  "Analytics: recent activity, table usage, product usage, and trend reporting.",
  "Help: setup reminders, troubleshooting context, and support details.",
];

const setupSteps = [
  "Install Lemon Size on your Shopify store.",
  "Create one or more size tables in Size tables.",
  "Add direct assignment rules in Assignments.",
  "Use keyword rules only when you need broader fallback matching.",
  "Open Online Store, then Themes, then Customize.",
  "Add the Lemon Size app block to the product template.",
  "Open a storefront product page and confirm the size guide loads correctly.",
];

const matchingOrder = [
  "Direct product assignment",
  "Collection assignment",
  "Product type assignment",
  "Vendor assignment",
  "Tag assignment",
  "Keyword rule fallback",
  "Default size chart",
];

const faqItems = [
  {
    question: "Does Lemon Size use Shopify App Embeds?",
    answer:
      "No. Lemon Size currently uses an app block on the product template, so merchants should enable it from the theme customizer on product pages.",
  },
  {
    question: "Can shoppers switch units on the storefront?",
    answer:
      "Yes. Lemon Size supports size tables based on cm, mm, and inches, and shoppers can switch between supported storefront units when the table uses recognized measurement columns.",
  },
  {
    question: "Can one size table be reused across many products?",
    answer:
      "Yes. The same table can be reused across multiple assignment rules, which is especially useful for collections, vendors, and product types that share the same fit guidance.",
  },
  {
    question: "Do merchants always need keyword rules?",
    answer:
      "No. Best practice is to use direct assignments first and keep keyword rules as a fallback for broader catalog matching.",
  },
  {
    question: "What happens if unit conversion looks wrong?",
    answer:
      "The saved base unit must match the real values entered in the chart. If a table is entered in cm, for example, the chart should also be saved as cm or storefront conversion will be incorrect.",
  },
  {
    question: "What support contact is available?",
    answer: "Merchants can contact hello@lemon.dev for support.",
  },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/app?${url.searchParams.toString()}`,
      },
    });
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.brandRow}>
            <img
              className={styles.logo}
              src="/images/lemondev-logo-black.svg"
              alt="Lemon.dev"
            />
            <span className={styles.badge}>Shopify Size Guide App</span>
          </div>

          <h1 className={styles.title}>Lemon Size documentation</h1>
          <p className={styles.lead}>
            Lemon Size helps Shopify merchants create reusable size tables,
            match them to products, and show a storefront size-guide modal so
            shoppers can choose the right fit with more confidence.
          </p>

          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#getting-started">
              Read setup guide
            </a>
            <a className={styles.secondaryAction} href="#faq">
              View FAQ
            </a>
          </div>
        </div>

        {showForm && (
          <aside className={styles.loginCard}>
            <h2 className={styles.cardTitle}>Open your store app</h2>
            <p className={styles.cardText}>
              Enter your Shopify shop domain to sign in and manage your size
              guides.
            </p>

            <Form className={styles.form} method="post" action="/auth/login">
              <label className={styles.label}>
                <span>Shop domain</span>
                <input
                  className={styles.input}
                  type="text"
                  name="shop"
                  placeholder="your-store.myshopify.com"
                />
                <span className={styles.hint}>
                  Example: lemon-demo-store.myshopify.com
                </span>
              </label>
              <button className={styles.button} type="submit">
                Log in
              </button>
            </Form>
          </aside>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>What it does</p>
          <h2 className={styles.sectionTitle}>Built for clearer sizing across the storefront</h2>
          <p className={styles.sectionText}>
            Lemon Size is designed for merchants who need more control than a
            simple text block. It centralizes size data, connects each guide to
            the right products, and keeps sizing help close to the buy decision.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureText}>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoColumn}>
          <article className={styles.panel}>
            <p className={styles.eyebrow}>Inside the app</p>
            <h2 className={styles.sectionTitle}>Main app areas</h2>
            <ul className={styles.detailList}>
              {appAreas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={styles.panel}>
            <p className={styles.eyebrow}>Matching logic</p>
            <h2 className={styles.sectionTitle}>How chart resolution works</h2>
            <p className={styles.sectionText}>
              When more than one rule could apply, Lemon Size checks size charts
              in this order. Inside the same rule type, lower priority values
              win first.
            </p>
            <ol className={styles.numberList}>
              {matchingOrder.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
        </div>
      </section>

      <section id="getting-started" className={styles.section}>
        <div className={styles.twoColumn}>
          <article className={styles.panel}>
            <p className={styles.eyebrow}>Getting started</p>
            <h2 className={styles.sectionTitle}>Basic setup flow</h2>
            <ol className={styles.numberList}>
              {setupSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className={styles.panelAccent}>
            <p className={styles.eyebrow}>Important note</p>
            <h2 className={styles.sectionTitle}>Theme setup</h2>
            <p className={styles.sectionText}>
              Lemon Size currently appears as a product-template app block.
              Merchants should look for it in the theme customizer rather than
              in Shopify App Embeds.
            </p>
            <p className={styles.sectionText}>
              First storefront tests should confirm that the button appears, the
              correct chart opens, guide images display when enabled, and unit
              switching behaves as expected.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.twoColumn}>
          <article className={styles.panel}>
            <p className={styles.eyebrow}>Size table guidance</p>
            <h2 className={styles.sectionTitle}>Recommended chart structure</h2>
            <p className={styles.sectionText}>
              Most tables work best with one identifying column such as
              <strong> SIZE</strong>, <strong> RING SIZE</strong>, or
              <strong> FIT</strong>, followed by one or more measurement
              columns.
            </p>
            <ul className={styles.detailList}>
              <li>Clothing: size, chest, waist, hip, length.</li>
              <li>Shoes: size and foot length.</li>
              <li>Rings: ring size, diameter, circumference.</li>
              <li>Necklaces: style, necklace length, drop length, thickness.</li>
              <li>Bracelets: fit, wrist, bracelet length, width.</li>
            </ul>
          </article>

          <article className={styles.panel}>
            <p className={styles.eyebrow}>Units</p>
            <h2 className={styles.sectionTitle}>Measurement support</h2>
            <p className={styles.sectionText}>
              Lemon Size supports base units in <strong>cm</strong>,
              <strong> mm</strong>, and <strong> in</strong>. Storefront
              switching supports MM, CM, and INCHES when measurement-style
              columns are named clearly.
            </p>
            <ul className={styles.detailList}>
              <li>1 inch = 2.54 cm</li>
              <li>1 cm = 10 mm</li>
              <li>1 inch = 25.4 mm</li>
              <li>Always save the chart with the same base unit used in the entered values.</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="faq" className={styles.section}>
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>FAQ</p>
          <h2 className={styles.sectionTitle}>Questions clients usually ask first</h2>
        </div>

        <div className={styles.faqList}>
          {faqItems.map((item) => (
            <article key={item.question} className={styles.faqItem}>
              <h3 className={styles.faqQuestion}>{item.question}</h3>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <article className={styles.supportPanel}>
          <p className={styles.eyebrow}>Support</p>
          <h2 className={styles.sectionTitle}>Need help before or after installation?</h2>
          <p className={styles.sectionText}>
            Lemon Size is documented for setup, matching logic, and storefront
            behavior. For merchant support, installation questions, or
            troubleshooting, contact <a href="mailto:hello@lemon.dev">hello@lemon.dev</a>.
          </p>
        </article>
      </section>
    </main>
  );
}
