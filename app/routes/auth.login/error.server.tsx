import type { LoginError } from "@shopify/shopify-app-react-router/server";
import { LoginErrorType } from "@shopify/shopify-app-react-router/server";

interface LoginErrorMessage {
  shop?: string;
}

export function loginErrorMessage(loginErrors: LoginError): LoginErrorMessage {
  if (loginErrors?.shop === LoginErrorType.MissingShop) {
    return { shop: "Open Lemon Size from Shopify Admin to authenticate." };
  } else if (loginErrors?.shop === LoginErrorType.InvalidShop) {
    return { shop: "This authentication link is invalid. Reopen Lemon Size from Shopify Admin." };
  }

  return {};
}
