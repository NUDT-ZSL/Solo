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
      const response = await fetch('http://localhost:5000/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ instrument }),
      })
      const data = await response.json()
      setSessionId(data.sessionId)
      setSelectedInstrument(instrument)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }

  const handleComplete = async (result: EnsembleResult) => {
    try {
      await fetch('http://localhost:5000/api/ensemble', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, result }),
      })
      setEnsembleResult(result)
      setShowSummary(true)
    } catch (error) {
      console.error('Failed to save ensemble record:', error)
    }
  }

  const handleBack = () => {
    setEnsembleResult(null)
    setShowSummary(false)
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        transition: 'all var(--transition-normal)',
      }}
    >
      {!selectedInstrument && (
        <InstrumentSelector onSelect={handleSelectInstrument} />
      )}
      {selectedInstrument && !showSummary && (
        <RehearsalRoom instrument={selectedInstrument} onComplete={handleComplete} />
      )}
      {showSummary && ensembleResult && (
        <SummaryPanel result={ensembleResult} onBack={handleBack} />
      )}
    </div>
  )
}
