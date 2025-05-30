import React, { useState, useEffect, useCallback } from 'react';

// Componentes y Clases
import TableroComponent from '@/components/Tablero/TableroComponent';
import PiezaComponent from '@/components/Pieza/PiezaComponent';
import TableroClass from '@/classes/Tablero';
// Las clases de barcos individuales (LanchaClass, etc.) ya no se importan aquí directamente
// si shipTypes.js las maneja, o si gameSetup.js las necesita y las importa.

// Configuración y Constantes
import { SHIP_TYPES_CONFIG } from './assets/SHIP_TYPES_CONFIG.JS'
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';

// Hooks
import { useSocketManager } from './hooks/useSocketManager'; // Nueva ruta

import './App.css';

const placeRivalShipsRandomly = (board, currentShipTypesConfig) => {
  currentShipTypesConfig.forEach(shipConfig => {
    for (let i = 0; i < shipConfig.initialCount; i++) {
      let placed = false;
      const ShipClass = shipConfig.ShipClass;
      if (!ShipClass) {
        console.error(`Clase de barco no definida para ${shipConfig.name}`);
        continue;
      }
      const shipInstance = new ShipClass();
      for (let attempt = 0; attempt < 100 && !placed; attempt++) {
        const row = Math.floor(Math.random() * board.size);
        const col = Math.floor(Math.random() * board.size);
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        if (board.placeShip(shipInstance, row, col, orientation)) {
          placed = true;
        }
      }
      if (!placed) {
        console.warn(`No se pudo colocar el ${shipConfig.name} del rival (IA)`);
      }
    }
  });
};


