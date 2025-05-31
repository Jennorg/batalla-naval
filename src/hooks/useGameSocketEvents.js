import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';
import Tablero from '@/classes/Tablero';
import Pieza from '@/classes/Pieza'
import Celda from '@/classes/Celda'

const SOCKET_SERVER_URL = 'https://backend-batallanaval.onrender.com'; 
// const SOCKET_SERVER_URL = 'http://localhost:3000'; 

export const useGameSocketEvents = ({
  mode,
  setMessage,
  setGameId,
  setCurrentPlayerTurn,
  setGamePhase,
  setTableroPlayer,
  setTableroRival, 
  playerId, 
}) => {
  const socketRef = useRef(null);

  const sendPlayerAction = useCallback((actionData) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('DEBUG: [Frontend -> Server] Enviando acción:', actionData.type, actionData);
      
      socketRef.current.emit('playerAction', { 
        ...actionData,
        gameId: actionData.gameId || null, 
        senderId: playerId.current || null 
      });
    } else {
      console.warn('ADVERTENCIA: Socket no conectado, no se pudo enviar la acción:', actionData);
      setMessage('Error de conexión: No se pudo enviar la acción.');
    }
  }, [setMessage, playerId]);

  const handleActionReceived = useCallback((data) => {
    if (mode !== 'multiplayer') return;

    const { action } = data;
    console.log('DEBUG: [Server -> Frontend] Acción recibida:', action.type, action);

    switch (action.type) {
      case 'ATTACK_RECEIVED': {
        const { coordinates } = action;
        const { row, col } = coordinates;
        setTableroPlayer(prevBoard => {
          const attackResult = prevBoard.attackCell(row, col); // <-- Vuelve a atacar localmente
          setMessage(`Te han atacado en [${row},${col}]: ${attackResult.message}`);


          // Es crucial que el Tablero del jugador sepa si su propio barco se ha hundido
          if (attackResult.sunkShip) {
            setMessage(`¡Tu barco ${attackResult.sunkShip.name} ha sido hundido!`);
          }

          if (attackResult.newTablero.areAllShipsSunk()) {
            setMessage('¡Has perdido! El oponente hundió todos tus barcos.');
            setGamePhase(FASES_JUEGO.FINALIZADO);
          }
          return attackResult.newTablero;
        });
        break;
      }
      case 'ATTACK_RESULT': {
        const { newTableroRival, status, message, coordinates, sunkShip } = action;
        
        console.log('DEBUG: [Frontend ATACANTE] Recibido ATTACK_RESULT:', action);
        console.log('DEBUG: [Frontend ATACANTE] newTableroRival recibido:', newTableroRival);

        if (newTableroRival) {
            // Reconstruir el tablero del rival con el estado actualizado (incluyendo hits y misses)
            const rivalBoardInstance = Tablero.fromSimpleObject(newTableroRival); 
            // Si hay un barco hundido, actualiza su estado para que se revele en el tablero del atacante
            if (sunkShip && rivalBoardInstance.ships) {
                const shipToUpdate = rivalBoardInstance.ships.find(ship => 
                    ship.id === sunkShip.id // Usa el id único del barco para encontrarlo
                );
                if (shipToUpdate) {
                    shipToUpdate.isSunk = true;
                    // Marca todas las celdas del barco como hundidas
                    if (shipToUpdate.positions) {
                        shipToUpdate.positions.forEach(cell => {
                            if (rivalBoardInstance.grid[cell.row] && rivalBoardInstance.grid[cell.row][cell.col]) {
                                rivalBoardInstance.grid[cell.row][cell.col].isHit = true;
                                rivalBoardInstance.grid[cell.row][cell.col].isSunkShipPart = true;
                            }
                        });
                    }
                } else {
                    console.warn('ADVERTENCIA: Barco hundido no encontrado en el tablero reconstruido para actualizar el estado de "isSunk".');
                }
            }
            setTableroRival(rivalBoardInstance);
        } else {
            console.warn('ADVERTENCIA: ATTACK_RESULT no contiene newTableroRival. No se pudo actualizar el tablero del oponente.');
        }
        setMessage(`Tu ataque en [${coordinates.row},${coordinates.col}]: ${message}`);

        // Mostrar mensaje si se hundió un barco
        if (sunkShip) {
            setMessage(`¡Hundiste el barco ${sunkShip.name} del oponente!`);
        }

        // Verificar si todos los barcos del rival han sido hundidos
        if (newTableroRival && Tablero.fromSimpleObject(newTableroRival).areAllShipsSunk()) {
            setMessage('¡Felicidades! ¡Has ganado la batalla!');
            setGamePhase(FASES_JUEGO.FINALIZADO);
        }
        break;
      }
      case 'TURN_CHANGE': {
        const { nextPlayerId } = action;
        console.log(`DEBUG: [Server -> Frontend] TURN_CHANGE. Siguiente turno: ${nextPlayerId}. Mi ID: ${playerId.current}`);
        if (nextPlayerId === playerId.current) {
          setCurrentPlayerTurn('player');
          setMessage('¡Es tu turno!');
        } else {
          setCurrentPlayerTurn('rival');
          setMessage('Es el turno del oponente.');
        }
        break;
      }
      case 'GAME_STATE_UPDATE': {
        setMessage(action.message || 'Estado del juego actualizado.');
        break;
      }
      case 'GAME_OVER': {
          const { winnerId, message } = action; // Usar 'action' directamente para las propiedades
          setMessage(message);
          setGamePhase(FASES_JUEGO.FINALIZADO); 

          if (winnerId === playerId.current) { // Comparar con playerId.current
              console.log('¡Has ganado la batalla!');
          } else {
              console.log('¡Has perdido la batalla!');
              setMessage(`Has perdido. ${message}`); 
          }
          break;
      }
      case 'OPPONENT_LEFT': { 
          setMessage(action.message); // Usar 'action.message'
          setGamePhase(FASES_JUEGO.FINALIZADO); 
          break;
      }
      default:
        console.warn('ADVERTENCIA: Acción desconocida recibida del servidor:', action.type, action);
    }
  }, [mode, setTableroPlayer, setTableroRival, setMessage, setGamePhase, setCurrentPlayerTurn, playerId]);

  useEffect(() => {
    if (mode !== 'multiplayer') {
      if (socketRef.current) {
        console.log('DEBUG: Desconectando socket (modo no multijugador).');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    if (socketRef.current && socketRef.current.connected) {
        console.log('DEBUG: Socket ya conectado. No intentando reconectar.');
        return;
    }

    if (!socketRef.current) {
      console.log('DEBUG: Iniciando nueva conexión Socket.IO a:', SOCKET_SERVER_URL);
      socketRef.current = io(SOCKET_SERVER_URL);

      socketRef.current.on('connect', () => {
        playerId.current = socketRef.current.id;
        setMessage('Conectado al servidor. Buscando partida...');
        console.log('DEBUG: [Socket] Conectado. Mi Socket ID/Player ID:', playerId.current);
        socketRef.current.emit('requestGame');
      });

      socketRef.current.on('gameFound', (data) => {
        setGameId(data.gameId);
        setMessage(`Partida ${data.gameId.substring(0,10)} encontrada. ${data.playerNumber === 1 ? 'Esperando al oponente...' : 'Juego listo!'}`);
        setGamePhase(FASES_JUEGO.COLOCACION); 
        setCurrentPlayerTurn(null); 
        console.log(`DEBUG: [Socket] gameFound. Game ID: ${data.gameId}. Player Number: ${data.playerNumber}. Fase: ${FASES_JUEGO.COLOCACION}`);
      });

      socketRef.current.on('playerAction', handleActionReceived);

      socketRef.current.on('gameStarted', (data) => {
        setGamePhase(FASES_JUEGO.BATALLA); 
        const playerIsStarting = (data.startingPlayerId === playerId.current);
        if (playerIsStarting) {
          setCurrentPlayerTurn('player');
          setMessage('¡Batalla iniciada! Es tu turno.');
        } else {
          setCurrentPlayerTurn('rival');
          setMessage('¡Batalla iniciada! Es el turno del oponente.');
        }
        console.log(`DEBUG: [Socket] gameStarted. Jugador inicial: ${data.startingPlayerId}. Soy yo: ${playerIsStarting}. Fase: ${FASES_JUEGO.BATALLA}. Turno: ${playerIsStarting ? 'player' : 'rival'}`);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('DEBUG: [Socket] Desconectado del servidor. Razón:', reason);
        setMessage('Desconectado del servidor.');
        setGameId(null);
        setCurrentPlayerTurn(null);
        setGamePhase(FASES_JUEGO.COLOCACION); 
      });

      socketRef.current.on('error', (error) => {
        console.error('ERROR: [Socket] Error del socket:', error);
        setMessage(`Error del servidor: ${error.message || 'Desconocido'}`);
      });
    }

    return () => {
      if (socketRef.current) {
        console.log('DEBUG: Limpiando y desconectando socket en cleanup de useEffect.');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    mode, 
    setGameId, 
    setMessage, 
    setGamePhase, 
    setCurrentPlayerTurn, 
    handleActionReceived, 
    playerId, 
    setTableroRival
  ]);

  return { sendPlayerAction, playerId };
};