import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { Bell, BatteryFull, Search, Volume2, VolumeX, Wifi } from 'lucide-react';
import { BrandMark } from '@/components/desktop/app-icon';
import { Button } from '@/components/ui/button';
import { getApp, pinned } from '@/lib/apps';
import type { AppId, DesktopWindow } from '@/types/desktop';

const BASE_ICON_SIZE = 48;
const MAX_ICON_SIZE = 72;
const MAGNIFY_DISTANCE = 155;
const SPRING_CONFIG = { mass: 0.1, stiffness: 240, damping: 18 };

export interface DockTabsProps {
  windows: DesktopWindow[];
  activeId: AppId | null;
  panel: 'start' | 'search' | 'notifications' | 'quick' | null;
  now: Date;
  preferences: {
    sound: boolean;
    notifications: boolean;
    focusMode: boolean;
    taskbarLabels: boolean;
  };
  unreadCount: number;
  onAppClick: (id: AppId) => void;
  onAppContextMenu: (e: React.MouseEvent, id: AppId) => void;
  onTogglePanel: (panel: 'start' | 'search' | 'notifications' | 'quick') => void;
}

interface DockIconProps {
  id: AppId;
  mouseX: MotionValue<number>;
  magnifyEnabled: boolean;
  isRunning: boolean;
  isActive: boolean;
  showDetailedTitle: boolean;
  extraClass?: string;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function DockIcon({
  id,
  mouseX,
  magnifyEnabled,
  isRunning,
  isActive,
  showDetailedTitle,
  extraClass = '',
  onClick,
  onContextMenu,
}: DockIconProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const app = getApp(id);
  const Icon = app.icon;

  const distance = useTransform(mouseX, val => {
    if (!magnifyEnabled || val === Infinity) return Infinity;
    const bounds = ref.current?.getBoundingClientRect();
    if (!bounds) return Infinity;
    return val - bounds.x - bounds.width / 2;
  });

  // Raised-cosine bell curve for silky-smooth macOS-style acceleration at peak and edges
  const targetSize = useTransform(distance, d => {
    if (!Number.isFinite(d) || Math.abs(d) >= MAGNIFY_DISTANCE) return BASE_ICON_SIZE;
    const factor = 0.5 * (1 + Math.cos((Math.PI * d) / MAGNIFY_DISTANCE));
    return BASE_ICON_SIZE + (MAX_ICON_SIZE - BASE_ICON_SIZE) * factor;
  });
  const size = useSpring(targetSize, SPRING_CONFIG);
  const iconScale = useTransform(size, [BASE_ICON_SIZE, MAX_ICON_SIZE], [1, 1.38]);
  const liftY = useTransform(size, [BASE_ICON_SIZE, MAX_ICON_SIZE], [0, -5]);

  const showTooltip = magnifyEnabled && (hovered || focused);

  return (
    <motion.button
      ref={ref}
      type="button"
      className={`lifeos-dock-item ${isActive ? 'is-active' : ''} ${extraClass}`}
      style={magnifyEnabled ? { width: size, height: size, y: liftY } : {}}
      aria-label={`${app.name} taskbar`}
      aria-pressed={isActive}
      title={showDetailedTitle ? `${app.name} · ${isRunning ? 'Running' : 'Open'}` : app.name}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      whileTap={{ scale: 0.92 }}
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.span
            className="lifeos-dock-tooltip"
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ duration: 0.14 }}
            role="tooltip"
          >
            {app.name}
          </motion.span>
        )}
      </AnimatePresence>

      <span className={`lifeos-dock-icon app-icon ${app.tone}`}>
        <span className="lifeos-dock-shine" aria-hidden="true" />
        <motion.span
          className="lifeos-dock-svg-wrap"
          style={magnifyEnabled ? { scale: iconScale } : {}}
        >
          <Icon />
        </motion.span>
      </span>

      {isRunning && (
        <span
          className={`dock-indicator ${isActive ? 'active' : ''}`}
          aria-hidden="true"
        />
      )}
    </motion.button>
  );
}

