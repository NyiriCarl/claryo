import { useState, useCallback } from 'react';
import * as ReactDOMClient from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Check, ImageDown, AlertCircle } from 'lucide-react';
import { useGoalStore } from '../store/useGoalStore';
import { ThemeProvider } from '../contexts/ThemeContext';

// ─── Lazy imports to avoid circular deps ──────────────────────────────────────
import Home from '../pages/Home';
import ActionScreen from '../pages/ActionScreen';
import ExecutionMode from '../pages/ExecutionMode';
import Projects from '../pages/Projects';
import Momentum from '../pages/Momentum';
import Profile from '../pages/Profile';

// ─── Types ─────────────────────────────────────────────────────────────────────
type ScreenStatus = 'pending' | 'capturing' | 'done' | 'error';

interface ScreenDef {
  name: string;
  emoji: string;
  path: string;
  status: ScreenStatus;
}

interface ScreenExportModalProps {
  open: boolean;
  onClose: () => void;
}

// ─── Route factory ─────────────────────────────────────────────────────────────
function buildRouter(path: string) {
  return createMemoryRouter(
    [
      { path: '/', Component: Home },
      { path: '/action/:goalId', Component: ActionScreen },
      { path: '/execute/:goalId', Component: ExecutionMode },
      { path: '/projects', Component: Projects },
      { path: '/momentum', Component: Momentum },
      { path: '/profile', Component: Profile },
    ],
    { initialEntries: [path] }
  );
}

