import { useState } from 'react'
import { InstrumentType, EnsembleResult } from '@/types'
import InstrumentSelector from '@/components/InstrumentSelector'
import RehearsalRoom from '@/components/RehearsalRoom'
import SummaryPanel from '@/components/SummaryPanel'

export default function App() {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [ensembleResult, setEnsembleResult] = useState<EnsembleResult | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  const handleSelectInstrument = async (instrument: InstrumentType) => {
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instrument }),
      })
      const data = await response.json()
      setSessionId(data.sessionId)
    } catch {
      setSessionId('local-' + Date.now())
    }
    setSelectedInstrument(instrument)
  }

  const handleComplete = async (result: EnsembleResult) => {
    try {
      await fetch('/api/ensemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, result }),
      })
    } catch {
      // local mode fallback
    }
    setEnsembleResult(result)
    setShowSummary(true)
  }

  const handleClose = () => {
    setSelectedInstrument(null)
    setEnsembleResult(null)
    setShowSummary(false)
    setSessionId(null)
  }

  const handleRestart = () => {
    setEnsembleResult(null)
    setShowSummary(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      }}
    >
      {!selectedInstrument && (
        <InstrumentSelector onSelect={handleSelectInstrument} />
      )}
      {selectedInstrument && !showSummary && (
        <RehearsalRoom instrument={selectedInstrument} onComplete={handleComplete} />
      )}
      {showSummary && ensembleResult && (
        <SummaryPanel
          result={ensembleResult}
          onClose={handleClose}
          onRestart={handleRestart}
        />
      )}
    </div>
  )
}
