import { useState } from 'react'
import PageHeader from '../../components/PageHeader'
import Tabs from '../../components/ui/Tabs'
import BankAccountsTab from './BankAccountsTab'
import UsersTab from './UsersTab'
import UacsTab from './UacsTab'

const TABS = [
  { key: 'bank-accounts', label: 'Bank Accounts', Component: BankAccountsTab },
  { key: 'users', label: 'Users', Component: UsersTab },
  { key: 'uacs', label: 'UACS Codes', Component: UacsTab },
]

export default function MasterDataPage() {
  const [active, setActive] = useState('bank-accounts')
  const ActiveComponent = TABS.find((t) => t.key === active).Component

  return (
    <div>
      <PageHeader title="Master Data" subtitle="Reference data managed by the administrator." />

      <Tabs tabs={TABS} active={active} onChange={setActive} />

      <div style={{ marginTop: '1.35rem' }}>
        <ActiveComponent />
      </div>
    </div>
  )
}
