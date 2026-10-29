export default {
  async fetch(request, env) {
    return await env.BOARDGAME_ORIGIN.fetch(request);
  }
};
