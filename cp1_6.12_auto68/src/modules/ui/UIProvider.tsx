import React, { createContext, useContext, ReactNode } from 'react'

interface UITheme {
  bgPrimary: string
  bgGlass: string
  borderGlass: string
  textPrimary: string
  textSecondary: string
  accent: string
  transition: string
}

const defaultTheme: UITheme = {
  bgPrimary: '#1a1a2e',
  bgGlass: 'rgba(255, 255, 255, 0.08)',
  borderGlass: '1px solid rgba(255, 255, 255, 0.12)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  accent: '#8b5cf6',
  transition: 'all 300ms ease-out'
}

const UIContext = createContext<UITheme>(defaultTheme)

export const useUI = () => useContext(UIContext)

interface UIProviderProps {
  children: ReactNode
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  return (
    <UIContext.Provider value={defaultTheme}>
      {children}
    </UIContext.Provider>
  )
}

export default UIProvider