export function DockTabs({
  windows,
  activeId,
  panel,
  now,
  preferences,
  unreadCount,
  onAppClick,
  onAppContextMenu,
  onTogglePanel,
}: DockTabsProps) {
  const mouseX = useMotionValue<number>(Infinity);
  const prefersReducedMotion = useReducedMotion();
  const [isTouchOrNarrow, setIsTouchOrNarrow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const coarseMedia = window.matchMedia('(pointer: coarse)');
    const narrowMedia = window.matchMedia('(max-width: 700px)');

    const update = () => setIsTouchOrNarrow(coarseMedia.matches || narrowMedia.matches);
    update();

    coarseMedia.addEventListener('change', update);
    narrowMedia.addEventListener('change', update);
    return () => {
      coarseMedia.removeEventListener('change', update);
      narrowMedia.removeEventListener('change', update);
    };
  }, []);

  const magnifyEnabled = !isTouchOrNarrow && !prefersReducedMotion;
  const extraWindows = windows.filter(w => !pinned.includes(w.id));

  return (
    <footer
      className="taskbar lifeos-dock"
      aria-label="Taskbar"
      onPointerMove={e => {
        if (!magnifyEnabled || e.pointerType === 'touch') return;
        mouseX.set(e.clientX);
      }}
      onPointerLeave={() => mouseX.set(Infinity)}
    >
      <Button
        variant="desktop"
        className="dock-button lifeos-dock-utility"
        title="Start"
        aria-label="Open Start menu"
        aria-expanded={panel === 'start'}
        onClick={() => onTogglePanel('start')}
      >
        <BrandMark />
      </Button>

      <Button
        variant="desktop"
        className="dock-button lifeos-dock-utility"
        title="Search · Ctrl K"
        aria-label="Open global search"
        onClick={() => onTogglePanel('search')}
      >
        <Search />
      </Button>

      <span className="dock-separator" aria-hidden="true" />

      <div className="lifeos-dock-apps" role="toolbar" aria-label="Pinned applications">
        {pinned.map((id, i) => {
          const w = windows.find(win => win.id === id);
          const isRunning = Boolean(w);
          const isActive = activeId === id && Boolean(w && !w.minimized);
          return (
            <DockIcon
              key={id}
              id={id}
              mouseX={mouseX}
              magnifyEnabled={magnifyEnabled}
              isRunning={isRunning}
              isActive={isActive}
              showDetailedTitle={preferences.taskbarLabels}
              extraClass={i > 3 ? 'desktop-pinned' : ''}
              onClick={() => onAppClick(id)}
              onContextMenu={e => onAppContextMenu(e, id)}
            />
          );
        })}

        {extraWindows.map(w => {
          const isActive = activeId === w.id && !w.minimized;
          return (
            <DockIcon
              key={w.id}
              id={w.id}
              mouseX={mouseX}
              magnifyEnabled={magnifyEnabled}
              isRunning
              isActive={isActive}
              showDetailedTitle={preferences.taskbarLabels}
              extraClass="extra-open"
              onClick={() => onAppClick(w.id)}
              onContextMenu={e => onAppContextMenu(e, w.id)}
            />
          );
        })}
      </div>

      <span className="dock-separator" aria-hidden="true" />

      <div className="system-tray">
        <Button
          variant="desktop"
          className="tray-settings"
          title="Quick settings · system indicators are previews"
          aria-label="Quick settings"
          onClick={() => onTogglePanel('quick')}
        >
          <Wifi />
          {preferences.sound ? <Volume2 /> : <VolumeX />}
          <BatteryFull />
        </Button>

        <Button
          variant="desktop"
          className="tray-clock"
          title="Date and notifications"
          aria-label="Date and notifications"
          onClick={() => onTogglePanel('notifications')}
        >
          <span>{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          <span>{now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>
        </Button>

        <Button
          variant="desktop"
          className="notification-button"
          title="Notifications"
          aria-label="Open notifications"
          onClick={() => onTogglePanel('notifications')}
        >
          <Bell />
          {!!unreadCount && preferences.notifications && !preferences.focusMode && (
            <span className="notification-dot" />
          )}
        </Button>
      </div>
    </footer>
  );
}
