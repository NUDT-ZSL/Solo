import { useState } from 'react';
import InstrumentSelector from '@/components/InstrumentSelector';
import RehearsalRoom from '@/components/RehearsalRoom';
import SummaryPanel from '@/components/SummaryPanel';
import { InstrumentType, EnsembleResult } from '@/types';

type PageState = 'select' | 'rehearsal' | 'summary';

export default function Home() {
  const [pageState, setPageState] = useState<PageState>('select');
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType | null>(null);
  const [ensembleResult, setEnsembleResult] = useState<EnsembleResult | null>(null);

  const handleInstrumentSelect = (instrument: InstrumentType) => {
    setSelectedInstrument(instrument);
    setPageState('rehearsal');
  };

  const handleEnsembleComplete = (result: EnsembleResult) => {
    setEnsembleResult(result);
    setPageState('summary');
  };

  const handleCloseSummary = () => {
    setPageState('select');
    setSelectedInstrument(null);
    setEnsembleResult(null);
  };

  const handleRestart = () => {
    setPageState('rehearsal');
    setEnsembleResult(null);
  };

  return (
    <div>
      {pageState === 'select' && (
        <InstrumentSelector onSelect={handleInstrumentSelect} />
      )}
      {pageState === 'rehearsal' && selectedInstrument && (
        <RehearsalRoom
          instrument={selectedInstrument}
          onComplete={handleEnsembleComplete}
        />
      )}
      {pageState === 'summary' && ensembleResult && (
        <SummaryPanel
          result={ensembleResult}
          onClose={handleCloseSummary}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
