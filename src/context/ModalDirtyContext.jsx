import { createContext, useContext, useEffect, useState } from 'react'

const ModalDirtyContext = createContext(null)

export function ModalDirtyProvider({ children }) {
  const [dirty, setDirty] = useState(false)
  return <ModalDirtyContext.Provider value={{ dirty, setDirty }}>{children}</ModalDirtyContext.Provider>
}

// Call with the current dirty state of an open modal's form. Registers it
// globally (for the sidebar nav guard) and clears itself automatically when
// the form stops being dirty or the owning component unmounts.
export function useRegisterModalDirty(isDirty) {
  const ctx = useContext(ModalDirtyContext)
  useEffect(() => {
    if (!ctx) return undefined
    ctx.setDirty(isDirty)
    return () => ctx.setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])
}

export function useModalDirty() {
  const ctx = useContext(ModalDirtyContext)
  return ctx?.dirty ?? false
}
