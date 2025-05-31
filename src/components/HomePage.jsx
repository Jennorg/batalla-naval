import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div className="home-page">
      <h1>¡Bienvenido a Batalla Naval!</h1>
      <p>Selecciona tu modo de juego:</p>
      <div className="game-mode-selection">
        <Link to="/game/ai"> {/* Nueva ruta para jugar contra la IA */}
          <button className="start-game-button mode-ai">Jugar vs IA</button>
        </Link>
        <Link to="/game/multiplayer"> {/* Nueva ruta para jugar multijugador */}
          <button className="start-game-button mode-multiplayer">Jugar Online</button>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;