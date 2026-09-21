/** Role identifiers — must match App\Enums\UserRole on the server. */
export const ROLES = {
  DISBURSING_OFFICER: 'disbursing_officer',
  BUDGET_OFFICER: 'budget_officer',
  FINANCIAL_ANALYST: 'financial_analyst',
  ADMIN: 'admin',
}

export const ROLE_LABELS = {
  disbursing_officer: 'Disbursing Officer',
  budget_officer: 'Budget Officer',
  financial_analyst: 'Financial Analyst',
  admin: 'Administrator',
}

/** Roles that can be created/edited on the Users page (system has one admin). */
export const ASSIGNABLE_ROLE_LABELS = {
  disbursing_officer: 'Disbursing Officer',
  budget_officer: 'Budget Officer',
  financial_analyst: 'Financial Analyst',
}
