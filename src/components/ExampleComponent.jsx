import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

/* ============================================================================
   CONTEXA — Ingestion Engine Console
   ----------------------------------------------------------------------------
   A single-file React frontend covering all four backend endpoints:

     POST /api/ingestion/run/                     → RunView
     GET  /api/ingestion/                          → ListView
     GET  /api/ingestion/<id>/                     → DetailView
     GET  /api/ingestion/<id>/claude-context/      → ClaudeContextView

   Design concept — "The Still": the product distills raw, sprawling infra
   (a Postgres/Mongo database, an object-storage bucket, a GitHub repo) down
   into one small, dense artifact meant for a coding model. The UI treats
   that distillation as its one signature move — a pipeline of source
   vessels converging through a filter into a single output vessel — rather
   than illustrating it with a generic dashboard chart.

   Drop this file into any React 18 app. No UI kit or icon package required;
   every icon is an inline SVG and every style lives in the <style> block
   below, so it renders identically regardless of your build setup.
============================================================================ */

/* ---------------------------------------------------------------------------
   Design tokens
--------------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

:root {
  --ink: #ffffff;
  --surface: #fafbfc;
  --surface-raised: #f2f3f5;
  --surface-hover: #eaebee;
  --border: #e1e3e8;
  --border-soft: #ececef;
  --text: #0b0c0e;
  --text-muted: #565b66;
  --text-faint: #7d838f;
  --copper: #a15f2b;
  --copper-bright: #c97d3e;
  --copper-dim: rgba(161, 95, 43, 0.10);
  --teal: #1f7168;
  --teal-bright: #2f8f85;
  --teal-dim: rgba(31, 113, 104, 0.10);
  --red: #c53a2b;
  --red-dim: rgba(197, 58, 43, 0.08);
  --green: #1f8f5f;
  --green-dim: rgba(31, 143, 95, 0.09);
  --font-display: 'Space Grotesk', 'Inter', sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', monospace;
  --radius: 10px;
  --radius-sm: 6px;
}

.cxa-root, .cxa-root * { box-sizing: border-box; }
.cxa-root {
  font-family: var(--font-body);
  background: var(--ink);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  -webkit-font-smoothing: antialiased;
  background-image:
    radial-gradient(ellipse 900px 500px at 15% -10%, rgba(161,95,43,0.05), transparent 60%),
    radial-gradient(ellipse 700px 500px at 100% 0%, rgba(31,113,104,0.045), transparent 60%);
}
.cxa-root ::selection { background: var(--copper-dim); color: var(--copper); }
.cxa-root button { font-family: inherit; }
.cxa-root a { color: inherit; }
.cxa-root *:focus-visible {
  outline: 2px solid var(--teal-bright);
  outline-offset: 2px;
  border-radius: 4px;
}
.cxa-scroll { overflow-y: auto; }
.cxa-scroll::-webkit-scrollbar { width: 9px; height: 9px; }
.cxa-scroll::-webkit-scrollbar-track { background: transparent; }
.cxa-scroll::-webkit-scrollbar-thumb { background: #d6d8dd; border-radius: 8px; }
.cxa-scroll::-webkit-scrollbar-thumb:hover { background: #bfc2c9; }

/* ---------- Sidebar ---------- */
.cxa-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border-soft);
  display: flex;
  flex-direction: column;
  padding: 22px 14px;
  position: sticky;
  top: 0;
  height: 100vh;
}
.cxa-brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 22px; }
.cxa-brand-mark {
  width: 30px; height: 30px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.cxa-brand-text { display: flex; flex-direction: column; line-height: 1.15; }
.cxa-brand-name { font-family: var(--font-display); font-weight: 700; font-size: 16.5px; letter-spacing: -0.01em; }
.cxa-brand-sub { font-family: var(--font-mono); font-size: 10px; color: var(--text-faint); letter-spacing: 0.06em; text-transform: uppercase; margin-top: 1px; }

.cxa-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.cxa-nav-label { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-faint); padding: 14px 10px 6px; }
.cxa-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: var(--radius-sm);
  font-size: 13.5px; font-weight: 500; color: var(--text-muted);
  cursor: pointer; border: 1px solid transparent; background: none; width: 100%; text-align: left;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.cxa-nav-item:hover { background: var(--surface-hover); color: var(--text); }
.cxa-nav-item.active { background: var(--copper-dim); color: var(--copper); border-color: rgba(161,95,43,0.22); }
.cxa-nav-item svg { flex-shrink: 0; opacity: 0.9; }
.cxa-nav-item .cxa-count {
  margin-left: auto; font-family: var(--font-mono); font-size: 10.5px;
  color: var(--text-faint); background: var(--surface-raised); padding: 1px 6px; border-radius: 20px;
}
.cxa-nav-item.active .cxa-count { color: var(--copper); }

.cxa-sidebar-footer { border-top: 1px solid var(--border-soft); padding-top: 12px; margin-top: 8px; }
.cxa-settings-btn {
  display: flex; align-items: center; gap: 9px; width: 100%;
  padding: 9px 10px; border-radius: var(--radius-sm);
  background: none; border: 1px solid transparent; color: var(--text-muted);
  font-size: 13px; cursor: pointer;
}
.cxa-settings-btn:hover { background: var(--surface-hover); color: var(--text); }
.cxa-conn-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text-faint); flex-shrink: 0; }
.cxa-conn-dot.ok { background: var(--green); box-shadow: 0 0 0 3px var(--green-dim); }

/* ---------- Main ---------- */
.cxa-main { flex: 1; min-width: 0; height: 100vh; overflow-y: auto; }
.cxa-page { max-width: 980px; margin: 0 auto; padding: 44px 40px 90px; }
.cxa-page.wide { max-width: 1180px; }

.cxa-eyebrow {
  font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--copper); display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.cxa-eyebrow::before { content: ''; width: 14px; height: 1px; background: var(--copper); display: inline-block; }
.cxa-h1 { font-family: var(--font-display); font-size: 30px; font-weight: 700; letter-spacing: -0.015em; margin: 0 0 8px; }
.cxa-lede { color: var(--text-muted); font-size: 14.5px; line-height: 1.6; max-width: 620px; margin: 0 0 34px; }
.cxa-page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 28px; }

