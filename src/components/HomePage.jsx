import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <h1>¡Bienvenido a Batalla Naval!</h1>
      <p>Selecciona tu modo de juego:</p>
      <div className="game-mode-selection">
        <Link to="/game/ai">
          <button className="start-game-button mode-ai">Jugar vs IA</button>
        </Link>
        <Link to="/game/multiplayer">
          <button className="start-game-button mode-multiplayer">Jugar Online</button>
        </Link>
        <Link to="/game/4-multiplayer">
          <button className="start-game-button mode-multiplayer">Jugar Online (4)</button>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;