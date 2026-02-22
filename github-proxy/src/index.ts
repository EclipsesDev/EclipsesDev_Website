export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const response = await fetch(
      "https://api.github.com/repos/EclipsesDev/ECLIPSES_API/contents/changelog.txt",
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.raw",
          "User-Agent": "Cloudflare-Worker",
        },
      }
    );

    return new Response(await response.text(), {
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "https://eclipsesdev.my.id",
        "Access-Control-Allow-Credentials": "true"
      },
    });
  },
};