export default {
  async fetch(request, env, ctx): Promise<Response> {
    return Response.json({ ok: true, path: new URL(request.url).pathname });
  },
} satisfies ExportedHandler<Env>;
