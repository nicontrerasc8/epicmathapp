'use client'

import { useState, ReactNode, createContext, useContext, ButtonHTMLAttributes } from 'react'

type TabsContextType = {
  value: string
  setValue: (val: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

export function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  const [value, setValue] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex justify-center gap-2 mb-4">{children}</div>
}



export function TabsTrigger({
  value,
  children,
  ...props
}: {
  value: string
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs')

  const isActive = ctx.value === value

  return (
    <button
      {...props}
      onClick={(e) => {
        ctx.setValue(value)
        props.onClick?.(e)
      }}
      className={`px-4 py-2 rounded-md border text-sm font-medium transition ${
        isActive
          ? 'bg-primary text-white border-primary'
          : 'bg-muted text-foreground border-border'
      }`}
    >
      {children}
    </button>
  )
}

