/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

// The site now lives at the root of nfse.titanbackoffice.com.br. The old
// domain and the old /nfs-prefixed paths are permanently retired; both are
// redirected here so nothing (bookmarks, emails already sent, search
// engines) is left pointing at a dead URL.
const LEGACY_HOSTS = new Set(["titanbackoffice.com.br", "www.titanbackoffice.com.br"]);
const CANONICAL_ORIGIN = "https://nfse.titanbackoffice.com.br";

function mapLegacyPath(pathname: string): string {
  if (pathname === "/index.html") return "/";
  const match = pathname.match(/^\/nfs(\/.*)?$/i);
  if (!match) return pathname;
  const rest = (match[1] || "").replace(/^\//, "");
  if (!rest) return "/";
  const segment = rest.split("/")[0].toLowerCase();
  if (segment === "admin" || segment === "adm") return "/admin";
  if (segment === "ajuda") return "/martyn_ia";
  if (segment === "entrar") return "/entrar";
  if (segment === "primeiro-acesso" || segment === "primeiroacesso") return "/primeiro-acesso";
  if (segment === "redefinir-senha" || segment === "redefinirsenha") return "/redefinir-senha";
  if (/^\d{14}$/.test(segment)) return "/dashboard";
  return "/";
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Any request on the retired domain moves to the canonical one, with the
    // old /nfs-prefixed path translated to its new root-level equivalent.
    if (LEGACY_HOSTS.has(url.hostname)) {
      const target = new URL(CANONICAL_ORIGIN);
      target.pathname = mapLegacyPath(url.pathname);
      target.search = url.search;
      return Response.redirect(target.toString(), 301);
    }

    // A stray /nfs/* link (or /index.html) on the canonical domain itself
    // also gets folded into the new root-level path.
    if (url.pathname === "/index.html" || /^\/nfs(\/|$)/i.test(url.pathname)) {
      const target = new URL(request.url);
      target.pathname = mapLegacyPath(url.pathname);
      return Response.redirect(target.toString(), 301);
    }

    // Next.js route matching is case-sensitive; a visitor typing /FAQ (or any
    // other casing) would otherwise 404 on a page that does exist at /faq.
    if (url.pathname !== "/faq" && url.pathname.toLowerCase() === "/faq") {
      const target = new URL(request.url);
      target.pathname = "/faq";
      return Response.redirect(target.toString(), 301);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(response);
  },
};

// Cabeçalhos básicos contra clickjacking cross-site e MIME-sniffing. SAMEORIGIN
// (não DENY): a própria página raiz embute /titan.html e /nfs.html num iframe
// same-origin — DENY bloquearia o app inteiro de carregar. Sem CSP: o app usa
// handlers inline (onclick=...) em toda a página, então uma CSP sem
// 'unsafe-inline' quebraria a emissão inteira — fica de fora até uma
// revisão dedicada disso.
function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default worker;
