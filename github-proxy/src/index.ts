export default {
  async fetch(request: Request, env: any): Promise<Response> {
    try {
      const response = await fetch(
        "https://api.github.com/repos/EclipsesDev/ECLIPSES_API/contents/changelog.txt",
        {
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        console.log("GitHub fetch failed:", response.status, text);
        return new Response("Failed to fetch changelog", { status: 500 });
      }

      const text = await response.text();
      return new Response(text, {
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      console.log("Worker error:", err);
      return new Response("Failed to fetch changelog", { status: 500 });
    }
  },
};