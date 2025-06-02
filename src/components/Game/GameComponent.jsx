import React, { useState, useEffect, useCallback, useRef } from 'react';

import TableroComponent from '@/components/Tablero/TableroComponent';
import PiezaComponent from '@/components/Pieza/PiezaComponent';
import TableroClass from '@/classes/tablero/Tablero';
import { placeRivalShipsRandomly } from '@/utils/gameSetup';

import { SHIP_TYPES_CONFIG } from '@/assets/SHIP_TYPES_CONFIG.JS';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';

import { usePlayerInteraction } from '@/hooks/usePlayerInteraction';
import { useGameSocketEvents } from '@/hooks/useGameSocketEvents';

function GameComponent({ mode }) {
  const [tableroPlayer, setTableroPlayer] = useState(() => new TableroClass());
  const [tableroRival, setTableroRival] = useState(() => new TableroClass());
  const [tableroAlly, setTableroAlly] = useState(() => null);
  const [tableroRival2, setTableroRival2] = useState(() => null);

  const initialShipCounts = React.useMemo(() => SHIP_TYPES_CONFIG.reduce((acc, type) => {
    acc[type.id] = type.initialCount;
    return acc;
  }, {}), []);

  const [playerShipCounts, setPlayerShipCounts] = useState(initialShipCounts);
  const [placedPlayerShips, setPlacedPlayerShips] = useState([]);

  const [selectedShipTypeId, setSelectedShipTypeId] = useState(null);
  const [placementOrientation, setPlacementOrientation] = useState('horizontal');
  const [previewCells, setPreviewCells] = useState([]);
  const [previewInvalidCells, setPreviewInvalidCells] = useState([]);

  const [currentPlayerTurn, setCurrentPlayerTurn] = useState(null);
  const [gamePhase, setGamePhase] = useState(FASES_JUEGO.LOBBY);
  const [message, setMessage] = useState('Esperando jugadores en el lobby...');
  const [gameId, setGameId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [playersInGame, setPlayersInGame] = useState([]);

  const [rival1Id, setRival1Id] = useState(null);
  const [rival2Id, setRival2Id] = useState(null);

  const playerId = useRef(null);

  const { sendPlayerAction, currentSocketPlayerId } = (mode === 'multiplayer' || mode === '2vs2')
    ? useGameSocketEvents({
        mode,
        setMessage,
        setGameId,
        setCurrentPlayerTurn,
        setGamePhase,
        setTableroPlayer,
        setTableroRival,
        setTableroAlly,
        setTableroRival2,
        setTeamId,
        setPlayersInGame,
        playerId,
        setRival1Id,
        setRival2Id,
      })
    : { sendPlayerAction: () => {}, currentSocketPlayerId: { current: null } };

  useEffect(() => {
    if (currentSocketPlayerId && currentSocketPlayerId.current) {
      playerId.current = currentSocketPlayerId.current;
    } else if (mode === 'ai') {
      playerId.current = 'player_ai';
    }
  }, [currentSocketPlayerId, mode]);


  const resetGame = useCallback(() => {
    const newPlayerBoard = new TableroClass();
    let newRivalBoard = new TableroClass();

    if (mode === 'ai') {
      newRivalBoard = placeRivalShipsRandomly(newRivalBoard, SHIP_TYPES_CONFIG);
    }

    setTableroPlayer(newPlayerBoard);
    setTableroRival(newRivalBoard);
    setTableroAlly(null);
    setTableroRival2(null);

    setPlayerShipCounts(initialShipCounts);
    setPlacedPlayerShips([]);
    setSelectedShipTypeId(null);
    setPlacementOrientation('horizontal');
    setPreviewCells([]);
    setPreviewInvalidCells([]);

    setCurrentPlayerTurn(null);
    setGamePhase(FASES_JUEGO.LOBBY);
    setMessage('Esperando jugadores en el lobby...');
    setGameId(null);
    setTeamId(null);
    setPlayersInGame([]);
    setRival1Id(null);
    setRival2Id(null);
  }, [initialShipCounts, mode]);

  useEffect(() => {
    if (mode === 'ai') {
        resetGame();
        setGamePhase(FASES_JUEGO.COLOCACION);
        setMessage('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');
    } else if (mode === '2vs2') {
      resetGame();
      setMessage('Esperando a que el juego inicie y puedas colocar tus barcos...');
    }
  }, [mode, resetGame]);

  useEffect(() => {
    if (gamePhase === FASES_JUEGO.COLOCACION && mode === '2vs2') {
      setMessage('Coloca tus barcos. Selecciona un barco y haz clic en el tablero.');
    }
  }, [gamePhase, mode]);


  const handleRivalTurnIA = useCallback(() => {
    if (mode !== 'ai' || gamePhase !== FASES_JUEGO.BATALLA) return;

    setMessage('Turno del Rival (IA)...');
    let attacked = false;
    let currentTableroPlayerState = tableroPlayer;

    for (let i = 0; i < 100 && !attacked; i++) {
        const r = Math.floor(Math.random() * currentTableroPlayerState.size);
        const c = Math.floor(Math.random() * currentTableroPlayerState.size);

        if (!currentTableroPlayerState.grid[r][c].isHit) {
            const attackResult = currentTableroPlayerState.attackCell(r, c);

            currentTableroPlayerState = attackResult.newTablero;

            setMessage(`Rival (IA) ataca [${r},${c}]: ${attackResult.message}`);
            attacked = true;

            if (currentTableroPlayerState.areAllShipsSunk()) {
                setMessage('¡La IA ha ganado la batalla!');
                setGamePhase(FASES_JUEGO.FINALIZADO);
                setTableroPlayer(currentTableroPlayerState);
                setCurrentPlayerTurn(null);
                return;
            }
            break;
        }
    }

    setTableroPlayer(currentTableroPlayerState);

    if (!attacked) setMessage('IA no pudo encontrar celda para atacar.');

    setCurrentPlayerTurn(playerId.current);
    if (gamePhase === FASES_JUEGO.BATALLA) {
      setMessage(prev => prev + ' Es tu turno.');
    }
  }, [mode, gamePhase, tableroPlayer, setTableroPlayer, setMessage, setCurrentPlayerTurn, setGamePhase, playerId]);


  const handleStartBattle = useCallback(() => {
    if (gamePhase === FASES_JUEGO.LOBBY) {
      if (mode === 'multiplayer' || mode === '2vs2') {
        if (!gameId) {
          setMessage('Error: Esperando ID de partida del servidor. Intenta de nuevo en un momento.');
          return;
        }
        setMessage('Listo. Esperando a los demás jugadores para comenzar la colocación...');
        sendPlayerAction({
          type: 'PLAYER_READY_LOBBY',
          gameId: gameId,
          mode: mode
        });
      } else if (mode === 'ai') {
        setGamePhase(FASES_JUEGO.COLOCACION);
        setMessage('Coloca tus barcos. Selecciona uno y haz clic en el tablero.');
      }
      return;
    }

    const totalShipsToPlace = SHIP_TYPES_CONFIG.reduce((sum, type) => sum + type.initialCount, 0);
    if (placedPlayerShips.length < totalShipsToPlace) {
      setMessage('Debes colocar todos tus barcos antes de iniciar la batalla.');
      return;
    }

    if (gamePhase === FASES_JUEGO.COLOCACION) {
        if (mode === 'ai') {
            setGamePhase(FASES_JUEGO.BATALLA);
            setCurrentPlayerTurn(playerId.current);
            setMessage('¡Batalla contra IA iniciada! Es tu turno.');
        } else if (mode === 'multiplayer' || mode === '2vs2') {
            if (!gameId) {
                setMessage('Error: Esperando ID de partida del servidor. Intenta de nuevo en un momento.');
                return;
            }
            setMessage('Barcos colocados. Esperando a los oponentes y al servidor para iniciar la batalla...');
            sendPlayerAction({
              type: 'PLAYER_READY',
              gameId: gameId,
              placedPlayerShipsData: tableroPlayer.toSimpleObject(),
              mode: mode
          });
        }
    }
  }, [placedPlayerShips, gamePhase, mode, sendPlayerAction, gameId, playerId, tableroPlayer, setMessage, setCurrentPlayerTurn]);


  const {
    handleSelectShipType,
    handleShipOrientationChange,
    handleCellMouseEnter,
    handleBoardMouseLeave,
    handlePlayerBoardClick,
    handleRivalBoardClick,
    handleAllyBoardClick,
    handleRival2BoardClick,
  } = usePlayerInteraction({
    mode,
    gamePhase,
    currentPlayerTurn,
    tableroPlayer,
    setTableroPlayer,
    tableroRival,
    setTableroRival,
    tableroAlly,
    setTableroAlly,
    tableroRival2,
    setTableroRival2,
    playerShipCounts,
    setPlayerShipCounts,
    placedPlayerShips,
    setPlacedPlayerShips,
    selectedShipTypeId,
    setSelectedShipTypeId,
    placementOrientation,
    setPlacementOrientation,
    setPreviewCells,
    setPreviewInvalidCells,
    setMessage,
    gameId,
    sendPlayerAction,
    playerId,
    handleRivalTurnIA,
    setCurrentPlayerTurn,
    setGamePhase,
    teamId,
    playersInGame,
    rival1Id,
    rival2Id,
  });


  return (
    <div className="gameContainer">
      <h1>Batalla Naval
        {mode === 'ai' && '(vs IA)'}
        {mode === 'multiplayer' && '(Online 1vs1)'}
        {mode === '2vs2' && '(Online 2vs2)'}
      </h1>
      <p className="game-message">{message}</p>
      {(mode === 'multiplayer' || mode === '2vs2') && gameId && <p className="game-id-label">ID de Partida: {gameId?.substring(0,10)}...</p>}
      {(mode === '2vs2') && teamId && <p className="team-id-label">Tu Equipo: {teamId}</p>}

      {mode === 'multiplayer' && rival1Id && <p className="opponent-id-label">Tu oponente es: {rival1Id?.substring(0,6)}...</p>}
      {mode === '2vs2' && rival1Id && rival2Id && (
        <p className="opponent-id-label">Rivales: {rival1Id?.substring(0,6)}..., {rival2Id?.substring(0,6)}...</p>
      )}


      {(gamePhase === FASES_JUEGO.BATALLA || gamePhase === FASES_JUEGO.FINALIZADO) && currentPlayerTurn && (
        <p className="turno-label">
            Turno: {(currentPlayerTurn === playerId.current) ? 'Tu Turno' : (mode === 'ai' ? 'Turno de la IA' : 'Turno del Oponente')}
        </p>
      )}

      <div className="game-boards-container">
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
            disabled={gamePhase !== FASES_JUEGO.COLOCACION}
          />
        </div>

        {(gamePhase === FASES_JUEGO.COLOCACION) && (
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
                  disabled={gamePhase !== FASES_JUEGO.COLOCACION}
                />
              ))}
            </div>
            <div className="btns-colocacion">
              <button onClick={handleShipOrientationChange} className="btn-orientacion">
                Orientación: {placementOrientation.toUpperCase()}
              </button>
              <button
                onClick={handleStartBattle}
                className="btn-batalla"
                disabled={placedPlayerShips.length < SHIP_TYPES_CONFIG.reduce((sum, type) => sum + type.initialCount, 0)}
              >
                {mode === 'multiplayer' || mode === '2vs2' ? "Estoy Listo (Barcos Colocados)" : "Iniciar Batalla (vs IA)"}
              </button>
            </div>
          </div>
        )}

        {gamePhase === FASES_JUEGO.LOBBY && (
          <div className="controles-lobby">
            <button
              onClick={handleStartBattle}
              className="btn-ready-lobby"
            >
              ¡Listo para Jugar!
            </button>
          </div>
        )}

        <div className="tablero-area-rival">
          <h2>Flota Rival ({mode === 'ai' ? 'IA' : (gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === playerId.current ? "Atacando" : "Esperando...")})</h2>
          <TableroComponent
            tablero={tableroRival}
            onCellClick={handleRivalBoardClick}
            isPlayerBoard={false}
            gamePhase={gamePhase}
            disabled={!(gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === playerId.current)}
          />
        </div>

        {mode === '2vs2' && (
          <>
            <div className="tablero-area-aliado">
              <h2>Flota Aliada ({gamePhase === FASES_JUEGO.BATALLA ? "Defendiendo" : "Esperando..."})</h2>
              <TableroComponent
                tablero={tableroAlly}
                onCellClick={handleAllyBoardClick}
                isPlayerBoard={false}
                gamePhase={gamePhase}
                disabled={true}
              />
            </div>
            <div className="tablero-area-rival2">
              <h2>Segundo Rival ({gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === playerId.current ? "Atacando" : "Esperando..."})</h2>
              <TableroComponent
                tablero={tableroRival2}
                onCellClick={handleRival2BoardClick}
                isPlayerBoard={false}
                gamePhase={gamePhase}
                disabled={!(gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === playerId.current)}
              />
            </div>
          </>
        )}
      </div>

      {(gamePhase === FASES_JUEGO.FINALIZADO || (mode === 'ai' && gamePhase === FASES_DE_JUEGO.BATALLA) ) && (
        <button onClick={resetGame} className="btn-reset">
          {gamePhase === FASES_JUEGO.FINALIZADO ? 'Jugar de Nuevo' : 'Reiniciar Juego (vs IA)'}
        </button>
      )}
    </div>
  );
}

export default GameComponent;