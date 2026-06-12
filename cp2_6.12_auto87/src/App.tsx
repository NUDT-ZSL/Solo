import type { ReactNode } from 'react'

interface AppProps {
  children: ReactNode
}

export default function App({ children }: AppProps) {
  return (
    <div className="w-full h-full">
      {children}
    </div>
  )
}
