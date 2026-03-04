import { redirect } from "@remix-run/node";

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  const shop = url.searchParams.get("shop");
  const to = shop ? `/app?shop=${encodeURIComponent(shop)}` : "/app";

  return redirect(to);
}

export default function Index() {
  return null;
}