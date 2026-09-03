import galleryApi from '../cloudflare/gallery-worker/src/index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/');

    if (isApi) {
      // The existing gallery API was originally designed for a separate Worker.
      // In the unified deployment, the editor and API share the same origin.
      // Remove Origin only for truly same-origin requests so its legacy CORS guard
      // does not reject legitimate editor requests. Cross-origin requests keep the
      // header and continue to be rejected by the API's existing checks.
      const origin = request.headers.get('Origin');
      if (origin && origin === url.origin) {
        const headers = new Headers(request.headers);
        headers.delete('Origin');
        request = new Request(request, { headers });
      }
      return galleryApi.fetch(request, env, ctx);
    }

    return env.ASSETS.fetch(request);
  }
};
