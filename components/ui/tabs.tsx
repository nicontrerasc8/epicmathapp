'use client'

import {
  useState,
  ReactNode,
  createContext,
  useContext,
  ButtonHTMLAttributes,
} from 'react'

// Context type definition
type TabsContextType = {
  value: string
  setValue: (val: string) => void
}

// Create context
const TabsContext = createContext<TabsContextType | undefined>(undefined)

// Tabs root component
export function Tabs({
  defaultValue,
  children,
  className,
  value: controlledValue,
  onValueChange,
}: {
  defaultValue: any
  children: any
  className?: any
  value?: any
  onValueChange?: (value: any) => void
}) {
  const isControlled = controlledValue !== undefined && onValueChange !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const value = isControlled ? controlledValue : uncontrolledValue
  const setValue = isControlled ? onValueChange : setUncontrolledValue

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

// Tabs header list
export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

// Tab button
export function TabsTrigger({
  value,
  children,
  className,
  ...props
}: {
  value: string
  children: ReactNode
  className?: string
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
      } ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

// Tabs content area
export function TabsContent({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('TabsContent must be used within Tabs')

  return ctx.value === value ? <div className={className}>{children}</div> : null
}
