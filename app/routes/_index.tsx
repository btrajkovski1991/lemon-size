import { redirect } from "react-router";

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  // Keep shop param if present
  const shop = url.searchParams.get("shop");
  const to = shop ? `/app?shop=${encodeURIComponent(shop)}` : "/app";

  return redirect(to);
}

export default function Index() {
  return null;
}