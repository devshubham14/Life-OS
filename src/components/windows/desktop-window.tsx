import { useState, type PointerEvent, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Minus, Square, Copy, X, Columns2, PanelLeft, PanelRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApp } from '@/lib/apps';
import { useWindows } from '@/stores/window-manager';
import type { DesktopWindow, Geometry } from '@/types/desktop';
export function Window({ window: win, children }: { window: DesktopWindow; children: ReactNode }) {
  const { state, dispatch } = useWindows();
  const [snap, setSnap] = useState(false);
  const reduced = useReducedMotion();
  const app = getApp(win.id);
  const mode = win.mode;
  const style = mode === 'normal' ? { left: win.geometry.x, top: win.geometry.y, width: win.geometry.width, height: win.geometry.height, zIndex: win.z + 100 } : { top: 55, left: mode === 'right' ? '50%' : 8, width: mode === 'maximized' ? 'calc(100% - 16px)' : 'calc(50% - 12px)', height: 'calc(100dvh - 150px)', zIndex: win.z + 100 };
  function startInteraction(event: PointerEvent<HTMLElement>, edge?: string) {
    if (window.innerWidth <= 700 || event.button !== 0 || (!edge && (event.target as HTMLElement).closest('button'))) return;
    event.preventDefault();
    dispatch({ type: 'focus', id: win.id });
    const startX = event.clientX; const startY = event.clientY;
    const element = event.currentTarget;
    element.setPointerCapture(event.pointerId);
    let original = win.geometry;
    if (win.mode !== 'normal' && !edge) { original = { ...win.geometry, x: Math.max(0, event.clientX - win.geometry.width / 2), y: 55 }; dispatch({ type: 'mode', id: win.id, mode: 'normal' }); }
    const move = (e: globalThis.PointerEvent) => {
      const dx = e.clientX - startX; const dy = e.clientY - startY;
      const geometry: Geometry = { ...original };
      if (!edge) { geometry.x = Math.max(0, Math.min(window.innerWidth - 150, original.x + dx)); geometry.y = Math.max(54, Math.min(window.innerHeight - 140, original.y + dy)); }
      else {
        if (edge.includes('e')) geometry.width = Math.max(420, Math.min(window.innerWidth - original.x, original.width + dx));
        if (edge.includes('s')) geometry.height = Math.max(300, Math.min(window.innerHeight - original.y - 95, original.height + dy));
        if (edge.includes('w')) { geometry.width = Math.max(420, Math.min(original.x + original.width, original.width - dx)); geometry.x = original.x + original.width - geometry.width; }
        if (edge.includes('n')) { geometry.height = Math.max(300, Math.min(original.y + original.height - 54, original.height - dy)); geometry.y = original.y + original.height - geometry.height; }
      }
      dispatch({ type: 'geometry', id: win.id, geometry });
    };
    const end = (e: globalThis.PointerEvent) => {
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', end); element.removeEventListener('pointercancel', cancel);
      if (!edge && e.clientX < 15) dispatch({ type: 'mode', id: win.id, mode: 'left' });
      else if (!edge && e.clientX > window.innerWidth - 15) dispatch({ type: 'mode', id: win.id, mode: 'right' });
      else if (!edge && e.clientY < 20) dispatch({ type: 'mode', id: win.id, mode: 'maximized' });
    };
    const cancel = () => { element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', end); element.removeEventListener('pointercancel', cancel); };
    element.addEventListener('pointermove', move); element.addEventListener('pointerup', end); element.addEventListener('pointercancel', cancel);
  }
  return <motion.section role="dialog" aria-label={`${app.name} application`} className={`os-window ${state.active === win.id ? 'active' : ''}`} style={style} initial={reduced ? false : { opacity: 0, scale: .965, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .97, y: 10 }} transition={{ duration: .18 }} onPointerDown={() => { if (state.active !== win.id) dispatch({ type: 'focus', id: win.id }); }}>
    <header className="window-titlebar" onPointerDown={e => startInteraction(e)} onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) dispatch({ type: 'mode', id: win.id, mode: mode === 'normal' ? 'maximized' : 'normal' }); }}>
      <span className="title-label"><app.icon />{app.name}<span className="text-muted-foreground">— LIFEOS</span></span>
      <div className="window-controls">
        <Button variant="window" size="icon" title={`Minimize ${app.name}`} aria-label={`Minimize ${app.name}`} onClick={() => dispatch({ type: 'minimize', id: win.id })}><Minus /></Button>
        <Button variant="window" size="icon" className="maximize-control" title={mode === 'normal' ? 'Maximize · right-click for snap layouts' : 'Restore window'} aria-label={`${mode === 'normal' ? 'Maximize' : 'Restore'} ${app.name}`} onContextMenu={e => { e.preventDefault(); setSnap(s => !s); }} onClick={() => dispatch({ type: 'mode', id: win.id, mode: mode === 'normal' ? 'maximized' : 'normal' })}>{mode === 'normal' ? <Square /> : <Copy />}</Button>
        <Button variant="window" size="icon" title={`Close ${app.name}`} aria-label={`Close ${app.name}`} onClick={() => dispatch({ type: 'close', id: win.id })}><X /></Button>
      </div>
    </header>
    {snap && <div className="snap-menu">{([{ mode: 'left', icon: PanelLeft, label: 'Snap left' }, { mode: 'right', icon: PanelRight, label: 'Snap right' }, { mode: 'normal', icon: Columns2, label: 'Restore position' }] as const).map(item => <Button key={item.mode} variant="desktop" size="icon" title={item.label} aria-label={item.label} onClick={() => { dispatch({ type: 'mode', id: win.id, mode: item.mode }); setSnap(false); }}><item.icon /></Button>)}</div>}
    <div className="window-content">{children}</div>
    {mode === 'normal' && ['n','s','e','w','ne','nw','se','sw'].map(edge => <div key={edge} className={`resize-handle resize-${edge}`} onPointerDown={e => startInteraction(e, edge)} />)}
  </motion.section>;
}
