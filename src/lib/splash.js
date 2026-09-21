// Fades out and removes the boot splash defined inline in index.html.
// Called once the initial session check (AuthContext's /me call) settles,
// success or failure — matching how the splash is only ever meant to cover
// "are we signed in?", not any particular page's own data loading.
export function hideSplash() {
  const el = document.getElementById('fb-splash')
  if (!el || el.classList.contains('is-hidden')) return
  el.classList.add('is-hidden')
  window.setTimeout(() => el.remove(), 480)
}
