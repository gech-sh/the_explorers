import { handleApi } from "../backend/api";

export default {
  async fetch(request: Request, env: { ASSETS: { fetch(request: Request): Promise<Response> } }) {
    const path = new URL(request.url).pathname;
    if (path === "/api/v1" || path.startsWith("/api/v1/")) return handleApi(request);
    return env.ASSETS.fetch(request);
  },
};