/* ---------- Settings panel ---------- */
.cxa-settings-panel {
  position: fixed; inset: 0; background: rgba(6,7,9,0.6); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; z-index: 50;
}
.cxa-settings-card {
  width: 440px; background: var(--surface-raised); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 24px; box-shadow: 0 24px 60px rgba(0,0,0,0.5);
}
.cxa-settings-card h3 { font-family: var(--font-display); font-size: 16px; margin: 0 0 4px; }
.cxa-settings-card p.hint { color: var(--text-faint); font-size: 12.5px; margin: 0 0 18px; line-height: 1.5; }
.cxa-settings-close-row { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

/* ---------- Form building blocks ---------- */
.cxa-field { margin-bottom: 14px; }
.cxa-field label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; font-weight: 500; color: var(--text-muted); margin-bottom: 6px;
}
.cxa-field .req { color: var(--copper); font-size: 11px; }
.cxa-input, .cxa-select, .cxa-textarea {
  width: 100%; background: var(--ink); border: 1px solid var(--border);
  color: var(--text); font-size: 13px; padding: 9px 11px; border-radius: var(--radius-sm);
  font-family: var(--font-mono); transition: border-color 0.12s ease, background 0.12s ease;
}
.cxa-field:has(label:not(:empty)) .cxa-input { font-family: var(--font-mono); }
.cxa-input::placeholder, .cxa-textarea::placeholder { color: var(--text-faint); font-family: var(--font-mono); }
.cxa-input:disabled, .cxa-select:disabled, .cxa-textarea:disabled { opacity: 0.4; cursor: not-allowed; }
.cxa-input:focus, .cxa-select:focus, .cxa-textarea:focus { border-color: var(--copper); background: #100f0d10; outline: none; }
.cxa-textarea { font-family: var(--font-body); resize: vertical; min-height: 60px; }
.cxa-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238991a3'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 30px; }
.cxa-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cxa-grid-3 { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 12px; }

.cxa-section-card {
  background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius);
  margin-bottom: 14px; overflow: hidden; transition: border-color 0.15s ease;
}
.cxa-section-card.enabled { border-color: var(--border); }
.cxa-section-head {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; user-select: none;
}
.cxa-section-icon {
  width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
  background: var(--surface-raised); border: 1px solid var(--border-soft); flex-shrink: 0; color: var(--text-faint);
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.cxa-section-card.enabled .cxa-section-icon { color: var(--copper); border-color: rgba(161,95,43,0.28); background: var(--copper-dim); }
.cxa-section-title { font-weight: 600; font-size: 14px; }
.cxa-section-desc { font-size: 12px; color: var(--text-faint); margin-top: 1px; }
.cxa-section-head-meta { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.cxa-section-body { padding: 4px 16px 18px; border-top: 1px solid var(--border-soft); padding-top: 16px; }

.cxa-toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
.cxa-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.cxa-toggle .track {
  position: absolute; inset: 0; background: var(--border); border-radius: 20px; cursor: pointer; transition: background 0.15s ease;
}
.cxa-toggle .thumb {
  position: absolute; top: 2.5px; left: 2.5px; width: 15px; height: 15px; border-radius: 50%;
  background: var(--text-faint); transition: transform 0.15s ease, background 0.15s ease;
}
.cxa-toggle input:checked + .track { background: var(--copper-dim); }
.cxa-toggle input:checked + .track .thumb { transform: translateX(16px); background: var(--copper); }
.cxa-toggle input:checked + .track { }
.cxa-toggle input:focus-visible + .track { outline: 2px solid var(--teal-bright); outline-offset: 2px; }

.cxa-checkbox-row { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--text-muted); cursor: pointer; }
.cxa-checkbox-row input { accent-color: var(--copper); width: 15px; height: 15px; }

/* ---------- Buttons ---------- */
.cxa-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px; border-radius: var(--radius-sm); font-size: 13.5px; font-weight: 600;
  border: 1px solid transparent; cursor: pointer; transition: all 0.12s ease; white-space: nowrap;
  font-family: var(--font-body);
}
.cxa-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.cxa-btn-primary { background: var(--copper); color: #17110a; }
.cxa-btn-primary:hover:not(:disabled) { background: var(--copper-bright); }
.cxa-btn-ghost { background: var(--surface-raised); color: var(--text); border-color: var(--border); }
.cxa-btn-ghost:hover:not(:disabled) { background: var(--surface-hover); border-color: #333a47; }
.cxa-btn-text { background: none; color: var(--text-muted); padding: 8px 10px; }
.cxa-btn-text:hover:not(:disabled) { color: var(--text); }
.cxa-btn-sm { padding: 6px 12px; font-size: 12.5px; }
.cxa-btn-danger-ghost { background: none; border-color: var(--border); color: var(--red); }
.cxa-btn-danger-ghost:hover { background: var(--red-dim); }

/* ---------- Pipeline / signature element ---------- */
.cxa-still {
  background: var(--surface); border: 1px solid var(--border-soft); border-radius: 14px;
  padding: 30px 26px 24px; margin-bottom: 32px; position: relative; overflow: hidden;
}
.cxa-still::before {
  content: ''; position: absolute; top: -60%; left: 50%; width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(161,95,43,0.05), transparent 65%);
  transform: translateX(-50%); pointer-events: none;
}
.cxa-vessels { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; position: relative; z-index: 1; }
.cxa-vessel {
  border: 1px solid var(--border); background: var(--surface-raised); border-radius: 10px;
  padding: 14px 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center;
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}
.cxa-vessel-icon { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; color: var(--text-faint); transition: color 0.25s ease; }
.cxa-vessel-label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.cxa-vessel-state { font-family: var(--font-mono); font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }
.cxa-vessel.off { opacity: 0.45; }
.cxa-vessel.pending { border-color: rgba(161,95,43,0.45); box-shadow: 0 0 0 1px rgba(161,95,43,0.13), 0 0 18px rgba(161,95,43,0.10); }
.cxa-vessel.pending .cxa-vessel-icon { color: var(--copper); animation: cxa-pulse 1.4s ease-in-out infinite; }
.cxa-vessel.pending .cxa-vessel-state { color: var(--copper); }
.cxa-vessel.done { border-color: rgba(31,143,95,0.35); }
.cxa-vessel.done .cxa-vessel-icon { color: var(--green); }
.cxa-vessel.done .cxa-vessel-state { color: var(--green); }
.cxa-vessel.err { border-color: rgba(197,58,43,0.45); }
.cxa-vessel.err .cxa-vessel-icon { color: var(--red); }
.cxa-vessel.err .cxa-vessel-state { color: var(--red); }
@keyframes cxa-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { .cxa-vessel.pending .cxa-vessel-icon { animation: none; } }

.cxa-flow { display: flex; justify-content: center; margin: 6px 0; position: relative; z-index: 1; }
.cxa-flow-line { width: 1px; height: 22px; background: linear-gradient(var(--border), var(--border-soft)); position: relative; }
.cxa-flow-line.active { background: linear-gradient(var(--copper), transparent); }

.cxa-funnel {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  border: 1px dashed var(--border); background: var(--surface-raised); border-radius: 10px;
  padding: 10px 18px; margin: 0 auto; width: fit-content; position: relative; z-index: 1;
}
.cxa-funnel .label { font-family: var(--font-mono); font-size: 11px; color: var(--text-faint); }
.cxa-funnel.active { border-color: var(--teal); }
.cxa-funnel.active svg { color: var(--teal); }

.cxa-output-vessel {
  margin: 8px auto 0; width: fit-content; display: flex; align-items: center; gap: 10px;
  border: 1px solid var(--border); background: var(--surface-raised); border-radius: 10px;
  padding: 12px 20px; position: relative; z-index: 1; transition: border-color 0.25s ease;
}
.cxa-output-vessel.done { border-color: rgba(31,113,104,0.45); box-shadow: 0 0 22px rgba(31,113,104,0.08); }
.cxa-output-vessel .label { font-family: var(--font-mono); font-size: 12.5px; font-weight: 600; }
.cxa-output-vessel.done .label { color: var(--teal); }

/* ---------- Cards / lists ---------- */
.cxa-card { background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius); }
.cxa-ctx-card {
  background: var(--surface); border: 1px solid var(--border-soft); border-radius: var(--radius);
  padding: 16px 18px; margin-bottom: 10px; cursor: pointer; transition: border-color 0.12s ease, background 0.12s ease;
  display: flex; align-items: center; gap: 16px;
}
.cxa-ctx-card:hover { border-color: var(--border); background: var(--surface-raised); }
.cxa-ctx-card-main { flex: 1; min-width: 0; }
.cxa-ctx-card-title { font-weight: 600; font-size: 14.5px; margin-bottom: 3px; display: flex; align-items: center; gap: 8px; }
.cxa-ctx-card-sub { font-family: var(--font-mono); font-size: 11.5px; color: var(--text-faint); }
.cxa-ctx-card-sources { display: flex; gap: 6px; flex-shrink: 0; }
.cxa-src-chip {
  width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
  background: var(--surface-raised); border: 1px solid var(--border-soft); color: var(--text-faint);
}
.cxa-src-chip.on { color: var(--teal); border-color: rgba(31,113,104,0.25); background: var(--teal-dim); }
.cxa-ctx-card-stats { display: flex; gap: 18px; flex-shrink: 0; }
.cxa-stat { text-align: right; }
.cxa-stat .n { font-family: var(--font-mono); font-weight: 600; font-size: 15px; }
.cxa-stat .l { font-size: 10px; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }

/* ---------- Badges / status ---------- */
.cxa-badge {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600;
  padding: 3px 9px; border-radius: 20px; font-family: var(--font-mono);
}
.cxa-badge.ok { background: var(--green-dim); color: var(--green); }
.cxa-badge.err { background: var(--red-dim); color: var(--red); }
.cxa-badge.muted { background: var(--surface-raised); color: var(--text-faint); border: 1px solid var(--border-soft); }
.cxa-badge.teal { background: var(--teal-dim); color: var(--teal); }
.cxa-badge.copper { background: var(--copper-dim); color: var(--copper); }

