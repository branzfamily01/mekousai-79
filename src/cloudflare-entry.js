import galleryApi from './gallery-r2.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isApi = url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/');

    if (isApi) return galleryApi.fetch(request, env, ctx);
    return env.ASSETS.fetch(request);
  }
};
