import { presenceLabels, type PresenceConnection } from '../online-presence';

export default function PresenceIndicator({ count, connection }: { count: number; connection: PresenceConnection }) {
  const connected = connection === 'connected';
  return <span role="status" aria-live="polite" aria-atomic="true" className="inline-flex items-center gap-2">
    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
    <span>활성 계정 {connected ? `${count.toLocaleString('ko-KR')}명` : '—'} · {presenceLabels[connection]}</span>
  </span>;
}