.cxa-alert {
  display: flex; gap: 12px; align-items: flex-start; padding: 13px 15px; border-radius: var(--radius-sm);
  font-size: 13px; line-height: 1.55; margin-bottom: 18px;
}
.cxa-alert.err { background: var(--red-dim); border: 1px solid rgba(197,58,43,0.22); color: #8a2a1e; }
.cxa-alert.ok { background: var(--green-dim); border: 1px solid rgba(31,143,95,0.22); color: #145c3d; }
.cxa-alert.info { background: var(--surface-raised); border: 1px solid var(--border); color: var(--text-muted); }
.cxa-alert svg { flex-shrink: 0; margin-top: 1px; }
.cxa-alert .title { font-weight: 600; margin-bottom: 2px; color: var(--text); }
.cxa-alert code { font-family: var(--font-mono); font-size: 12px; background: rgba(0,0,0,0.07); padding: 1px 5px; border-radius: 4px; }

/* ---------- Tabs ---------- */
.cxa-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border-soft); margin-bottom: 22px; overflow-x: auto; }
.cxa-tab {
  padding: 10px 4px; margin-right: 20px; background: none; border: none; cursor: pointer;
  font-size: 13px; font-weight: 500; color: var(--text-faint); position: relative; white-space: nowrap;
}
.cxa-tab.active { color: var(--text); }
.cxa-tab.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--copper); border-radius: 2px; }
.cxa-tab .n { font-family: var(--font-mono); font-size: 10.5px; color: var(--text-faint); margin-left: 5px; }

/* ---------- Tables ---------- */
.cxa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cxa-table th {
  text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-faint); font-weight: 600; padding: 8px 12px; border-bottom: 1px solid var(--border-soft);
}
.cxa-table td { padding: 9px 12px; border-bottom: 1px solid var(--border-soft); vertical-align: top; }
.cxa-table tr:last-child td { border-bottom: none; }
.cxa-mono { font-family: var(--font-mono); }
.cxa-table .colname { font-family: var(--font-mono); font-size: 12.5px; }

.cxa-entity-row { border: 1px solid var(--border-soft); border-radius: var(--radius-sm); margin-bottom: 8px; overflow: hidden; }
.cxa-entity-head { display: flex; align-items: center; gap: 10px; padding: 11px 14px; cursor: pointer; background: var(--surface); }
.cxa-entity-head:hover { background: var(--surface-raised); }
.cxa-entity-name { font-family: var(--font-mono); font-weight: 600; font-size: 13px; }
.cxa-entity-meta { font-size: 11.5px; color: var(--text-faint); margin-left: auto; display: flex; gap: 12px; }
.cxa-entity-body { padding: 4px 14px 14px; background: var(--surface); border-top: 1px solid var(--border-soft); }

