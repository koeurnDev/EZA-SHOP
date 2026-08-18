export async function onRequest(context) {
  const url = new URL(context.request.url);
  
  // Reconstruct the target URL
  const targetUrl = new URL(
    url.pathname + url.search, 
    'https://vibe-lifestyle-api.koeurnseab630.workers.dev'
  );

  const modifiedRequest = new Request(targetUrl.toString(), {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
    redirect: 'manual'
  });

  return fetch(modifiedRequest);
}
