import React from 'react';
import RecipeCalculator from './RecipeCalculator'; // Import our new component
import './App.css';

function App() {
  return (
    <div className="App">
      {/* You could add a general app header here if you like, e.g., 
      <header className="App-header">
        <h1>My Sourdough App</h1>
      </header> 
      */}
      <main>
        <RecipeCalculator />
      </main>
    </div>
  );
}

export default App;