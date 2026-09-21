import { useEffect, useRef } from 'react'

export default function Tabs({ tabs, active, onChange }) {
  const listRef = useRef(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const activeBtn = list.querySelector('.fb-tabs__tab.is-active')
    if (!activeBtn) return
    activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <div className="fb-tabs" role="tablist" ref={listRef}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={`fb-tabs__tab${active === tab.key ? ' is-active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.badge != null && <span className="fb-tabs__count">{tab.badge}</span>}
        </button>
      ))}
    </div>
  )
}