// ─── Capture helper ────────────────────────────────────────────────────────────
async function capturePath(path: string): Promise<string | null> {
  return new Promise((resolve) => {
    const SHELL_W = 430;
    const SHELL_H = 932;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      position: fixed;
      left: -${SHELL_W + 200}px;
      top: 0;
      width: ${SHELL_W}px;
      height: ${SHELL_H}px;
      overflow: hidden;
      transform: translateZ(0);
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(wrapper);

    const router = buildRouter(path);
    const root = ReactDOMClient.createRoot(wrapper);
    root.render(
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    );

    // Wait for React render + animations to settle
    const timeout = setTimeout(async () => {

      // ── Shared colour-patching helpers ─────────────────────────────────────
      // These are used both to pre-patch the ORIGINAL document (so that
      // html2canvas's createStyleClone sees clean CSSOM) and to patch the
      // CLONED document in onclone (belt-and-suspenders for <link> sheets
      // and inline styles that bypass createStyleClone).

      const helperCanvas = document.createElement('canvas');
      helperCanvas.width = 1; helperCanvas.height = 1;
      const ctx2d = helperCanvas.getContext('2d');
      const cache = new Map<string, string>();

      const tryFill = (color: string): string | null => {
        if (!ctx2d) return null;
        try {
          ctx2d.clearRect(0, 0, 1, 1);
          ctx2d.fillStyle = color;
          ctx2d.fillRect(0, 0, 1, 1);
          const d = ctx2d.getImageData(0, 0, 1, 1).data;
          return `rgba(${d[0]},${d[1]},${d[2]},${+(d[3] / 255).toFixed(4)})`;
        } catch { return null; }
      };

      const toRGBA = (raw: string): string => {
        if (cache.has(raw)) return cache.get(raw)!;
        let result = tryFill(raw);
        // If conversion yielded transparent AND the raw value contains var(),
        // the canvas couldn't resolve the CSS variable. Strip the alpha arm
        // and retry with just oklch(L C H).
        if ((!result || result === 'rgba(0,0,0,0.0000)') && /var\s*\(/.test(raw)) {
          const noAlpha = raw.replace(/\s*\/\s*.+\)\s*$/, ')');
          if (noAlpha !== raw) result = tryFill(noAlpha);
        }
        const final = result ?? 'transparent';
        cache.set(raw, final);
        return final;
      };

      // Matches oklch(…) / oklab(…) with up to 1 level of nested parens.
      const badDirectRe  = () => /(?:oklch|oklab)\s*\([^()]*(?:\([^()]*\)[^()]*)*\)/gi;
      // Matches color-mix(in oklab/oklch, …) — Tailwind preflight ::placeholder.
      const badColorMixRe = () => /color-mix\s*\(\s*in\s+(?:oklab|oklch)\b[^()]*(?:\([^()]*\)[^()]*)*\)/gi;

      const hasBad  = (s: string) => badDirectRe().test(s) || badColorMixRe().test(s);
      const fixText = (s: string) => {
        let out = s.replace(badDirectRe(), (m) => toRGBA(m));
        out = out.replace(badColorMixRe(), 'transparent');
        return out;
      };

      // ── PRE-PATCH the ORIGINAL document's <style> elements ─────────────────
      // html2canvas's DocumentCloner.createStyleClone() reads node.sheet.cssRules
      // (rule.cssText) from the ORIGINAL document — BEFORE onclone fires. If the
      // original CSSOM still has oklch/oklab values, the cloned style elements
      // will contain them regardless of what onclone does afterward.
      // We patch here and restore in finally so the live UI is unaffected.
      const origPatches: { el: HTMLStyleElement; text: string }[] = [];
      document.querySelectorAll<HTMLStyleElement>('style').forEach((el) => {
        const t = el.textContent ?? '';
        if (hasBad(t)) {
          origPatches.push({ el, text: t });
          el.textContent = fixText(t);
        }
      });

      try {
        const target =
          (wrapper.querySelector('[data-mobile-shell]') as HTMLElement) ??
          wrapper;

        const canvas = await html2canvas(target, {
          backgroundColor: '#0D0B1E',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: SHELL_W,
          height: SHELL_H,
          windowWidth: SHELL_W,
          windowHeight: SHELL_H,
          x: 0,
          y: 0,
          onclone: (clonedDoc: Document) => {
            // Belt-and-suspenders: also patch the cloned document to cover
            // <link> stylesheets and any inline style attributes that weren't
            // handled by the pre-patch of the original document.
            try {
              // PASS 1 — <style> elements (already clean from pre-patch, but
              // re-run in case onclone creates fresh ones from injected CSS).
              clonedDoc.querySelectorAll('style').forEach((styleEl) => {
                const t = styleEl.textContent ?? '';
                if (hasBad(t)) styleEl.textContent = fixText(t);
              });

              // PASS 2 — <link rel="stylesheet"> sheets via CSSOM.
              Array.from(clonedDoc.styleSheets).forEach((sheet) => {
                if (sheet.ownerNode?.nodeName === 'STYLE') return;
                try {
                  const text = Array.from(sheet.cssRules).map((r) => r.cssText).join('\n');
                  if (!hasBad(text)) return;
                  const el = clonedDoc.createElement('style');
                  el.textContent = fixText(text);
                  clonedDoc.head.appendChild(el);
                  (sheet as CSSStyleSheet).disabled = true;
                } catch { /* cross-origin — skip */ }
              });

              // PASS 3 — inline style attributes.
              clonedDoc.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
                const s = el.getAttribute('style') ?? '';
                if (hasBad(s)) el.setAttribute('style', fixText(s));
              });
            } catch { /* never block capture */ }
          },
        });

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('[ScreenExport] Capture failed:', err);
        resolve(null);
      } finally {
        // ── RESTORE the original <style> elements ────────────────────────────
        origPatches.forEach(({ el, text }) => { el.textContent = text; });

        root.unmount();
        if (document.body.contains(wrapper)) {
          document.body.removeChild(wrapper);
        }
      }
    }, 2200);
  });
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ScreenExportModal({ open, onClose }: ScreenExportModalProps) {
  const { goals } = useGoalStore();
  const firstGoalId = goals[0]?.id;

  const buildScreenList = useCallback((): ScreenDef[] => {
    const base: ScreenDef[] = [
      { name: 'Home', emoji: '🏠', path: '/', status: 'pending' },
      { name: 'Goals & Projects', emoji: '🎯', path: '/projects', status: 'pending' },
      { name: 'Momentum', emoji: '⚡', path: '/momentum', status: 'pending' },
      { name: 'Profile', emoji: '👤', path: '/profile', status: 'pending' },
    ];
    if (firstGoalId) {
      base.splice(1, 0,
        { name: 'Action Screen', emoji: '🚀', path: `/action/${firstGoalId}`, status: 'pending' },
        { name: 'Execution Mode', emoji: '▶️', path: `/execute/${firstGoalId}`, status: 'pending' },
      );
    }
    return base;
  }, [firstGoalId]);

  const [screens, setScreens] = useState<ScreenDef[]>(buildScreenList);
  const [isExporting, setIsExporting] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [exportDone, setExportDone] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const updateStatus = (idx: number, status: ScreenStatus) => {
    setScreens((prev) => prev.map((s, i) => (i === idx ? { ...s, status } : s)));
  };

  const handleExport = async () => {
    const fresh = buildScreenList();
    setScreens(fresh);
    setIsExporting(true);
    setExportDone(false);
    setFailedCount(0);

    let failed = 0;

    for (let i = 0; i < fresh.length; i++) {
      setCurrentIdx(i);
      setScreens((prev) =>
        prev.map((s, idx) => (idx === i ? { ...s, status: 'capturing' } : s))
      );

      const dataUrl = await capturePath(fresh[i].path);

      if (dataUrl) {
        const safeName = fresh[i].name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `claryo_${safeName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setScreens((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: 'done' } : s))
        );
      } else {
        failed++;
        setScreens((prev) =>
          prev.map((s, idx) => (idx === i ? { ...s, status: 'error' } : s))
        );
      }

      // Brief pause between downloads so the browser doesn't block them
      await new Promise((r) => setTimeout(r, 200));
    }

    setFailedCount(failed);
    setCurrentIdx(-1);
    setIsExporting(false);
    setExportDone(true);
  };

  const handleClose = () => {
    if (isExporting) return;
    setExportDone(false);
    setScreens(buildScreenList());
    onClose();
  };

  const doneCount = screens.filter((s) => s.status === 'done').length;
  const progress =
    currentIdx >= 0 ? ((currentIdx + 1) / screens.length) * 100 : exportDone ? 100 : 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 rounded-t-3xl"
            style={{ background: '#16142A', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div className="px-6 pb-28 pt-3 overflow-y-auto max-h-[78vh]">
              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(79,70,229,0.2)' }}
                  >
                    <ImageDown size={16} color="#A5B4FC" />
                  </div>
                  <h3 style={{ color: '#F8FAFC', fontSize: 18, fontWeight: 700 }}>
                    Export Screens to PNG
                  </h3>
                </div>
                {!isExporting && (
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:opacity-60"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                  >
                    <X size={14} color="#94A3B8" />
                  </button>
                )}
              </div>
              <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
                Renders each app screen in the background and downloads them as individual high-resolution PNG files.
              </p>

              {/* Screen list */}
              <div className="flex flex-col gap-2 mb-5">
                {screens.map((screen, i) => {
                  const isActive = currentIdx === i;
                  const isDone = screen.status === 'done';
                  const isErr = screen.status === 'error';

                  return (
                    <motion.div
                      key={screen.name}
                      animate={{
                        borderColor: isActive
                          ? 'rgba(79,70,229,0.5)'
                          : isDone
                          ? 'rgba(34,197,94,0.25)'
                          : isErr
                          ? 'rgba(239,68,68,0.25)'
                          : 'rgba(255,255,255,0.06)',
                        background: isActive
                          ? 'rgba(79,70,229,0.1)'
                          : isDone
                          ? 'rgba(34,197,94,0.05)'
                          : 'rgba(255,255,255,0.03)',
                      }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      {/* Status icon */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isDone
                            ? 'rgba(34,197,94,0.15)'
                            : isActive
                            ? 'rgba(79,70,229,0.2)'
                            : isErr
                            ? 'rgba(239,68,68,0.15)'
                            : 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {isDone && <Check size={13} color="#22C55E" />}
                        {isActive && (
                          <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                            style={{ borderColor: 'rgba(165,180,252,0.3)', borderTopColor: '#A5B4FC' }}
                          />
                        )}
                        {isErr && <AlertCircle size={13} color="#EF4444" />}
                        {screen.status === 'pending' && (
                          <span style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>
                        )}
                      </div>

                      {/* Name */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span style={{ fontSize: 15 }}>{screen.emoji}</span>
                        <span
                          style={{
                            color: isDone
                              ? '#22C55E'
                              : isActive
                              ? '#A5B4FC'
                              : isErr
                              ? '#EF4444'
                              : '#94A3B8',
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {screen.name}
                        </span>
                      </div>

                      {/* Badge */}
                      {isDone && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontSize: 11, fontWeight: 600 }}
                        >
                          Saved ↓
                        </span>
                      )}
                      {isActive && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(79,70,229,0.15)', color: '#A5B4FC', fontSize: 11, fontWeight: 600 }}
                        >
                          Capturing…
                        </span>
                      )}
                      {isErr && (
                        <span
                          className="px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontSize: 11, fontWeight: 600 }}
                        >
                          Failed
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div
                className="w-full rounded-full overflow-hidden mb-5"
                style={{ height: 5, background: 'rgba(255,255,255,0.07)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #4F46E5, #22C55E)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              {/* Done banner */}
              <AnimatePresence>
                {exportDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4"
                    style={{
                      background: failedCount
                        ? 'rgba(245,158,11,0.08)'
                        : 'rgba(34,197,94,0.08)',
                      border: `1px solid ${failedCount ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.2)'}`,
                    }}
                  >
                    {failedCount ? (
                      <AlertCircle size={15} color="#F59E0B" />
                    ) : (
                      <Check size={15} color="#22C55E" />
                    )}
                    <span
                      style={{
                        color: failedCount ? '#F59E0B' : '#22C55E',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {failedCount
                        ? `${doneCount} exported, ${failedCount} failed. Check your browser settings.`
                        : `${doneCount} screen${doneCount !== 1 ? 's' : ''} exported successfully! 🎉`}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA button */}
              <button
                onClick={exportDone ? handleClose : handleExport}
                disabled={isExporting}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.97]"
                style={{
                  background: isExporting
                    ? 'rgba(255,255,255,0.05)'
                    : exportDone
                    ? 'rgba(34,197,94,0.15)'
                    : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: isExporting ? '#94A3B8' : exportDone ? '#22C55E' : '#fff',
                  fontSize: 16,
                  fontWeight: 700,
                  border: exportDone ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                }}
              >
                {isExporting ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 animate-spin"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}
                    />
                    Exporting {currentIdx + 1} of {screens.length}…
                  </>
                ) : exportDone ? (
                  <>
                    <Check size={16} />
                    Done
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Export All {screens.length} Screens
                  </>
                )}
              </button>

              {!isExporting && !exportDone && (
                <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
                  Make sure your browser allows multiple file downloads
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}