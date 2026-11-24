import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react';
import { validAppIds } from '@/lib/apps';
import type { AppId, Geometry, WindowMode, WindowState } from '@/types/desktop';

export type WindowAction =
  | { type: 'open'; id: AppId; geometry: Geometry }
  | { type: 'focus' | 'minimize' | 'close'; id: AppId }
  | { type: 'mode'; id: AppId; mode: WindowMode }
  | { type: 'geometry'; id: AppId; geometry: Geometry }
  | { type: 'restore'; state: WindowState };

export const initialWindowState: WindowState = {
  windows: [{ id: 'home', geometry: { x: 180, y: 112, width: 920, height: 644 }, mode: 'normal', minimized: false, z: 1 }],
  active: 'home',
  nextZ: 2,
};

export function windowReducer(state: WindowState, action: WindowAction): WindowState {
  if (action.type === 'restore') return action.state;
  if (action.type === 'open') {
    const existing = state.windows.find(w => w.id === action.id);
    return {
      windows: existing
        ? state.windows.map(w => (w.id === action.id ? { ...w, minimized: false, z: state.nextZ } : w))
        : [...state.windows, { id: action.id, geometry: action.geometry, mode: 'normal', minimized: false, z: state.nextZ }],
      active: action.id,
      nextZ: state.nextZ + 1,
    };
  }
  if (action.type === 'close') {
    const windows = state.windows.filter(w => w.id !== action.id);
    return {
      ...state,
      windows,
      active:
        state.active === action.id
          ? windows.filter(w => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null
          : state.active,
    };
  }
  if (action.type === 'minimize') {
    const windows = state.windows.map(w => (w.id === action.id ? { ...w, minimized: true } : w));
    return {
      ...state,
      windows,
      active:
        state.active === action.id
          ? windows.filter(w => !w.minimized).sort((a, b) => b.z - a.z)[0]?.id ?? null
          : state.active,
    };
  }
  if (action.type === 'focus') {
    return {
      ...state,
      windows: state.windows.map(w => (w.id === action.id ? { ...w, z: state.nextZ, minimized: false } : w)),
      active: action.id,
      nextZ: state.nextZ + 1,
    };
  }
  if (action.type === 'mode') {
    return {
      ...state,
      windows: state.windows.map(w => (w.id === action.id ? { ...w, mode: action.mode } : w)),
    };
  }
  if (action.type === 'geometry') {
    return {
      ...state,
      windows: state.windows.map(w => (w.id === action.id ? { ...w, geometry: action.geometry } : w)),
    };
  }
  return state;
}

const Context = createContext<{
  state: WindowState;
  dispatch: React.Dispatch<WindowAction>;
  open: (id: AppId) => void;
} | null>(null);

export function WindowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(windowReducer, initialWindowState);
  const ready = useRef(false);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const geometry = {
      x: Math.max(100, (width - 1180) / 2 + 80),
      y: Math.max(68, Math.min(112, height * 0.12)),
      width: Math.min(940, Math.max(620, width - 460)),
      height: Math.min(644, height - 180),
    };
    let restored = { ...initialWindowState, windows: initialWindowState.windows.map(w => ({ ...w, geometry })) };
    try {
      const saved = JSON.parse(localStorage.getItem('lifeos.windows.v1') ?? 'null') as WindowState | null;
      if (
        saved &&
        Array.isArray(saved.windows) &&
        saved.windows.length < 20 &&
        saved.windows.every(
          w =>
            validAppIds.includes(w.id) &&
            w.geometry &&
            Object.values(w.geometry).every(n => typeof n === 'number' && Number.isFinite(n)),
        )
      ) {
        restored = {
          ...saved,
          nextZ: Math.max(1, ...saved.windows.map(w => w.z)) + 1,
          windows: saved.windows.map(w => ({
            ...w,
            geometry: {
              x: Math.max(0, Math.min(w.geometry.x, width - 160)),
              y: Math.max(42, Math.min(w.geometry.y, height - 130)),
              width: Math.max(420, Math.min(w.geometry.width, width)),
              height: Math.max(300, Math.min(w.geometry.height, height - 110)),
            },
          })),
        };
      }
    } catch {
      /* Use the safe desktop default. */
    }
    dispatch({ type: 'restore', state: restored });
    ready.current = true;
  }, []);

  useEffect(() => {
    if (ready.current) {
      try {
        localStorage.setItem('lifeos.windows.v1', JSON.stringify(state));
      } catch {
        /* Optional persistence. */
      }
    }
  }, [state]);

  const open = (id: AppId) =>
    dispatch({
      type: 'open',
      id,
      geometry: {
        x: Math.max(30, Math.min(200 + state.windows.length * 26, window.innerWidth - 680)),
        y: Math.max(60, 92 + state.windows.length * 20),
        width: Math.min(860, window.innerWidth - 60),
        height: Math.min(620, window.innerHeight - 170),
      },
    });

  return <Context.Provider value={{ state, dispatch, open }}>{children}</Context.Provider>;
}

export function useWindows() {
  const value = useContext(Context);
  if (!value) throw new Error('WindowProvider is required');
  return value;
}
