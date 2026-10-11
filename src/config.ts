/**
 * J.A.R.V.I.S UI Configuration
 * 
 * - MOCK_TOOLS: When true, uses simulated execution scenarios for mock app tools
 *   (calendar, email, delete, weather, system status, open app, music, web search).
 * - REAL_CHAT: When true, sends all non-tool queries to the server-side Gemini AI model (/api/chat).
 * - USE_MOCK: Master toggle (kept for compatibility with base service gateways).
 * 
 * See HANDOFF.md for implementation and deployment instructions.
 */

// BACKEND HANDOFF: Controls whether tool invocations use mock scenarios or production services.
export const MOCK_TOOLS = true;

// Enables live server-side Gemini AI responses via POST /api/chat.
export const REAL_CHAT = true;

// Master compatibility flag
export const USE_MOCK = true;

export const APP_VERSION = "0.2.0";
export const APP_CODENAME = "MARK-VII-HUD";
