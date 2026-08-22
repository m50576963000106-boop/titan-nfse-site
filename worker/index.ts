/** Cloudflare Worker entry point for the vinext-starter template. */
/// <reference types="@cloudflare/workers-types" />
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

// A API (titan-nfse-api, no Render) manda ao cliente, pelo WhatsApp, o link para
// baixar o XML/ZIP de uma nota emitida ou cancelada. Esse link precisa abrir no
// domínio oficial — um endereço "onrender.com" cru no WhatsApp do cliente não
// passa confiança nenhuma. Este worker só faz o proxy dos caminhos exatos de
// download (não a API inteira: o resto do site já chama a API direto por
// TITAN_API_URL, ver public/config.js), então o link sai com a cara do site mas
// o arquivo em si continua vindo do backend de verdade.
//
// /n/ é o link curto atual (código sequencial curto, ver
// martyn/entrega-nota-whatsapp.ts no titan-nfse-api). /api/whatsapp/download/
// é o formato antigo (token longo); mantido só para os links já mandados a
// clientes continuarem abrindo dentro da janela de validade deles.
//
// Este destino já foi escolhido pelo host que atendeu o pedido, por causa do
// par site+API de homologação (21/08/2026). O ambiente foi desligado em
// 22/08/2026 e a escolha voltou a ser uma constante: com um backend só, o mapa
// virava indireção que não decide nada e ainda sugeria um segundo ambiente.
const API_ORIGIN = "https://titan-nfse-api.onrender.com";
const DOWNLOAD_PATH_PREFIXES = ["/n/", "/api/whatsapp/download/"];

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

    // Link de download de nota (XML/ZIP) mandado pelo Martyn: repassa para a
    // API real, sem redirecionar — o cliente nunca vê o domínio do Render.
    if (DOWNLOAD_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
      const target = new URL(url.pathname + url.search, API_ORIGIN);
      return fetch(new Request(target, request));
    }

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
// same-origin — DENY bloquearia o app inteiro de carregar.
//
// A CSP abaixo precisa de 'unsafe-inline' em script-src e style-src: o app é
// um HTML escrito à mão com handlers inline (onclick=...) e atributos
// style=... por toda a página — uma CSP sem isso quebraria a emissão inteira.
// Continua valendo como defesa: bloqueia carregar script/estilo/frame de
// qualquer origem não listada aqui, o que é o que realmente importa contra
// XSS que tenta puxar payload de fora (a maioria dos XSS reais na prática).
// Cada origem abaixo tem um uso real e rastreável no código:
//   script-src cdn.jsdelivr.net — ícones lucide (nfs.html)
//   style-src/font-src fonts.google(apis|static).com — fonte Inter/JetBrains Mono (titan.html)
//   connect-src titan-nfse-api.onrender.com — TITAN_API_URL (public/config.js)
//   img-src data: — logo do portal e logo comercial, salvas como data URL
//   frame-src 'self' — DANFSe sandbox (abrirDanfse em titan.html) usa srcdoc,
//     não precisa mais de blob: aqui (o próprio iframe já é same-origin)
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  // Só o backend nosso. A API de homologação saiu daqui em 22/08/2026, junto
  // com o ambiente: origem liberada no connect-src é permissão para mandar dado
  // fiscal para fora, e não se deixa permissão de pé para host que não existe.
  "connect-src 'self' https://titan-nfse-api.onrender.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'"
].join("; ");

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  headers.set("Content-Security-Policy", CSP);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default worker;
