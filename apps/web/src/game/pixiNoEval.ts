/**
 * PixiJS builds its shader and uniform code with `new Function` unless this is loaded. The
 * Cloudflare site's Content Security Policy (public/_headers) forbids eval, so every module that
 * creates a Pixi `Application` imports this first.
 */
import "pixi.js/unsafe-eval";
