export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="fb-page__header">
      <div>
        <h1 className="fb-page__title">{title}</h1>
        {subtitle && <p className="fb-page__sub">{subtitle}</p>}
      </div>
      {actions && <div className="fb-page__actions">{actions}</div>}
    </div>
  )
}
