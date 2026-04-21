import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const { errors } = actionData || loaderData;
  const installMessage =
    "Install Lemon Size from the Shopify Admin or the Shopify App Store. For security and App Store compliance, this page doesn't support manual shop-domain entry.";
  const detailMessage = errors.shop
    ? `${installMessage} ${errors.shop}`
    : installMessage;

  return (
    <AppProvider embedded={false}>
      <s-page>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <img
            src="/images/lemon-size-mark.svg"
            alt="Lemon Size"
            style={{ width: 64, height: "auto", display: "block" }}
          />
        </div>
        <s-section heading="Install from Shopify">
          <s-paragraph>{detailMessage}</s-paragraph>
          <s-paragraph>
            If you already installed the app and were redirected here unexpectedly,
            reopen Lemon Size from your store's Apps list.
          </s-paragraph>
          <s-paragraph>
            Need help? Contact <a href="mailto:hello@lemon.dev">hello@lemon.dev</a>.
          </s-paragraph>
        </s-section>
      </s-page>
    </AppProvider>
  );
}
