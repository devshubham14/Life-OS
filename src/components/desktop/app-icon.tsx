import { getApp } from '@/lib/apps';
import type { AppId } from '@/types/desktop';
export function AppIcon({ id, small = false }: { id: AppId; small?: boolean }) { const app = getApp(id); return <span className={`app-icon ${app.tone} ${small ? 'small' : ''}`}><app.icon /></span>; }
export function BrandMark() { return <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>; }
