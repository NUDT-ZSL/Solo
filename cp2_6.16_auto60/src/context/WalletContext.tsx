import React, { createContext, useContext, useState, ReactNode } from 'react'
import { IWalletSettings, WalletStyle, StitchType } from '@/types'

interface WalletContextType {
  settings: IWalletSettings
  updateSettings: (partial: Partial<IWalletSettings>) => void
}

const defaultSettings: IWalletSettings = {
  style: WalletStyle.SHORT_FOLD,
  color: '#8B4513',
  texture: 'grain',
  stitchType: 'single',
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<IWalletSettings>(defaultSettings)

  const updateSettings = (partial: Partial<IWalletSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }))
  }

  return (
    <WalletContext.Provider value={{ settings, updateSettings }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
