import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import express from 'express';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-routes',
        configureServer(server) {
          server.middlewares.use(express.json({ limit: '25mb' }));
          server.middlewares.use(express.urlencoded({ extended: true }));
          server.middlewares.use(async (req, res, next) => {
            const pathname = (req.url ? req.url.split('?')[0] : '').replace(/\/$/, '');
            if (pathname === '/api/health' && req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
              return;
            }
            if (pathname === '/api/chat-health' && req.method === 'GET') {
              try {
                const { handleChatHealthRequest } = await import('./server/chatHandler');
                await handleChatHealthRequest(req, res);
              } catch (err: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: false, error: err?.message || 'Health check failed' }));
              }
              return;
            }
            if (pathname === '/api/chat' && req.method === 'POST') {
              try {
                const { handleChatRequest } = await import('./server/chatHandler');
                await handleChatRequest(req, res);
              } catch (err: any) {
                console.error('Chat middleware error:', err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Chat failed' }));
                }
              }
              return;
            }
            if (pathname === '/api/transcribe' && req.method === 'POST') {
              try {
                const { handleTranscribeRequest } = await import('./server/transcribeHandler');
                await handleTranscribeRequest(req, res);
              } catch (err: any) {
                console.error('Transcribe middleware error:', err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'Transcribe failed' }));
                }
              }
              return;
            }
            if (pathname === '/api/tts' && req.method === 'POST') {
              try {
                const { handleTtsRequest } = await import('./server/ttsHandler');
                await handleTtsRequest(req, res);
              } catch (err: any) {
                console.error('TTS middleware error:', err);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err?.message || 'TTS failed' }));
                }
              }
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
