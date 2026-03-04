export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  const shop = url.searchParams.get("shop");
  const to = shop ? `/app?shop=${encodeURIComponent(shop)}` : "/app";

  return new Response(null, {
    status: 302,
    headers: {
      Location: to,
    },
  });
}

export default function Index() {
  return null;
}