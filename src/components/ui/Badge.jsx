const TONE = {
  green: 'ok',
  ok: 'ok',
  amber: 'warn',
  warn: 'warn',
  red: 'danger',
  danger: 'danger',
  blue: 'blue',
  slate: 'slate',
}

export default function Badge({ tone = 'slate', children }) {
  return <span className={`fb-badge fb-badge--${TONE[tone] ?? 'slate'}`}>{children}</span>
}

export function ActiveBadge({ active }) {
  return <Badge tone={active ? 'ok' : 'slate'}>{active ? 'Active' : 'Inactive'}</Badge>
}