/* ---------- JSON viewer ---------- */
.cxa-json { font-family: var(--font-mono); font-size: 12.5px; line-height: 1.65; }
.cxa-json-row { display: flex; }
.cxa-json-toggle { width: 16px; flex-shrink: 0; color: var(--text-faint); cursor: pointer; user-select: none; }
.cxa-json-key { color: var(--teal); }
.cxa-json-string { color: var(--copper); }
.cxa-json-number { color: #1d4ed8; }
.cxa-json-bool { color: #7c3aed; }
.cxa-json-null { color: var(--text-faint); font-style: italic; }
.cxa-json-punc { color: var(--text-faint); }
.cxa-json-summary { color: var(--text-faint); cursor: pointer; }
.cxa-json-indent { padding-left: 16px; border-left: 1px solid var(--border-soft); margin-left: 6px; }

/* ---------- Misc ---------- */
.cxa-empty { text-align: center; padding: 70px 20px; color: var(--text-muted); }
.cxa-empty .ic { color: var(--text-faint); margin-bottom: 16px; }
.cxa-empty h3 { font-family: var(--font-display); font-size: 17px; color: var(--text); margin: 0 0 6px; }
.cxa-empty p { font-size: 13px; color: var(--text-faint); max-width: 340px; margin: 0 auto 20px; line-height: 1.55; }

.cxa-spin { animation: cxa-spin 0.9s linear infinite; }
@keyframes cxa-spin { to { transform: rotate(360deg); } }

.cxa-skel { background: linear-gradient(90deg, var(--surface-raised) 0%, var(--surface-hover) 50%, var(--surface-raised) 100%); background-size: 200% 100%; animation: cxa-shimmer 1.4s ease infinite; border-radius: 6px; }
@keyframes cxa-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@media (prefers-reduced-motion: reduce) { .cxa-skel { animation: none; } .cxa-spin { animation-duration: 1.6s; } }

.cxa-code-block {
  background: var(--ink); border: 1px solid var(--border-soft); border-radius: var(--radius-sm);
  padding: 12px 14px; font-family: var(--font-mono); font-size: 12px; line-height: 1.6;
  color: var(--text-muted); white-space: pre-wrap; word-break: break-word; max-height: 340px; overflow-y: auto;
}
.cxa-divider { height: 1px; background: var(--border-soft); margin: 22px 0; }
.cxa-kv { display: grid; grid-template-columns: 150px 1fr; gap: 8px 16px; font-size: 13px; }
.cxa-kv dt { color: var(--text-faint); }
.cxa-kv dd { margin: 0; font-family: var(--font-mono); }
.cxa-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }

@media (max-width: 900px) {
  .cxa-root { flex-direction: column; }
  .cxa-sidebar { width: 100%; height: auto; position: relative; flex-direction: row; align-items: center; overflow-x: auto; }
  .cxa-nav { flex-direction: row; }
  .cxa-nav-label { display: none; }
  .cxa-page { padding: 28px 18px 60px; }
  .cxa-vessels { grid-template-columns: repeat(2, 1fr); }
  .cxa-grid-2, .cxa-grid-3 { grid-template-columns: 1fr; }
}
`;

/* ---------------------------------------------------------------------------
   Icons
--------------------------------------------------------------------------- */

const Icon = {
  Funnel: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 4h18l-7 9v6l-4 2v-8L3 4z" />
    </svg>
  ),
  Postgres: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <ellipse cx="12" cy="6" rx="8" ry="3.2" />
      <path d="M4 6v12c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2V6" />
      <path d="M4 12c0 1.77 3.58 3.2 8 3.2s8-1.43 8-3.2" />
    </svg>
  ),
  Mongo: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2c3 3.2 5 7.4 5 11.4A5 5 0 0 1 12 19a5 5 0 0 1-5-5.6C7 9.4 9 5.2 12 2z" />
      <path d="M12 19v3" />
    </svg>
  ),
  Storage: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  ),
  Github: (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </svg>
  ),
  Play: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M6 4l14 8-14 8V4z" /></svg>
  ),
  List: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  ),
  Sparkle: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
    </svg>
  ),
  Gear: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  Check: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6L9 17l-5-5" /></svg>
  ),
  X: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>
  ),
  Loader: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="cxa-spin" {...p}><path d="M12 2a10 10 0 1 0 10 10" /></svg>
  ),
  Copy: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  ),
  Download: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
    </svg>
  ),
  Chevron: (p) => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6" /></svg>
  ),
  Back: (p) => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5m0 0l6 6m-6-6l6-6" /></svg>
  ),
  Plus: (p) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  Alert: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  ),
  Box: (p) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
  ),
};

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function formatBytes(n) {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
   Env resolution
   Reads API_BASE_URL from .env regardless of bundler naming convention
   (plain API_BASE_URL, CRA's REACT_APP_ prefix, Next's NEXT_PUBLIC_ prefix,
   or Vite's VITE_ prefix via import.meta.env). Falls back to
   http://localhost:8000 to match a typical local Django runserver.
--------------------------------------------------------------------------- */

function resolveApiBase() {
  let fromEnv = null;

  // Vite exposes env vars on import.meta.env, not process.env. Reached via
  // Function() so bundlers that don't support import.meta (plain CRA/webpack)
  // never have to parse the token at all — this line simply never runs there.
  try {
    // eslint-disable-next-line no-new-func
    const viteEnv = new Function("try { return import.meta.env; } catch (e) { return null; }")();
    if (viteEnv) fromEnv = viteEnv.VITE_API_BASE_URL || viteEnv.API_BASE_URL || fromEnv;
  } catch (e) { /* not in an ESM/Vite context */ }

  // CRA, Next, and plain Node-style define() setups all populate process.env.
  try {
    if (!fromEnv && typeof process !== "undefined" && process.env) {
      fromEnv =
        process.env.API_BASE_URL ||
        process.env.REACT_APP_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL ||
        fromEnv;
    }
  } catch (e) { /* process undefined in this environment */ }

  return (fromEnv || "http://localhost:8000").replace(/\/$/, "");
}

/* ---------------------------------------------------------------------------
   API layer
   All four endpoints from the Django app are called from here. Base URL,
   auth scheme, and token are configurable from the Settings panel.

   DRF's built-in TokenAuthentication (obtained via `drf_create_token`, as
   used here) expects `Authorization: Token <key>` — NOT `Bearer <key>`.
   `Bearer` is what JWT-based auth (SimpleJWT etc.) expects instead. Sending
   the wrong scheme doesn't error — DRF just treats the request as
   unauthenticated, which is what a 401 on an IsAuthenticated view means.
--------------------------------------------------------------------------- */

function useApi(apiBase, authToken, authScheme) {
  return useCallback(
    async (path, { method = "GET", body, params } = {}) => {
      let url = `${apiBase.replace(/\/$/, "")}${path}`;
      if (params) {
        const qs = new URLSearchParams(params).toString();
        if (qs) url += `?${qs}`;
      }
      const headers = { "Content-Type": "application/json" };
      
      let res;
      try {
        res = await fetch(url, {
          method,
          headers,
          // Cookies are only needed for Django's session auth. Sending them
          // on every request forces the server's CORS config to echo back
          // an exact Access-Control-Allow-Origin (never "*") plus
          // Access-Control-Allow-Credentials: true — an easy way to end up
          // with a 401/CORS error even once the token itself is correct.
          // With a token set, skip cookies entirely; the token is what's
          // doing the authenticating.
          credentials: "omit",
            body: body ? JSON.stringify(body) : undefined,
        });
      } catch (e) {
        throw new Error(`Could not reach ${url}. Check the API base URL in Settings and that the server is running.`);
      }

      let payload = null;
      const text = await res.text();
      if (text) {
        try { payload = JSON.parse(text); } catch { payload = text; }
      }

      if (!res.ok) {
        const detail =
          (payload && (payload.error || payload.detail)) ||
          (typeof payload === "string" ? payload : null) ||
          `Request failed with status ${res.status}`;
        const err = new Error(detail);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }
      return payload;
    },
    [apiBase, authToken, authScheme]
  );
}

/* ---------------------------------------------------------------------------
   Small building blocks
--------------------------------------------------------------------------- */

function Field({ label, required, children, hint }) {
  return (
    <div className="cxa-field">
      {label && (
        <label>
          {label}
          {required && <span className="req">required</span>}
        </label>
      )}
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, ariaLabel }) {
  return (
    <span className="cxa-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={ariaLabel} />
      <span className="track" onClick={() => onChange(!checked)}>
        <span className="thumb" />
      </span>
    </span>
  );
}

function Badge({ tone = "muted", children }) {
  return <span className={cx("cxa-badge", tone)}>{children}</span>;
}

function Spinner({ size = 15 }) {
  return <Icon.Loader width={size} height={size} />;
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="cxa-empty">
      <div className="ic">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

function Alert({ tone = "info", title, children }) {
  const icon = tone === "err" ? <Icon.Alert /> : tone === "ok" ? <Icon.Check /> : <Icon.Alert />;
  return (
    <div className={cx("cxa-alert", tone)}>
      {icon}
      <div>
        {title && <div className="title">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ---------- Collapsible JSON viewer ---------- */

function JSONNode({ label, value, depth, defaultOpen }) {
  const isObj = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const [open, setOpen] = useState(defaultOpen !== undefined ? defaultOpen : depth < 1);

  if (!isObj) {
    return (
      <div className="cxa-json-row">
        <span className="cxa-json-toggle" />
        {label !== undefined && <span className="cxa-json-key">{label}: </span>}
        <ValueSpan value={value} />
      </div>
    );
  }

  const entries = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
  const count = entries.length;
  const brackets = isArray ? ["[", "]"] : ["{", "}"];

  if (count === 0) {
    return (
      <div className="cxa-json-row">
        <span className="cxa-json-toggle" />
        {label !== undefined && <span className="cxa-json-key">{label}: </span>}
        <span className="cxa-json-punc">{brackets[0]}{brackets[1]}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="cxa-json-row">
        <span className="cxa-json-toggle" onClick={() => setOpen((o) => !o)}>
          <Icon.Chevron style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.1s ease" }} />
        </span>
        <span onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
          {label !== undefined && <span className="cxa-json-key">{label}: </span>}
          <span className="cxa-json-punc">{brackets[0]}</span>
          {!open && <span className="cxa-json-summary"> {count} {isArray ? "items" : "keys"} {brackets[1]}</span>}
        </span>
      </div>
      {open && (
        <div className="cxa-json-indent">
          {entries.map(([k, v]) => (
            <JSONNode key={k} label={isArray ? undefined : k} value={v} depth={depth + 1} />
          ))}
          <div className="cxa-json-row"><span className="cxa-json-toggle" /><span className="cxa-json-punc">{brackets[1]}</span></div>
        </div>
      )}
    </div>
  );
}

function ValueSpan({ value }) {
  if (value === null) return <span className="cxa-json-null">null</span>;
  if (typeof value === "string") return <span className="cxa-json-string">"{value}"</span>;
  if (typeof value === "number") return <span className="cxa-json-number">{value}</span>;
  if (typeof value === "boolean") return <span className="cxa-json-bool">{String(value)}</span>;
  return <span>{String(value)}</span>;
}

function JSONViewer({ data, filename = "context.json" }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="cxa-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
        <button
          className="cxa-btn cxa-btn-ghost cxa-btn-sm"
          onClick={async () => {
            const ok = await copyToClipboard(JSON.stringify(data, null, 2));
            setCopied(ok);
            setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? <Icon.Check /> : <Icon.Copy />} {copied ? "Copied" : "Copy JSON"}
        </button>
        <button className="cxa-btn cxa-btn-ghost cxa-btn-sm" onClick={() => downloadJSON(data, filename)}>
          <Icon.Download /> Download
        </button>
      </div>
      <div className="cxa-json cxa-scroll" style={{ maxHeight: 560, overflowY: "auto" }}>
        <JSONNode value={data} depth={0} defaultOpen={true} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Signature element — the distillation pipeline
--------------------------------------------------------------------------- */

const SOURCE_DEFS = [
  { key: "database", label: "PostgreSQL", icon: Icon.Postgres },
  { key: "mongo_database", label: "MongoDB", icon: Icon.Mongo },
  { key: "object_storage", label: "Object storage", icon: Icon.Storage },
  { key: "codebase", label: "GitHub repo", icon: Icon.Github },
];

function DistillationStill({ enabled, phase, sources, errors }) {
  // phase: 'idle' | 'running' | 'done'
  const vesselState = (key) => {
    if (!enabled[key]) return "off";
    if (phase === "idle") return "ready";
    if (phase === "running") return "pending";
    if (phase === "done") {
      if (errors && errors[key === "database" ? "database" : key === "mongo_database" ? "mongoDatabase" : key === "object_storage" ? "objectStorage" : "codebase"]) return "err";
      return sources && sources[key] ? "done" : "err";
    }
    return "off";
  };

  const anyEnabled = Object.values(enabled).some(Boolean);
  const outputDone = phase === "done";

  return (
    <div className="cxa-still">
      <div className="cxa-vessels">
        {SOURCE_DEFS.map(({ key, label, icon: SrcIcon }) => {
          const state = vesselState(key);
          const cls = state === "ready" ? "off" : state;
          return (
            <div className={cx("cxa-vessel", cls)} key={key}>
              <div className="cxa-vessel-icon"><SrcIcon /></div>
              <div className="cxa-vessel-label">{label}</div>
              <div className="cxa-vessel-state">
                {!enabled[key] && "not included"}
                {enabled[key] && phase === "idle" && "queued"}
                {enabled[key] && phase === "running" && "reading…"}
                {enabled[key] && phase === "done" && (state === "done" ? "ingested" : "failed")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cxa-flow"><div className={cx("cxa-flow-line", (phase !== "idle" && anyEnabled) && "active")} /></div>

      <div className={cx("cxa-funnel", phase === "running" && "active")}>
        <Icon.Funnel />
        <span className="label">context-filter.js — distills raw context into what a coding model needs</span>
      </div>

      <div className="cxa-flow"><div className={cx("cxa-flow-line", outputDone && "active")} /></div>

      <div className={cx("cxa-output-vessel", outputDone && "done")}>
        <Icon.Sparkle />
        <span className="label">claude_context{outputDone ? " — ready" : ""}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Section card (collapsible, toggle-enabled form group)
--------------------------------------------------------------------------- */

function SourceSection({ icon, title, desc, enabled, onToggle, children, statusBadge }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (enabled) setOpen(true); }, [enabled]);

  return (
    <div className={cx("cxa-section-card", enabled && "enabled")}>
      <div className="cxa-section-head" onClick={() => enabled && setOpen((o) => !o)}>
        <div className="cxa-section-icon">{icon}</div>
        <div>
          <div className="cxa-section-title">{title}</div>
          <div className="cxa-section-desc">{desc}</div>
        </div>
        <div className="cxa-section-head-meta">
          {statusBadge}
          <Toggle checked={enabled} onChange={onToggle} ariaLabel={`Include ${title}`} />
          {enabled && (
            <Icon.Chevron style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.12s ease", color: "var(--text-faint)" }} />
          )}
        </div>
      </div>
      {enabled && open && <div className="cxa-section-body">{children}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   RunView — POST /api/ingestion/run/
--------------------------------------------------------------------------- */

const emptyRunForm = {
  usePostgres: false,
  postgres_url: "",
  useMongo: false,
  mongo_url: "",
  mongo_db_name: "",
  useStorage: false,
  storage: {
    type: "s3",
    access_key_id: "",
    secret_access_key: "",
    region: "us-east-1",
    endpoint: "",
    bucket: "",
    connection_string: "",
  },
  useGithub: false,
  github: { token: "", owner: "", repo: "", branch: "" },
  project_name: "",
  description: "",
  includeRaw: false,
};

function RunView({ apiFetch, onIngested }) {
  const [form, setForm] = useState(emptyRunForm);
  const [phase, setPhase] = useState("idle"); // idle | running | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setStorage = (patch) => setForm((f) => ({ ...f, storage: { ...f.storage, ...patch } }));
  const setGithub = (patch) => setForm((f) => ({ ...f, github: { ...f.github, ...patch } }));

  const enabledMap = {
    database: form.usePostgres,
    mongo_database: form.useMongo,
    object_storage: form.useStorage,
    codebase: form.useGithub,
  };

  const canSubmit = form.usePostgres || form.useMongo || form.useGithub;

  const handleSubmit = async () => {
    setValidationError(null);
    if (!canSubmit) {
      setValidationError("Add at least one of Postgres, MongoDB, or a GitHub repo — the engine needs somewhere to read from.");
      return;
    }
    setError(null);
    setResult(null);
    setPhase("running");

    const body = {
      meta: { project_name: form.project_name, description: form.description },
    };
    if (form.usePostgres) body.postgres_url = form.postgres_url;
    if (form.useMongo) {
      body.mongo_url = form.mongo_url;
      if (form.mongo_db_name) body.mongo_db_name = form.mongo_db_name;
    }
    if (form.useStorage) {
      body.storage = form.storage.type === "azure"
        ? { type: "azure", connection_string: form.storage.connection_string }
        : {
            type: form.storage.type,
            access_key_id: form.storage.access_key_id,
            secret_access_key: form.storage.secret_access_key,
            region: form.storage.region,
            endpoint: form.storage.type === "s3-compatible" ? form.storage.endpoint : undefined,
            bucket: form.storage.bucket || undefined,
          };
    }
    if (form.useGithub) body.github = { ...form.github };

    try {
      const res = await apiFetch("/api/ingestion/run/", {
        method: "POST",
        body,
        params: form.includeRaw ? { include_raw: "true" } : undefined,
      });
      setResult(res);
      setPhase("done");
      onIngested?.(res);
    } catch (e) {
      setError(e);
      setPhase("done");
    }
  };

  const reset = () => {
    setForm(emptyRunForm);
    setResult(null);
    setError(null);
    setPhase("idle");
  };

  return (
    <div className="cxa-page">
      <div className="cxa-eyebrow">Ingestion Engine</div>
      <h1 className="cxa-h1">Point it at your stack.</h1>
      <p className="cxa-lede">
        Contexa reads your database, your storage bucket, and your repo, then distills all
        three into one small artifact sized for a coding model — schemas, relationships,
        storage-reference columns, and existing route conventions, nothing else.
      </p>

      <DistillationStill enabled={enabledMap} phase={phase} sources={result?.sources} errors={result?.errors} />

      {validationError && <Alert tone="err" title="Nothing to ingest">{validationError}</Alert>}
      {error && <Alert tone="err" title="Ingestion failed">{error.message}</Alert>}

      {result && (
        <RunResultPanel result={result} onViewContext={() => onIngested?.(result, true)} />
      )}

      {phase !== "done" || error ? (
        <>
          <SourceSection
            icon={<Icon.Postgres />}
            title="PostgreSQL"
            desc="Tables, columns, keys, indexes, functions, sample rows."
            enabled={form.usePostgres}
            onToggle={(v) => set({ usePostgres: v })}
          >
            <Field label="Connection string" required>
              <input
                className="cxa-input"
                placeholder="postgresql://user:pass@host:5432/dbname"
                value={form.postgres_url}
                onChange={(e) => set({ postgres_url: e.target.value })}
              />
            </Field>
          </SourceSection>

          <SourceSection
            icon={<Icon.Mongo />}
            title="MongoDB"
            desc="Collection shapes, indexes, inferred relationships."
            enabled={form.useMongo}
            onToggle={(v) => set({ useMongo: v })}
          >
            <div className="cxa-grid-2">
              <Field label="Connection string" required>
                <input
                  className="cxa-input"
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net"
                  value={form.mongo_url}
                  onChange={(e) => set({ mongo_url: e.target.value })}
                />
              </Field>
              <Field label="Database name" hint="Required if not present in the connection string path.">
                <input
                  className="cxa-input"
                  placeholder="myapp"
                  value={form.mongo_db_name}
                  onChange={(e) => set({ mongo_db_name: e.target.value })}
                />
              </Field>
            </div>
          </SourceSection>

          <SourceSection
            icon={<Icon.Storage />}
            title="Object storage"
            desc="Bucket contents, folder conventions, file-type breakdown."
            enabled={form.useStorage}
            onToggle={(v) => set({ useStorage: v })}
          >
            <Field label="Provider">
              <select className="cxa-select" value={form.storage.type} onChange={(e) => setStorage({ type: e.target.value })}>
                <option value="s3">Amazon S3</option>
                <option value="s3-compatible">S3-compatible</option>
                <option value="azure">Azure Blob Storage</option>
              </select>
            </Field>
            {form.storage.type === "azure" ? (
              <Field label="Connection string" required>
                <input className="cxa-input" placeholder="DefaultEndpointsProtocol=https;AccountName=..." value={form.storage.connection_string} onChange={(e) => setStorage({ connection_string: e.target.value })} />
              </Field>
            ) : (
              <>
                <div className="cxa-grid-2">
                  <Field label="Access key ID" required>
                    <input className="cxa-input" value={form.storage.access_key_id} onChange={(e) => setStorage({ access_key_id: e.target.value })} />
                  </Field>
                  <Field label="Secret access key" required>
                    <input className="cxa-input" type="password" value={form.storage.secret_access_key} onChange={(e) => setStorage({ secret_access_key: e.target.value })} />
                  </Field>
                </div>
                <div className="cxa-grid-3">
                  <Field label="Bucket" hint="Leave blank to scan all accessible buckets.">
                    <input className="cxa-input" value={form.storage.bucket} onChange={(e) => setStorage({ bucket: e.target.value })} />
                  </Field>
                  <Field label="Region">
                    <input className="cxa-input" value={form.storage.region} onChange={(e) => setStorage({ region: e.target.value })} />
                  </Field>
                  {form.storage.type === "s3-compatible" && (
                    <Field label="Endpoint" required>
                      <input className="cxa-input" placeholder="https://..." value={form.storage.endpoint} onChange={(e) => setStorage({ endpoint: e.target.value })} />
                    </Field>
                  )}
                </div>
              </>
            )}
          </SourceSection>

          <SourceSection
            icon={<Icon.Github />}
            title="GitHub repository"
            desc="Route/model/middleware files, framework detection, conventions."
            enabled={form.useGithub}
            onToggle={(v) => set({ useGithub: v })}
          >
            <div className="cxa-grid-2">
              <Field label="Owner" required>
                <input className="cxa-input" placeholder="acme-corp" value={form.github.owner} onChange={(e) => setGithub({ owner: e.target.value })} />
              </Field>
              <Field label="Repository" required>
                <input className="cxa-input" placeholder="backend-api" value={form.github.repo} onChange={(e) => setGithub({ repo: e.target.value })} />
              </Field>
            </div>
            <div className="cxa-grid-2">
              <Field label="Access token" required hint="Needs read access to contents and commits.">
                <input className="cxa-input" type="password" placeholder="ghp_…" value={form.github.token} onChange={(e) => setGithub({ token: e.target.value })} />
              </Field>
              <Field label="Branch" hint="Defaults to the repository's default branch.">
                <input className="cxa-input" placeholder="main" value={form.github.branch} onChange={(e) => setGithub({ branch: e.target.value })} />
              </Field>
            </div>
          </SourceSection>

          <div className="cxa-section-card enabled">
            <div className="cxa-section-body" style={{ borderTop: "none", paddingTop: 16 }}>
              <div className="cxa-grid-2">
                <Field label="Project name">
                  <input className="cxa-input" style={{ fontFamily: "var(--font-body)" }} placeholder="Staffing CRM / ATS" value={form.project_name} onChange={(e) => set({ project_name: e.target.value })} />
                </Field>
                <Field label="Description">
                  <input className="cxa-input" style={{ fontFamily: "var(--font-body)" }} placeholder="Optional — helps you find it later" value={form.description} onChange={(e) => set({ description: e.target.value })} />
                </Field>
              </div>
              <label className="cxa-checkbox-row" style={{ marginTop: 4 }}>
                <input type="checkbox" checked={form.includeRaw} onChange={(e) => set({ includeRaw: e.target.checked })} />
                Return the full raw context inline (sample rows, blob listings, scan stats) — otherwise only the distilled context comes back, and the raw one stays available from Saved Contexts.
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="cxa-btn cxa-btn-primary" onClick={handleSubmit} disabled={phase === "running"}>
              {phase === "running" ? <Spinner /> : <Icon.Play />}
              {phase === "running" ? "Ingesting…" : "Run ingestion"}
            </button>
            {(form !== emptyRunForm) && (
              <button className="cxa-btn cxa-btn-text" onClick={reset} disabled={phase === "running"}>Clear form</button>
            )}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: 10 }}>
          <button className="cxa-btn cxa-btn-ghost" onClick={reset}><Icon.Plus /> Run another ingestion</button>
        </div>
      )}
    </div>
  );
}

function RunResultPanel({ result, onViewContext }) {
  const sources = result.sources || {};
  const errors = result.errors;
  return (
    <div className="cxa-card" style={{ padding: 20, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge tone={errors ? "err" : "ok"}>{errors ? "completed with errors" : "complete"}</Badge>
          <span className="cxa-mono" style={{ fontSize: 12, color: "var(--text-faint)" }}>{result.context_id}</span>
        </div>
        <button className="cxa-btn cxa-btn-primary cxa-btn-sm" onClick={onViewContext}>
          <Icon.Sparkle /> View claude_context
        </button>
      </div>

      <div className="cxa-chip-row" style={{ marginBottom: errors ? 14 : 0 }}>
        {SOURCE_DEFS.map(({ key, label, icon: SrcIcon }) => (
          <span key={key} className={cx("cxa-badge", sources[key] ? "teal" : "muted")} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <SrcIcon width={12} height={12} /> {label}: {sources[key] ? "ok" : "skipped"}
          </span>
        ))}
      </div>

      {errors && (
        <div style={{ marginTop: 10 }}>
          {Object.entries(errors).map(([k, v]) => (
            <Alert key={k} tone="err" title={k}>{String(v)}</Alert>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   ListView — GET /api/ingestion/
--------------------------------------------------------------------------- */

function ListView({ apiFetch, onOpen, onNew, refreshKey }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    apiFetch("/api/ingestion/")
      .then((res) => { if (!cancelled) setItems(res); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [apiFetch, refreshKey]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((c) =>
      (c.project_name || "").toLowerCase().includes(q) ||
      (c.summary?.repository || "").toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="cxa-page wide">
      <div className="cxa-page-head">
        <div>
          <div className="cxa-eyebrow">Saved contexts</div>
          <h1 className="cxa-h1" style={{ marginBottom: 4 }}>Everything you've ingested</h1>
          <p className="cxa-lede" style={{ marginBottom: 0 }}>Each entry keeps its full raw snapshot and its distilled claude_context.</p>
        </div>
        <button className="cxa-btn cxa-btn-primary" onClick={onNew}><Icon.Plus /> New ingestion</button>
      </div>

      {error && <Alert tone="err" title="Couldn't load saved contexts">{error.message}</Alert>}

      {items && items.length > 0 && (
        <div style={{ marginBottom: 18, position: "relative", maxWidth: 320 }}>
          <input
            className="cxa-input"
            style={{ fontFamily: "var(--font-body)", paddingLeft: 34 }}
            placeholder="Filter by project or repo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span style={{ position: "absolute", left: 11, top: 10, color: "var(--text-faint)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          </span>
        </div>
      )}

      {items === null && !error && (
        <div>
          {[0, 1, 2].map((i) => <div key={i} className="cxa-skel" style={{ height: 68, marginBottom: 10 }} />)}
        </div>
      )}

      {items && items.length === 0 && (
        <EmptyState
          icon={<Icon.Box width={34} height={34} />}
          title="No ingestions yet"
          body="Run your first ingestion against a database, a bucket, or a repo — it'll show up here with its own distilled context."
          action={<button className="cxa-btn cxa-btn-primary" onClick={onNew}><Icon.Play /> Run an ingestion</button>}
        />
      )}

      {filtered && filtered.length > 0 && filtered.map((c) => (
        <div className="cxa-ctx-card" key={c.id} onClick={() => onOpen(c.id)}>
          <div className="cxa-ctx-card-main">
            <div className="cxa-ctx-card-title">
              {c.project_name || "Untitled project"}
              {c.errors && <Badge tone="err">errors</Badge>}
            </div>
            <div className="cxa-ctx-card-sub">
              {c.summary?.repository || "no repo linked"} · {formatDate(c.created_at)}
            </div>
          </div>
          <div className="cxa-ctx-card-stats">
            <div className="cxa-stat">
              <div className="n">{c.summary?.postgres_tables ?? "–"}</div>
              <div className="l">pg tables</div>
            </div>
            <div className="cxa-stat">
              <div className="n">{c.summary?.mongo_collections ?? "–"}</div>
              <div className="l">collections</div>
            </div>
            <div className="cxa-stat">
              <div className="n">{c.summary?.storage_containers ?? "–"}</div>
              <div className="l">buckets</div>
            </div>
          </div>
          <div className="cxa-ctx-card-sources">
            {SOURCE_DEFS.map(({ key, label, icon: SrcIcon }) => (
              <span key={key} className={cx("cxa-src-chip", c.sources?.[key] && "on")} title={label}>
                <SrcIcon width={13} height={13} />
              </span>
            ))}
          </div>
          <Icon.Chevron style={{ color: "var(--text-faint)" }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   DetailView — GET /api/ingestion/<id>/
--------------------------------------------------------------------------- */

function DetailView({ apiFetch, contextId, onBack, onOpenClaudeContext }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    apiFetch(`/api/ingestion/${contextId}/`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [apiFetch, contextId]);

  if (error) {
    return (
      <div className="cxa-page">
        <button className="cxa-btn cxa-btn-text" onClick={onBack}><Icon.Back /> Back</button>
        <Alert tone="err" title="Couldn't load this context">{error.message}</Alert>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="cxa-page">
        <button className="cxa-btn cxa-btn-text" onClick={onBack}><Icon.Back /> Back</button>
        <div className="cxa-skel" style={{ height: 40, width: 300, marginTop: 18, marginBottom: 10 }} />
        <div className="cxa-skel" style={{ height: 200 }} />
      </div>
    );
  }

  const meta = data._meta || {};
  const rawChars = JSON.stringify(data).length;
  const distilledChars = JSON.stringify(data.claude_context || {}).length;
  const rawTokensApprox = Math.round(rawChars / 4);
  const distilledTokensApprox = Math.round(distilledChars / 4);
  const reductionPct = rawChars > 0 ? Math.round((1 - distilledChars / rawChars) * 100) : 0;
  const database = data.database;
  const mongo = data.mongo_database;
  const storage = data.object_storage;
  const codebase = data.codebase;

  const tabs = [
    { id: "overview", label: "Overview" },
    database && { id: "postgres", label: "PostgreSQL", n: database.tables?.length },
    mongo && { id: "mongo", label: "MongoDB", n: mongo.collections?.length },
    storage && { id: "storage", label: "Storage", n: storage.buckets?.length || storage.containers?.length },
    codebase && { id: "codebase", label: "Codebase" },
    { id: "raw", label: "Raw JSON" },
  ].filter(Boolean);

  return (
    <div className="cxa-page wide">
      <button className="cxa-btn cxa-btn-text" style={{ marginBottom: 6, marginLeft: -10 }} onClick={onBack}>
        <Icon.Back /> Saved contexts
      </button>

      <div className="cxa-page-head">
        <div>
          <div className="cxa-eyebrow">Ingestion context</div>
          <h1 className="cxa-h1" style={{ marginBottom: 4 }}>{meta.project?.project_name || "Untitled project"}</h1>
          <p className="cxa-lede" style={{ marginBottom: 0 }}>
            Generated {formatDate(meta.generated_at)} · {meta.ingestion_duration_ms ? `${(meta.ingestion_duration_ms / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <button className="cxa-btn cxa-btn-primary" onClick={() => onOpenClaudeContext(contextId)}>
            <Icon.Sparkle /> View claude_context
          </button>
          {data.claude_context && (
            <Badge tone="teal">
              ~{rawTokensApprox.toLocaleString()} → ~{distilledTokensApprox.toLocaleString()} tokens ({reductionPct}% smaller)
            </Badge>
          )}
        </div>
      </div>

      {meta.errors && (
        <div style={{ marginBottom: 8 }}>
          {Object.entries(meta.errors).map(([k, v]) => <Alert key={k} tone="err" title={k}>{String(v)}</Alert>)}
        </div>
      )}

      <div className="cxa-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={cx("cxa-tab", tab === t.id && "active")} onClick={() => setTab(t.id)}>
            {t.label}{t.n !== undefined && <span className="n">{t.n}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab meta={meta} database={database} mongo={mongo} storage={storage} codebase={codebase} />}
      {tab === "postgres" && database && <PostgresTab database={database} />}
      {tab === "mongo" && mongo && <MongoTab mongo={mongo} />}
      {tab === "storage" && storage && <StorageTab storage={storage} />}
      {tab === "codebase" && codebase && <CodebaseTab codebase={codebase} />}
      {tab === "raw" && <JSONViewer data={data} filename={`context-${contextId}.json`} />}
    </div>
  );
}

function OverviewTab({ meta, database, mongo, storage, codebase }) {
  const cards = [
    database && { label: "PostgreSQL", value: `${database.tables?.length ?? 0} tables`, sub: database.database_name, icon: Icon.Postgres },
    mongo && { label: "MongoDB", value: `${mongo.collections?.length ?? 0} collections`, sub: mongo.database_name, icon: Icon.Mongo },
    storage && { label: "Object storage", value: `${(storage.buckets || storage.containers || []).length} bucket(s)`, sub: storage.provider, icon: Icon.Storage },
    codebase && { label: "Repository", value: codebase.repository?.full_name || "—", sub: codebase.stack?.languages?.join(", "), icon: Icon.Github },
  ].filter(Boolean);

  return (
    <div>
      <div className="cxa-grid-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 26 }}>
        {cards.map((c) => (
          <div className="cxa-card" key={c.label} style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div className="cxa-section-icon" style={{ color: "var(--copper)", background: "var(--copper-dim)", borderColor: "rgba(161,95,43,0.28)" }}><c.icon /></div>
            <div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
              <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 2 }}>{c.value}</div>
              {c.sub && <div className="cxa-mono" style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 2 }}>{c.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {codebase?.stack && (
        <>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Detected stack</div>
          <div className="cxa-chip-row" style={{ marginBottom: 26 }}>
            {[...(codebase.stack.frameworks || []), ...(codebase.stack.orms || []), ...(codebase.stack.languages || [])].map((s) => (
              <Badge key={s} tone="copper">{s}</Badge>
            ))}
          </div>
        </>
      )}

      {database?.relationship_graph?.length > 0 && (
        <>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Relationships (Postgres)</div>
          <table className="cxa-table" style={{ marginBottom: 26 }}>
            <thead><tr><th>From</th><th>Column</th><th>References</th></tr></thead>
            <tbody>
              {database.relationship_graph.slice(0, 12).map((r, i) => (
                <tr key={i}>
                  <td className="cxa-mono">{r.from}</td>
                  <td className="cxa-mono">{r.from_column}</td>
                  <td className="cxa-mono">{r.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Run metadata</div>
      <dl className="cxa-kv cxa-card" style={{ padding: 16 }}>
        <dt>Schema version</dt><dd>{meta.schema_version || "—"}</dd>
        <dt>Duration</dt><dd>{meta.ingestion_duration_ms ? `${meta.ingestion_duration_ms} ms` : "—"}</dd>
        <dt>Sources ingested</dt>
        <dd>{Object.entries(meta.sources || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}</dd>
      </dl>
    </div>
  );
}

function EntityRow({ name, meta, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cxa-entity-row">
      <div className="cxa-entity-head" onClick={() => setOpen((o) => !o)}>
        <Icon.Chevron style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.12s ease", color: "var(--text-faint)" }} />
        <span className="cxa-entity-name">{name}</span>
        <span className="cxa-entity-meta">{meta}</span>
      </div>
      {open && <div className="cxa-entity-body">{children}</div>}
    </div>
  );
}

function PostgresTab({ database }) {
  return (
    <div>
      {(database.tables || []).map((t) => (
        <EntityRow
          key={`${t.schema}.${t.name}`}
          name={`${t.schema}.${t.name}`}
          meta={<>
            <span>{t.columns?.length ?? 0} cols</span>
            <span>{t.foreign_keys?.length ?? 0} fks</span>
            <span>{t.estimated_rows ?? "?"} rows</span>
          </>}
        >
          <table className="cxa-table">
            <thead><tr><th>Column</th><th>Type</th><th>Null</th><th>Default</th></tr></thead>
            <tbody>
              {(t.columns || []).map((c) => (
                <tr key={c.name}>
                  <td className="colname">
                    {c.name}
                    {t.primary_keys?.includes(c.name) && <Badge tone="copper" style={{ marginLeft: 6 }}>PK</Badge>}
                    {c.is_storage_reference && <Badge tone="teal" style={{ marginLeft: 6 }}>storage ref</Badge>}
                  </td>
                  <td className="cxa-mono">{c.type}</td>
                  <td>{c.nullable ? "yes" : "no"}</td>
                  <td className="cxa-mono">{c.default || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </EntityRow>
      ))}
    </div>
  );
}

function MongoTab({ mongo }) {
  return (
    <div>
      {(mongo.collections || []).map((c) => (
        <EntityRow
          key={c.name}
          name={c.name}
          meta={<>
            <span>{Object.keys(c.schema_shape || {}).length} fields</span>
            <span>{c.indexes?.length ?? 0} indexes</span>
            <span>~{c.estimated_documents ?? "?"} docs</span>
          </>}
        >
          <table className="cxa-table">
            <thead><tr><th>Field</th><th>Shape</th></tr></thead>
            <tbody>
              {Object.entries(c.schema_shape || {}).map(([k, v]) => (
                <tr key={k}>
                  <td className="colname">{k}</td>
                  <td className="cxa-mono">{typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </EntityRow>
      ))}
    </div>
  );
}

function StorageTab({ storage }) {
  const buckets = storage.containers || storage.buckets || [];
  return (
    <div>
      {buckets.map((b) => (
        <EntityRow
          key={b.name}
          name={b.name}
          meta={<>
            <span>{b.file_count_sampled ?? b.objects_sample?.length ?? 0} sampled</span>
            <span>{formatBytes(b.approx_total_size_bytes)}</span>
          </>}
        >
          <div className="cxa-chip-row" style={{ marginBottom: 12 }}>
            {Object.entries(b.content_types || b.summary?.by_type || {}).map(([type, n]) => (
              <Badge key={type} tone="teal">{type}: {n}</Badge>
            ))}
          </div>
          {b.folders?.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>Folders</div>
              <div className="cxa-chip-row" style={{ marginBottom: 12 }}>
                {b.folders.map((f) => <Badge key={f} tone="muted">{f}</Badge>)}
              </div>
            </>
          )}
          {(b.example_keys || []).length > 0 && (
            <div className="cxa-code-block">{(b.example_keys || []).join("\n")}</div>
          )}
        </EntityRow>
      ))}
    </div>
  );
}

function CodebaseTab({ codebase }) {
  const filesByRole = codebase.key_files_by_role || {};
  const [openFile, setOpenFile] = useState(null);
  return (
    <div>
      <dl className="cxa-kv cxa-card" style={{ padding: 16, marginBottom: 22 }}>
        <dt>Repository</dt><dd>{codebase.repository?.full_name || "—"}</dd>
        <dt>Default branch</dt><dd>{codebase.repository?.default_branch || "—"}</dd>
        <dt>Total files</dt><dd>{codebase.file_tree_summary?.total_files ?? "—"}</dd>
      </dl>

      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Key files by role</div>
      {Object.entries(filesByRole).map(([role, files]) => (
        <div key={role} style={{ marginBottom: 14 }}>
          <div className="cxa-mono" style={{ fontSize: 11.5, color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{role}</div>
          {files.map((f) => (
            <EntityRow key={f.path} name={f.path} meta={<span>{formatBytes(f.size_bytes)}</span>}>
              <div className="cxa-code-block">{f.content ? f.content.slice(0, 4000) : "(no content)"}</div>
            </EntityRow>
          ))}
        </div>
      ))}

      {codebase.env_template && (
        <>
          <div style={{ fontWeight: 600, fontSize: 13, margin: "18px 0 10px" }}>Env template</div>
          <div className="cxa-code-block">{codebase.env_template}</div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   ClaudeContextView — GET /api/ingestion/<id>/claude-context/
--------------------------------------------------------------------------- */

function ClaudeContextView({ apiFetch, contextId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [promptCopied, setPromptCopied] = useState(false);

  const copyPrompt = async () => {
    const prompt = `Here is my project's schema and codebase context, distilled for code generation:\n\n${JSON.stringify(data, null, 2)}\n\nUsing this context, generate a working API endpoint that fits the existing schema and conventions.`;
    const ok = await copyToClipboard(prompt);
    setPromptCopied(ok);
    setTimeout(() => setPromptCopied(false), 1600);
  };

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    apiFetch(`/api/ingestion/${contextId}/claude-context/`)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [apiFetch, contextId]);

  return (
    <div className="cxa-page wide">
      <button className="cxa-btn cxa-btn-text" style={{ marginBottom: 6, marginLeft: -10 }} onClick={onBack}>
        <Icon.Back /> Back to context
      </button>

      <div className="cxa-eyebrow">Distilled output</div>
      <h1 className="cxa-h1" style={{ marginBottom: 4 }}>claude_context</h1>
      <p className="cxa-lede">
        This is the payload meant to go straight into a prompt or the Messages API — schema,
        relationships, and storage conventions, with scan statistics, extension internals,
        and bulk sample data already stripped out.
      </p>

      {error && (
        <Alert tone="err" title="Couldn't load claude_context">
          {error.message}
          {error.status === 404 && (
            <div style={{ marginTop: 6 }}>
              This context may have been saved before <code>claude_context</code> existed — re-run the ingestion to regenerate it.
            </div>
          )}
        </Alert>
      )}

      {!data && !error && (
        <div>
          <div className="cxa-skel" style={{ height: 44, marginBottom: 10 }} />
          <div className="cxa-skel" style={{ height: 300 }} />
        </div>
      )}

      {data && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="cxa-btn cxa-btn-ghost" onClick={copyPrompt}>
              {promptCopied ? <Icon.Check /> : <Icon.Copy />} {promptCopied ? "Prompt copied" : "Copy as Claude prompt"}
            </button>
          </div>
          <JSONViewer data={data} filename={`claude-context-${contextId}.json`} />
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Settings panel — API base URL + auth
--------------------------------------------------------------------------- */

function SettingsPanel({ apiBase, setApiBase, authToken, setAuthToken, authScheme, setAuthScheme, onClose }) {
  const [localBase, setLocalBase] = useState(apiBase);
  const [localToken, setLocalToken] = useState(authToken);
  const [localScheme, setLocalScheme] = useState(authScheme);

  return (
    <div className="cxa-settings-panel" onClick={onClose}>
      <div className="cxa-settings-card" onClick={(e) => e.stopPropagation()}>
        <h3>Connection</h3>
        <p className="hint">
          Points this console at your Django backend. Defaults to <code>API_BASE_URL</code> from
          your <code>.env</code> (falling back to <code>http://localhost:8000</code>) — override it
          here for a session only.
        </p>
        <Field label="API base URL" hint="Read from .env on load — e.g. http://localhost:8000">
          <input className="cxa-input" placeholder="http://localhost:8000" value={localBase} onChange={(e) => setLocalBase(e.target.value)} />
        </Field>
        <div className="cxa-grid-2">
          <Field label="Auth scheme" hint="DRF TokenAuthentication (drf_create_token) uses Token. JWT (SimpleJWT) uses Bearer.">
            <select className="cxa-select" value={localScheme} onChange={(e) => setLocalScheme(e.target.value)}>
              <option value="Token">Token — DRF TokenAuthentication</option>
              <option value="Bearer">Bearer — JWT</option>
            </select>
          </Field>
          <Field label="Token" hint={`Sent as Authorization: ${localScheme} <token>`}>
            <input className="cxa-input" type="password" placeholder="Optional" value={localToken} onChange={(e) => setLocalToken(e.target.value)} />
          </Field>
        </div>
        <div className="cxa-settings-close-row">
          <button className="cxa-btn cxa-btn-text" onClick={onClose}>Cancel</button>
          <button
            className="cxa-btn cxa-btn-primary"
            onClick={() => { setApiBase(localBase); setAuthToken(localToken); setAuthScheme(localScheme); onClose(); }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   App shell
--------------------------------------------------------------------------- */

export default function App() {
  const [apiBase, setApiBase] = useState(resolveApiBase);
  const [authToken, setAuthToken] = useState("");
  const [authScheme, setAuthScheme] = useState("Token");
  const [view, setView] = useState("run"); // run | list | detail | claude
  const [selectedId, setSelectedId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const apiFetch = useApi(apiBase, authToken, authScheme);

  const goList = () => { setListRefreshKey((k) => k + 1); setView("list"); };
  const openDetail = (id) => { setSelectedId(id); setView("detail"); };
  const openClaudeContext = (id) => { setSelectedId(id); setView("claude"); };

  const handleIngested = (result, jumpToClaude) => {
    setSelectedId(result.context_id);
    if (jumpToClaude) setView("claude");
  };

  return (
    <div className="cxa-root">
      <style>{STYLES}</style>

      <aside className="cxa-sidebar">
        <div className="cxa-brand">
          <div className="cxa-brand-mark"><Icon.Funnel style={{ color: "var(--copper)" }} width={22} height={22} /></div>
          <div className="cxa-brand-text">
            <span className="cxa-brand-name">Contexa</span>
            <span className="cxa-brand-sub">Ingestion Engine</span>
          </div>
        </div>

        <nav className="cxa-nav">
          <div className="cxa-nav-label">Console</div>
          <button className={cx("cxa-nav-item", view === "run" && "active")} onClick={() => setView("run")}>
            <Icon.Play /> New ingestion
          </button>
          <button className={cx("cxa-nav-item", (view === "list" || view === "detail" || view === "claude") && "active")} onClick={goList}>
            <Icon.List /> Saved contexts
          </button>
        </nav>

        <div className="cxa-sidebar-footer">
          <button className="cxa-settings-btn" onClick={() => setSettingsOpen(true)}>
            <span className={cx("cxa-conn-dot", (apiBase || authToken) && "ok")} />
            <Icon.Gear /> Connection
          </button>
        </div>
      </aside>

      <main className="cxa-main">
        {view === "run" && <RunView apiFetch={apiFetch} onIngested={handleIngested} />}
        {view === "list" && <ListView apiFetch={apiFetch} onOpen={openDetail} onNew={() => setView("run")} refreshKey={listRefreshKey} />}
        {view === "detail" && selectedId && (
          <DetailView apiFetch={apiFetch} contextId={selectedId} onBack={goList} onOpenClaudeContext={openClaudeContext} />
        )}
        {view === "claude" && selectedId && (
          <ClaudeContextView apiFetch={apiFetch} contextId={selectedId} onBack={() => setView("detail")} />
        )}
      </main>

      {settingsOpen && (
        <SettingsPanel
          apiBase={apiBase}
          setApiBase={setApiBase}
          authToken={authToken}
          setAuthToken={setAuthToken}
          authScheme={authScheme}
          setAuthScheme={setAuthScheme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}