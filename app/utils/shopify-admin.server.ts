type GraphqlErrorLike = {
  message?: string;
  extensions?: {
    code?: string;
  };
};

function summarizeGraphqlErrors(errors: GraphqlErrorLike[]) {
  return errors
    .map((error) => {
      const code = error?.extensions?.code ? `[${error.extensions.code}] ` : "";
      return `${code}${error?.message || "Unknown GraphQL error"}`;
    })
    .join("; ");
}

export async function parseAdminGraphqlResponse<T>(
  response: Response,
  operationName: string,
): Promise<T> {
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    throw new Error(`${operationName} returned a non-JSON response from Shopify.`);
  }

  if (!response.ok) {
    const graphqlErrors = Array.isArray(payload?.errors) ? payload.errors : [];
    const details = graphqlErrors.length
      ? summarizeGraphqlErrors(graphqlErrors)
      : payload?.message || `HTTP ${response.status}`;
    throw new Error(`${operationName} failed: ${details}`);
  }

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(`${operationName} failed: ${summarizeGraphqlErrors(payload.errors)}`);
  }

  if (!payload?.data) {
    throw new Error(`${operationName} returned no data.`);
  }

  return payload.data as T;
}