function App() {
  const [tableroPlayer, setTableroPlayer] = useState(() => new TableroClass());
  const [tableroRival, setTableroRival] = useState(() => new TableroClass());
  
  const initialShipCounts = React.useMemo(() => SHIP_TYPES_CONFIG.reduce((acc, type) => {
    acc[type.id] = type.initialCount;
    return acc;
  }, {}), []); // initialShipCounts solo se calcula una vez

  const [playerShipCounts, setPlayerShipCounts] = useState(initialShipCounts);
  const [placedPlayerShips, setPlacedPlayerShips] = useState([]);

  const [selectedShipTypeId, setSelectedShipTypeId] = useState(null);
  const [placementOrientation, setPlacementOrientation] = useState('horizontal');
  const [previewCells, setPreviewCells] = useState([]);
  const [previewInvalidCells, setPreviewInvalidCells] = useState([]);

  const [currentPlayerTurn, setCurrentPlayerTurn] = useState(null); // Inicialmente null hasta que el juego comience
  const [gamePhase, setGamePhase] = useState(FASES_JUEGO.COLOCACION);
  const [message, setMessage] = useState('Conectando al servidor...');
  const [gameId, setGameId] = useState(null); // Para almacenar el ID del juego


  // --- Manejadores de eventos de Socket.IO ---
  const handleConnectionSuccess = useCallback((data) => {
    console.log(data.message, "Mi ID:", data.playerId);
    setMessage(data.message); // Actualiza el mensaje con el estado de conexión
  }, []);

  const handleStatusUpdate = useCallback((data) => {
    console.log("Actualización de estado:", data.message);
    setMessage(data.message); // Muestra mensajes como "esperando oponente"
  }, []);

  const handleWaitingPlayersCountUpdate = useCallback((data) => {
    console.log(`Jugadores esperando en total: ${data.count}`);
  }, []);

  const handleGameStarted = useCallback((data) => {
    console.log('¡Juego iniciado!', data);
    setGameId(data.gameId);
    // myPlayerId.current es ahora playerId.current desde useSocketManager
    if (data.yourPlayerId === playerId.current) { // playerId es una ref del hook useSocketManager
      // Lógica para determinar si este cliente es P1 o P2 basado en data.players y data.yourPlayerId
      // y cómo se relaciona con data.turn
    }
    if (data.turn === playerId.current) {
      setCurrentPlayerTurn('player');
      setMessage("Es tu turno.");
    } else {
      setCurrentPlayerTurn('rival');
      setMessage(`Esperando turno de ${data.players.find(p => p.id !== playerId.current)?.name || 'oponente'}.`);
    }
    setGamePhase(FASES_JUEGO.BATALLA); // Iniciar fase de batalla
    // Aquí también podrías necesitar configurar el tablero del rival si el servidor envía su configuración
    // o si la lógica del juego asume que ambos jugadores colocan barcos antes de 'gameStarted'.
    // Por ahora, la IA coloca los barcos del rival localmente. En multijugador, esto cambiaría.
  }, []); // playerId no se pasa directamente, se accede via ref desde el hook

  const handleOpponentLeft = useCallback((data) => {
    console.warn(data.message);
    setMessage('El oponente abandonó la partida. Juego terminado.');
    setGamePhase(FASES_JUEGO.FINALIZADO); // O una fase específica de "oponente desconectado"
  }, []);

  const handleActionError = useCallback((error) => {
    console.error("Error de acción:", error.message);
    setMessage(error.message);
  }, []);

  const handleActionReceived = useCallback((data) => {
    console.log("Acción recibida del oponente:", data.action, "De:", data.sender);
    // TODO: Aplicar la acción del oponente al tablero del jugador
    // Ejemplo: data.action podría ser { type: 'ATTACK', coordinates: { row, col } }
    const { action } = data;
    if (action.type === 'ATTACK') {
      const { row, col } = action.coordinates;
      setTableroPlayer(prevBoard => {
        const newBoard = new TableroClass(prevBoard.size);
        newBoard.grid = prevBoard.grid.map(r => r.map(c => ({...c})));
        newBoard.ships = [...prevBoard.ships]; // Asumiendo que ships contiene instancias que se pueden mutar (hits)
        
        const attackResult = newBoard.attackCell(row, col);
        // setMessage(`Rival atacó [${row},${col}]: ${attackResult.message}`); // El mensaje de turno lo maneja onTurnUpdate

        if (newBoard.areAllShipsSunk()) {
          setMessage('¡Has perdido! El oponente hundió todos tus barcos.');
          setGamePhase(FASES_JUEGO.FINALIZADO);
          // Notificar al servidor que el juego terminó (opcional, el servidor podría detectarlo)
        }
        return newBoard;
      });
    }
  }, []);

  const handleTurnUpdate = useCallback((data) => {
    console.log(`Actualización de turno. Siguiente turno: ${data.nextTurn}`);
    // playerId es la ref del hook
    if (data.nextTurn === playerId.current) {
      setCurrentPlayerTurn('player');
      setMessage("¡Ahora es tu turno!");
    } else {
      setCurrentPlayerTurn('rival');
      setMessage("Turno del oponente.");
    }
  }, []); // playerId no se pasa directamente, se accede via ref desde el hook

  // Usar el custom hook para Socket.IO
  const { sendPlayerAction, playerId } = useSocketManager({
    onConnectionSuccess: handleConnectionSuccess,
    onStatusUpdate: handleStatusUpdate,
    onWaitingPlayersCountUpdate: handleWaitingPlayersCountUpdate,
    onGameStarted: handleGameStarted,
    onOpponentLeft: handleOpponentLeft,
    onActionError: handleActionError,
    onActionReceived: handleActionReceived,
    onTurnUpdate: handleTurnUpdate,
  });


  // Función para reiniciar el juego (localmente, para modo IA o pruebas)
  const resetGame = useCallback(() => {
    const newPlayerBoard = new TableroClass();
    const newRivalBoard = new TableroClass(); // Tablero para la IA
    
    setTableroPlayer(newPlayerBoard);
    setTableroRival(newRivalBoard); // Rival (IA)
    placeRivalShipsRandomly(newRivalBoard, SHIP_TYPES_CONFIG); // Colocar barcos IA

    setPlayerShipCounts(initialShipCounts);
    setPlacedPlayerShips([]);
    setSelectedShipTypeId(null);
    setPlacementOrientation('horizontal');
    setPreviewCells([]);
    setPreviewInvalidCells([]);
    
    setCurrentPlayerTurn('player'); // En modo local, el jugador podría empezar colocando
    setGamePhase(FASES_JUEGO.COLOCACION);
    setMessage('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');
    setGameId(null); // Resetear gameId
    // Si estabas en una partida multijugador, necesitarías notificar al servidor o manejar la lógica de "nueva partida".
  }, [initialShipCounts]);

  // Efecto para colocar barcos del rival (IA) al inicio o al resetear
  useEffect(() => {
    // Solo colocar barcos de IA si no estamos en una partida multijugador activa
    // o si el gameId es null (indicando un juego local o reseteado)
    if (!gameId) { 
      const newRivalBoardForIA = new TableroClass();
      placeRivalShipsRandomly(newRivalBoardForIA, SHIP_TYPES_CONFIG);
      setTableroRival(newRivalBoardForIA);
    }
  }, [gameId]); // Se ejecuta cuando gameId cambia (ej. al resetear o al iniciar juego de IA)


  const handleSelectShipType = useCallback((shipId) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    if (playerShipCounts[shipId] > 0) {
      setSelectedShipTypeId(shipId);
      const shipName = SHIP_TYPES_CONFIG.find(s => s.id === shipId)?.name || 'Barco';
      setMessage(`Seleccionado ${shipName}. Cambia la orientación o haz clic para colocar.`);
    } else {
      const shipName = SHIP_TYPES_CONFIG.find(s => s.id === shipId)?.name || 'Este barco';
      setMessage(`No quedan más ${shipName} para colocar.`);
    }
  }, [gamePhase, playerShipCounts]);

  const handleShipOrientationChange = useCallback(() => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    setPlacementOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, [gamePhase]);

  const handleCellMouseEnter = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION || !selectedShipTypeId) {
      setPreviewCells([]);
      setPreviewInvalidCells([]);
      return;
    }
    const shipConfig = SHIP_TYPES_CONFIG.find(s => s.id === selectedShipTypeId);
    if (!shipConfig) return;

    const cells = tableroPlayer.getShipCells(shipConfig.size, row, col, placementOrientation);
    if (tableroPlayer.canPlaceShip(shipConfig.size, row, col, placementOrientation)) {
      setPreviewCells(cells);
      setPreviewInvalidCells([]);
    } else {
      setPreviewInvalidCells(cells);
      setPreviewCells([]);
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation]);

  const handleBoardMouseLeave = useCallback(() => {
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, []);

  const handlePlayerBoardClick = useCallback((row, col) => {
    // Lógica para colocar barcos (Fase de Colocación)
    if (gamePhase === FASES_JUEGO.COLOCACION && selectedShipTypeId) {
      const shipConfig = SHIP_TYPES_CONFIG.find(s => s.id === selectedShipTypeId);
      if (!shipConfig || playerShipCounts[shipConfig.id] <= 0) {
        setMessage('Selecciona un barco disponible para colocar.');
        return;
      }
      const newShipInstance = new shipConfig.ShipClass();
      const newTableroPlayer = new TableroClass(tableroPlayer.size);
      newTableroPlayer.grid = tableroPlayer.grid.map(r => r.map(c => ({...c})));
      newTableroPlayer.ships = [...tableroPlayer.ships];

      if (newTableroPlayer.placeShip(newShipInstance, row, col, placementOrientation)) {
        setTableroPlayer(newTableroPlayer);
        setPlacedPlayerShips(prev => [...prev, newShipInstance]);
        setPlayerShipCounts(prevCounts => {
          const updatedCounts = { ...prevCounts, [shipConfig.id]: prevCounts[shipConfig.id] - 1 };
          const totalRemaining = Object.values(updatedCounts).reduce((sum, count) => sum + count, 0);
          if (totalRemaining === 0) {
            setMessage('¡Todos tus barcos están colocados! Esperando al servidor o haz clic en "Iniciar Batalla" (si es modo local).');
            // En un juego multijugador, aquí podrías enviar un evento "ready" al servidor
            // sendPlayerAction({ type: 'SHIPS_PLACED', board: newTableroPlayer.grid });
          } else {
            setMessage(`${shipConfig.name} colocado. Quedan ${updatedCounts[shipConfig.id]}.`);
          }
          return updatedCounts;
        });
        setSelectedShipTypeId(null);
        setPreviewCells([]);
        setPreviewInvalidCells([]);
      } else {
        setMessage('No se puede colocar el barco aquí.');
      }
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, playerShipCounts, sendPlayerAction]);


  const handleRivalBoardClick = useCallback((row, col) => {
    // Lógica para atacar el tablero del rival (Fase de Batalla en tu turno)
    if (gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player' && gameId) {
        sendPlayerAction({
            type: 'ATTACK',
            gameId: gameId, // El servidor ya sabe el gameId a través del socket, pero puede ser útil para confirmación
            coordinates: { row, col },
            playerId: playerId.current // El servidor usa el socket.id, pero puede ser útil para logs o validación
        });
        // La actualización del tablero rival y mensajes ocurrirá cuando el servidor confirme el resultado del ataque
        // o a través de 'actionReceived' para el oponente y 'turnUpdate'.
        // setMessage("Ataque enviado, esperando resultado..."); // Mensaje temporal
    } else if (gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player' && !gameId) { // Modo IA local
        const newTableroRival = new TableroClass(tableroRival.size);
        newTableroRival.grid = tableroRival.grid.map(r => r.map(c => ({...c})));
        newTableroRival.ships = [...tableroRival.ships.map(s => ({...s}))]; // Copia profunda para estado de 'hits'

        const attackResult = newTableroRival.attackCell(row, col);
        setTableroRival(newTableroRival);
        setMessage(`Atacaste [${row},${col}] (IA): ${attackResult.message}`);

        if (newTableroRival.areAllShipsSunk()) {
            setMessage('¡Felicidades! ¡Has ganado la batalla contra la IA!');
            setGamePhase(FASES_JUEGO.FINALIZADO);
            return;
        }
        if (attackResult.status !== 'invalid' && !attackResult.message.includes('ya atacada')) {
            setCurrentPlayerTurn('rival');
            setTimeout(() => handleRivalTurnIA(newTableroRival), 1000); // Pasar el tablero para que la IA lo use
        }
    } else {
        setMessage('No es tu turno o no puedes atacar en esta fase.');
    }
  }, [gamePhase, currentPlayerTurn, gameId, sendPlayerAction, tableroRival, playerId]);


  // Turno de la IA (modo local)
  const handleRivalTurnIA = useCallback((currentRivalBoard) => { // Recibe el tablero del rival para evitar usar estado stale
    if (gamePhase !== FASES_JUEGO.BATALLA || gameId) return; // Solo para IA local
    
    setMessage('Turno del Rival (IA)...');
    let attacked = false;
    const newTableroPlayer = new TableroClass(tableroPlayer.size);
    newTableroPlayer.grid = tableroPlayer.grid.map(r => r.map(c => ({...c})));
    newTableroPlayer.ships = [...tableroPlayer.ships.map(s => ({...s}))];

    for (let i = 0; i < 100 && !attacked; i++) {
        const r = Math.floor(Math.random() * newTableroPlayer.size);
        const c = Math.floor(Math.random() * newTableroPlayer.size);
        if (!newTableroPlayer.grid[r][c].isHit) {
            const attackResult = newTableroPlayer.attackCell(r, c);
            setTableroPlayer(newTableroPlayer);
            setMessage(`Rival (IA) ataca [${r},${c}]: ${attackResult.message}`);
            attacked = true;
            if (newTableroPlayer.areAllShipsSunk()) {
                setMessage('¡La IA ha ganado la batalla!');
                setGamePhase(FASES_JUEGO.FINALIZADO);
                return;
            }
            break; // IA ataca una vez
        }
    }
    if (!attacked) setMessage('IA no pudo encontrar celda para atacar.');
    
    setCurrentPlayerTurn('player');
    if (gamePhase === FASES_JUEGO.BATALLA) {
      setMessage(prev => prev + ' Es tu turno.');
    }
  }, [gamePhase, tableroPlayer, gameId]);


  const handleStartBattle = useCallback(() => {
    // Esta función es principalmente para modo local/IA ahora.
    // En multijugador, el servidor dicta cuándo empieza la batalla ('gameStarted').
    const totalShipsToPlace = SHIP_TYPES_CONFIG.reduce((sum, type) => sum + type.initialCount, 0);
    if (placedPlayerShips.length < totalShipsToPlace) {
      setMessage('Debes colocar todos tus barcos antes de iniciar la batalla.');
      return;
    }
    if (gamePhase === FASES_JUEGO.COLOCACION && !gameId) { // Solo si es juego local
      setGamePhase(FASES_JUEGO.BATALLA);
      setCurrentPlayerTurn('player');
      setMessage('¡Batalla contra IA iniciada! Es tu turno.');
    } else if (gamePhase === FASES_JUEGO.COLOCACION && gameId) {
        // Si estás en un juego multijugador y todos los barcos están colocados.
        sendPlayerAction({ type: 'SHIPS_PLACED_READY' });
        setMessage('Barcos colocados. Esperando al oponente y al servidor...');
    }
  }, [placedPlayerShips, gamePhase, gameId, sendPlayerAction]);

  // --- Renderizado ---
  return (
    <div className="gameContainer">
      <h1>Batalla Naval</h1>
      <p className="game-message">{message}</p>
      {gameId && <p className="game-id-label">ID de Partida: {gameId.substring(0,10)}...</p>}

      {(gamePhase === FASES_JUEGO.BATALLA || gamePhase === FASES_JUEGO.FINALIZADO) && playerId.current && (
        <p className="turno-label">
            Turno: {(currentPlayerTurn === 'player' && playerId.current) ? 'Tu Turno' : 'Turno del Oponente'}
        </p>
      )}

      <div className="game-grid-area">
        <div className="tablero-area-jugador">
          <h2>Tu Flota ({gamePhase === FASES_JUEGO.COLOCACION ? "Colocando" : "Defendiendo"})</h2>
          <TableroComponent
            tablero={tableroPlayer}
            onCellClick={handlePlayerBoardClick}
            onCellMouseEnter={handleCellMouseEnter}
            onBoardMouseLeave={handleBoardMouseLeave}
            previewCells={previewCells}
            previewInvalidCells={previewInvalidCells}
            isPlayerBoard={true}
            gamePhase={gamePhase}
            selectedShipTypeId={selectedShipTypeId}
            // Durante la colocación, solo el tablero del jugador está activo.
            // En batalla, el tablero del jugador no es clickeable para atacar.
            disabled={gamePhase !== FASES_JUEGO.COLOCACION} 
          />
        </div>

        {gamePhase === FASES_JUEGO.COLOCACION && (
          <div className="controles-colocacion">
            <h3>Selecciona un Barco:</h3>
            <div className="lista-piezas-jugador">
              {SHIP_TYPES_CONFIG.map(shipConfig => (
                <PiezaComponent
                  key={shipConfig.id}
                  shipTypeConfig={shipConfig}
                  remainingCount={playerShipCounts[shipConfig.id]}
                  isSelected={selectedShipTypeId === shipConfig.id}
                  onSelectShipType={handleSelectShipType}
                  gamePhase={gamePhase}
                />
              ))}
            </div>
            <div className="btns-colocacion">
              <button onClick={handleShipOrientationChange} className="btn-orientacion">
                Orientación: {placementOrientation.toUpperCase()}
              </button>
              <button onClick={handleStartBattle} className="btn-batalla">
                {gameId ? "Estoy Listo (Barcos Colocados)" : "Iniciar Batalla (vs IA)"}
              </button>
            </div>
          </div>
        )}

        <div className="tablero-area-rival">
          <h2>Flota Rival ({gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player' ? "Atacando" : (gameId ? "Esperando..." : "IA")})</h2>
          <TableroComponent
            tablero={tableroRival}
            onCellClick={handleRivalBoardClick}
            isPlayerBoard={false}
            gamePhase={gamePhase}
            // Solo se puede hacer clic en el tablero rival durante la batalla Y si es el turno del jugador.
            disabled={!(gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player')}
          />
        </div>
      </div>

      {(gamePhase === FASES_JUEGO.FINALIZADO || (gamePhase === FASES_JUEGO.BATALLA && !gameId) ) && ( // Mostrar reset para juegos finalizados o locales en batalla
        <button onClick={resetGame} className="btn-reset">
          {gamePhase === FASES_JUEGO.FINALIZADO ? 'Jugar de Nuevo' : 'Reiniciar Juego (vs IA)'}
        </button>
      )}
    </div>
  );
}

export default App;