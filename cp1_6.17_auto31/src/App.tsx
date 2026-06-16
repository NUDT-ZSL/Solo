import { useState, useCallback } from 'react';
import CauldronPanel from './CauldronPanel';
import Cauldron from './Cauldron';
import Inventory from './Inventory';
import type { BrewResult, Quality } from './potionEngine';
import './App.css';

function App() {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [isBrewing, setIsBrewing] = useState(false);
  const [invalidRecipe, setInvalidRecipe] = useState(false);
  const [newPotion, setNewPotion] = useState<{ name: string; quality: Quality; quantity: number } | null>(null);
  const [gold, setGold] = useState(50);

  const handleStartBrew = useCallback((ingredientIds: string[]) => {
    setSelectedIngredients(ingredientIds);
  }, []);

  const handleBrewStart = useCallback(() => {
    setIsBrewing(true);
    setNewPotion(null);
  }, []);

  const handleBrewComplete = useCallback((result: BrewResult) => {
    setIsBrewing(false);
    if (result.goldPenalty > 0) {
      setGold((prev) => Math.max(0, prev - result.goldPenalty));
    }
    if (result.quantity > 0) {
      setNewPotion({
        name: result.potionName,
        quality: result.quality,
        quantity: result.quantity,
      });
    } else {
      setNewPotion(null);
    }
  }, []);

  const handleInvalidRecipe = useCallback(() => {
    setInvalidRecipe(true);
    setTimeout(() => setInvalidRecipe(false), 100);
  }, []);

  const handleGoldChange = useCallback((amount: number) => {
    setGold((prev) => prev + amount);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🏰 学院魔药工坊</h1>
        <p className="app-subtitle">Academy Potion Workshop</p>
      </header>

      <main className="main-layout">
        <aside className="panel-left">
          <CauldronPanel
            onStartBrew={handleStartBrew}
            isBrewing={isBrewing}
            invalidRecipe={invalidRecipe}
          />
        </aside>

        <section className="panel-center">
          <Cauldron
            ingredientIds={selectedIngredients}
            isBrewing={isBrewing}
            onBrewStart={handleBrewStart}
            onBrewComplete={handleBrewComplete}
            onInvalidRecipe={handleInvalidRecipe}
          />
        </section>

        <aside className="panel-right">
          <Inventory
            newPotion={newPotion}
            onGoldChange={handleGoldChange}
            gold={gold}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
