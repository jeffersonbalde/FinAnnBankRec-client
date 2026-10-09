/**
 * Loading placeholders that mirror the real layout (stat cards, chart/list cards),
 * so a page keeps its shape while data loads instead of showing a lone spinner and
 * then jumping.
 */

/** A row of stat cards, same grid and card size as `.fb-stats` / `.fb-stat`. */
export function StatSkeleton({ count = 4, style }) {
  return (
    <div className="fb-stats" style={style} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="fb-stat fb-stat--skeleton" key={i}>
          <span className="fb-skel fb-skel--label" />
          <span className="fb-skel fb-skel--value" />
        </div>
      ))}
    </div>
  )
}

/** A titled card with a shimmering body, e.g. a chart. */
export function CardSkeleton({ height = '12rem' }) {
  return (
    <div className="fb-card" aria-hidden="true">
      <div className="fb-card__head">
        <span className="fb-skel fb-skel--title" />
      </div>
      <div className="fb-card__body" style={{ height }}>
        <span className="fb-skel fb-skel--block" />
      </div>
    </div>
  )
}

/** A card listing a few two-line rows (notifications, activity…). */
export function ListSkeleton({ rows = 5 }) {
  return (
    <div className="fb-card fb-skel-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="fb-skel-list__row" key={i}>
          <span className="fb-skel fb-skel--dot" />
          <div className="fb-skel-list__text">
            <span className="fb-skel" style={{ width: `${55 + ((i * 11) % 35)}%` }} />
            <span className="fb-skel" style={{ width: `${25 + ((i * 7) % 20)}%`, height: '0.65rem' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** The grid of user cards, same shape as the real ones. */
export function UserGridSkeleton({ count = 6 }) {
  return (
    <div className="fb-user-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="fb-user-card" key={i}>
          <div className="fb-user-card__photo">
            <span className="fb-skel fb-skel--block" style={{ borderRadius: 0 }} />
          </div>
          <div className="fb-user-card__body">
            <span className="fb-skel" style={{ display: 'block', width: '60%', height: '1rem' }} />
            <span className="fb-skel" style={{ display: 'block', width: '40%', marginTop: '0.5rem' }} />
            <span className="fb-skel" style={{ display: 'block', width: '85%', marginTop: '0.9rem' }} />
          </div>
        </div>
      ))}
    </div>
  )
}