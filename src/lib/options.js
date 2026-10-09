/**
 * Shapes database rows into options for the SearchableSelect combobox, so every
 * picker in the app lists bank accounts (and so on) the same way.
 */

function accountTriggerLabel(a) {
  return `${a.bank_short_name || a.bank_name} · ${a.account_number} · ${a.fund_cluster}`
}

/**
 * @param {Array<object>} accounts rows with bank_name, bank_short_name, account_number, fund_cluster, entity_name…
 * @param {{ allLabel?: string }} [opts] pass allLabel to add a leading "All …" choice (for filters)
 */
export function bankAccountOptions(accounts, { allLabel } = {}) {
  const rows = accounts.map((a) => ({
    value: a.id,
    label: `${a.bank_short_name || a.bank_name} · ${a.account_number}`,
    meta: `${a.fund_cluster}${a.entity_name ? ` — ${a.entity_name}` : ''}`,
    displayLabel: accountTriggerLabel(a),
    keywords: `${a.bank_name} ${a.bank_short_name} ${a.account_number} ${a.account_name || ''} ${a.fund_cluster} ${a.entity_name || ''}`,
  }))

  return allLabel ? [{ value: '', label: allLabel, displayLabel: allLabel, keywords: 'all' }, ...rows] : rows
}

/**
 * UACS object codes, searchable by code or title. A code already saved on a
 * record but missing from the list (retired, or typed before the list existed)
 * is kept as a choice so it isn't silently lost.
 */
export function uacsOptions(codes, currentValue = '') {
  const rows = codes.map((u) => ({
    value: u.code,
    label: u.code,
    meta: u.description,
    displayLabel: `${u.code} — ${u.description}`,
    keywords: `${u.code} ${u.description}`,
  }))

  const known = currentValue === '' || rows.some((r) => r.value === currentValue)
  const orphan = known ? [] : [{ value: currentValue, label: currentValue, meta: 'Not in the UACS list', displayLabel: currentValue, keywords: currentValue }]

  return [{ value: '', label: 'No UACS code', displayLabel: 'No UACS code', keywords: 'none clear' }, ...orphan, ...rows]
}
