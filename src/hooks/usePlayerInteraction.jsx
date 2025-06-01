import { useCallback } from 'react';
import TableroClass from '@/classes/tablero/Tablero'; 
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';
import { SHIP_TYPES_CONFIG } from '@/assets/SHIP_TYPES_CONFIG.JS';

export const usePlayerInteraction = ({
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
  rival1Id, 
  rival2Id, 
  teamId, 
  playersInGame, 
}) => {

  const getShipConfig = useCallback((shipTypeId) => {
    return SHIP_TYPES_CONFIG.find(s => s.id === shipTypeId);
  }, []); 

  const handleSelectShipType = useCallback((shipId) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    if (playerShipCounts[shipId] > 0) {
      setSelectedShipTypeId(shipId);
      const shipName = getShipConfig(shipId)?.name || 'Barco';
      setMessage(`Seleccionado ${shipName}. Cambia la orientación o haz clic para colocar.`);
    } else {
      const shipName = getShipConfig(shipId)?.name || 'Este barco';
      setMessage(`No quedan más ${shipName} para colocar.`);
    }
  }, [gamePhase, playerShipCounts, setSelectedShipTypeId, setMessage, getShipConfig]);

  const handleShipOrientationChange = useCallback(() => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) return;
    setPlacementOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
    setPreviewCells([]); 
    setPreviewInvalidCells([]); 
  }, [gamePhase, setPlacementOrientation, setPreviewCells, setPreviewInvalidCells]);

  const handleCellMouseEnter = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION || !selectedShipTypeId) {
      setPreviewCells([]);
      setPreviewInvalidCells([]);
      return;
    }
    const shipConfig = getShipConfig(selectedShipTypeId);
    if (!shipConfig) return;

    // Tu tableroPlayer.canPlaceShip necesita los barcos ya colocados para verificar la ocupación.
    const potentialCells = tableroPlayer.getShipCells(shipConfig.size, row, col, placementOrientation);
    if (tableroPlayer.canPlaceShip(shipConfig.size, row, col, placementOrientation)) {
        // canPlaceShip debe verificar contra `this.grid` (su estado interno).
        // Si necesitas verificar contra `placedPlayerShips`, tu canPlaceShip debe usarlo.
        // Asumo que tu TableroClass maneja la ocupación internamente a través de `this.grid[r][c].isOccupied`
        // y que `placedPlayerShips` es solo para el frontend para saber qué barcos se han añadido.
        setPreviewCells(potentialCells);
        setPreviewInvalidCells([]);
    } else {
        setPreviewInvalidCells(potentialCells);
        setPreviewCells([]);
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, getShipConfig, setPreviewCells, setPreviewInvalidCells]);

  const handleBoardMouseLeave = useCallback(() => {
    setPreviewCells([]);
    setPreviewInvalidCells([]);
  }, [setPreviewCells, setPreviewInvalidCells]);

  const handlePlayerBoardClick = useCallback((row, col) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION || !selectedShipTypeId) {
      setMessage('Selecciona un barco para colocar.');
      return;
    }

    const shipConfig = getShipConfig(selectedShipTypeId);
    if (!shipConfig || playerShipCounts[shipConfig.id] <= 0) {
      setMessage('Selecciona un barco disponible para colocar.');
      return;
    }
    
    // Crear la instancia de la pieza (barco)
    // Asumo que Pieza tiene un constructor que toma un ID o un objeto de configuración.
    const newShipInstance = new shipConfig.ShipClass({ 
        id: shipConfig.id, 
        name: shipConfig.name, 
        size: shipConfig.size 
    }); 
    
    // Tu Tablero.placeShip devuelve { success: boolean, newTablero: Tablero }
    const { success, newTablero } = tableroPlayer.placeShip(newShipInstance, row, col, placementOrientation);

    if (success) { 
        setTableroPlayer(newTablero); // <--- ¡Esto es lo crucial! Actualiza con el nuevo tablero inmutable.
        
        // placedPlayerShips se actualiza con la instancia del barco que se pasó a placeShip.
        // Esto asume que newShipInstance incluye las posiciones asignadas después de placeShip.
        // Si placeShip asigna las posiciones internamente a la instancia que le pasas,
        // entonces newShipInstance ya estaría actualizada.
        // Si no, placeShip debería retornar la instancia de barco actualizada también,
        // o las posiciones deben ser calculadas aquí y asignadas a la instancia antes de almacenarla.
        // Para simplificar, asumimos que newShipInstance tiene sus propiedades correctamente
        // establecidas por el constructor o por el proceso de colocación en `TableroClass`.
        setPlacedPlayerShips(prev => [...prev, newShipInstance]); 

        setPlayerShipCounts(prevCounts => {
            const updatedCounts = { ...prevCounts, [shipConfig.id]: prevCounts[shipConfig.id] - 1 };
            const totalRemaining = Object.values(updatedCounts).reduce((sum, count) => sum + count, 0);
            if (totalRemaining === 0) {
                setMessage('¡Todos tus barcos están colocados! Haz clic en "Iniciar Batalla" o espera al oponente.');
            } else {
                setMessage(`${shipConfig.name} colocado. Quedan ${updatedCounts[shipConfig.id]}.`);
            }
            return updatedCounts;
        });
        setSelectedShipTypeId(null); 
        setPreviewCells([]); 
        setPreviewInvalidCells([]); 
    } else {
        setMessage('No se puede colocar el barco aquí. Revisa superposiciones o límites.');
    }
  }, [gamePhase, selectedShipTypeId, tableroPlayer, placementOrientation, playerShipCounts, getShipConfig, setMessage, setTableroPlayer, setPlacedPlayerShips, setPlayerShipCounts, setSelectedShipTypeId, setPreviewCells, setPreviewInvalidCells]);

  // --- Lógica de Ataque Centralizada (para todos los modos) ---
  const handleAttackAction = useCallback((targetPlayerId, row, col) => {
    // 1. Validación de Fase de Juego
    if (gamePhase !== FASES_JUEGO.BATALLA) {
      setMessage('Solo puedes atacar en la fase de Batalla.');
      return;
    }

    // 2. Validación de Turno (Esencial para todos los modos de juego)
    // playerId.current debe ser tu ID de socket real o 'player_ai' para IA
    // currentPlayerTurn será el ID de socket del jugador al que le toca o 'player_ai'/'ai' para IA
    if (currentPlayerTurn !== playerId.current) {
      setMessage('¡No es tu turno para atacar!');
      console.log(`DEBUG: [Frontend] Intento de ataque denegado. No es mi turno. Mi ID: ${playerId.current?.substring(0,6)}... Turno actual: ${currentPlayerTurn?.substring(0,6)}...`);
      return;
    }

    // --- Lógica Específica por Modo de Juego ---
    if (mode === 'ai') {
      // Validar que la celda no haya sido atacada previamente (solo relevante para IA en frontend)
      if (tableroRival.grid[row][col].isHit) { 
        setMessage('Ya atacaste esta celda. Elige otra.');
        return;
      }

      // Tu Tablero.attackCell devuelve { status, message, newTablero, ... }
      const { status, message, newTablero } = tableroRival.attackCell(row, col); 
      
      setTableroRival(newTablero); // <--- ¡Esto es lo crucial! Actualiza con el nuevo tablero inmutable.
      setMessage(`Atacaste [${row},${col}] (IA): ${message}`);

      if (newTablero.areAllShipsSunk()) { // Verificar si el NUEVO tablero tiene todos los barcos hundidos
        setMessage('¡Felicidades! ¡Has ganado la batalla contra la IA!');
        setGamePhase(FASES_JUEGO.FINALIZADO);
        setCurrentPlayerTurn(null); 
      } else {
        // Si no se ganó, es turno de la IA
        setCurrentPlayerTurn('ai'); // Establece el turno a 'ai' para que la UI lo refleje
        setTimeout(handleRivalTurnIA, 1000); // Llama a la lógica del turno de la IA
      }
    } else { // MultiPlayer y 2vs2 (Comunicación con Backend)
      // Validaciones para Multiplayer/2vs2
      if (!gameId) {
        setMessage('Error: ID de partida no disponible.');
        return;
      }
      // En 2vs2, asegurar que se especificó un targetPlayerId válido y que sea uno de los rivales
      if (mode === '2vs2' && (!targetPlayerId || (targetPlayerId !== rival1Id && targetPlayerId !== rival2Id))) {
        setMessage('Error: Debes seleccionar el tablero de un rival válido para atacar.');
        return;
      }

      // Enviar la acción de ataque al backend
      sendPlayerAction({
        type: 'ATTACK',
        gameId: gameId,
        coordinates: { row, col },
        targetPlayerId: targetPlayerId, // Indicar a qué rival se ataca en 2vs2, o null para 1vs1 (backend debe manejarlo)
        // senderId se añade automáticamente en useGameSocketEvents.js
      });
      setMessage("Ataque enviado, esperando resultado del servidor...");
    }
  }, [
    gamePhase, currentPlayerTurn, playerId, mode, gameId, sendPlayerAction,
    tableroRival, setTableroRival, setMessage, setGamePhase,
    setCurrentPlayerTurn, handleRivalTurnIA, rival1Id, rival2Id
  ]);

  // --- Wrappers para cada tablero rival clicable ---
  const handleRivalBoardClick = useCallback((row, col) => {
    // Este wrapper es para el "primer" tablero rival (IA en modo AI, o rival1 en 1vs1/2vs2)
    // rival1Id se pasa como targetPlayerId. Si es IA, rival1Id será null/undefined, lo cual se maneja en handleAttackAction.
    handleAttackAction(rival1Id, row, col); 
  }, [handleAttackAction, rival1Id]);

  const handleRival2BoardClick = useCallback((row, col) => {
    // Este wrapper es para el "segundo" tablero rival (solo en modo 2vs2)
    if (mode === '2vs2') {
      handleAttackAction(rival2Id, row, col);
    } else {
      setMessage('Este tablero no es accesible en el modo actual.');
    }
  }, [handleAttackAction, mode, rival2Id]);

  const handleAllyBoardClick = useCallback(() => {
    setMessage('No puedes atacar el tablero de tu aliado.');
  }, [setMessage]);


  return {
    handleSelectShipType,
    handleShipOrientationChange,
    handleCellMouseEnter,
    handleBoardMouseLeave,
    handlePlayerBoardClick,
    handleRivalBoardClick,
    handleRival2BoardClick, 
    handleAllyBoardClick, 
  };
};