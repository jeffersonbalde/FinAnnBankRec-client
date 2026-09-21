import PageHeader from '../components/PageHeader'

export default function PlaceholderPage({ title, phase }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="fb-empty">
        This module is delivered in <strong style={{ color: 'var(--ink-soft)' }}>{phase}</strong>.
      </div>
    </div>
  )
}
