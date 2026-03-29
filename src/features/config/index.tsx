/*
 * features/config/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose : App-wide constants derived from environment variables and
 *           hardcoded defaults used across multiple pages.
 *
 * Used by : Landing.tsx, SignIn.tsx  (display app name / subtitle)
 *
 * Key exports
 *   VITE_APP_NAME       – Application title read from VITE_APP_NAME env var,
 *                         falls back to '[Admin Dashboard]'
 *   PAGE_SINGIN_SUBTILE – Tagline shown on the SignIn page left panel
 */

export const VITE_APP_NAME = import.meta.env.VITE_APP_NAME || 'SVGDraw';

export const VITE_APP_SUBTILE = 'SVG Label Editor  is a fullfeatured web-based application';

export const VITE_APP_DESCRIPTION = 'SVG Label Editor is a web-based application designed to facilitate the creation and editing of SVG labels. It provides an intuitive interface for users to design and customize labels using Scalable Vector Graphics (SVG) technology. With SVG Label Editor, users can easily create visually appealing labels for various purposes, such as product packaging, branding, or informational displays. The application offers a range of tools and features to enhance the label design process, making it accessible to both beginners and experienced designers alike.';

export const VITE_APP_API_URL = import.meta.env.VITE_APP_API_URL ?? '';

export const VITE_APP_SERVICE_CHECK_INTERVAL = import.meta.env.VITE_APP_SERVICE_CHECK_INTERVAL ?? 30000;