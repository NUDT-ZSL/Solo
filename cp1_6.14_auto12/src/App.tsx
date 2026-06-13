import React, { useCallback, useState } from 'react';
import StateMachineEditor, { StateNode, Transition } from './components/StateMachineEditor';
import SpritePreview from './components/SpritePreview';

const App: React.FC = () => {
  const [previewNode, setPreviewNode] = useState<StateNode | null>(null);
  const [previewTransition, setPreviewTransition] = useState<Transition | undefined>();

  const handlePlayState = useCallback(
    (node: StateNode | null, transition?: Transition) => {
      setPreviewNode(node);
      setPreviewTransition(transition);
    },
    []
  );

  return (
    <div className="app">
      <StateMachineEditor onPlayState={handlePlayState} />
      <SpritePreview currentNode={previewNode} transition={previewTransition} />
    </div>
  );
};

export default App;
