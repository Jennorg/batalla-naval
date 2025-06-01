import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';
import Tablero from '@/classes/tablero/Tablero';

// const SOCKET_SERVER_URL = 'https://backend-batallanaval.onrender.com';
const SOCKET_SERVER_URL = 'http://localhost:3000';

export const useGameSocketEvents = ({
  mode,
  setMessage,
  setGameId,
  setCurrentPlayerTurn, // Esto debe recibir un PlayerId real, no 'player'/'rival'
  setGamePhase,
  setTableroPlayer,
  setTableroRival,
  setTableroAlly,
  setTableroRival2,
  setTeamId,
  setPlayersInGame,
  playerId, // Este es el ref que contiene tu ID de jugador real
  setRival1Id,
  setRival2Id,
}) => {
  const socketRef = useRef(null);
  const allyIdRef = useRef(null);
  const internalRival1IdRef = useRef(null); 
  const internalRival2IdRef = useRef(null); 

  const sendPlayerAction = useCallback((actionData) => {
    if (socketRef.current && socketRef.current.connected) {
      console.log('DEBUG: [Frontend -> Server] Enviando acción:', actionData.type, actionData);

      if (actionData.type === 'ATTACK') {
        if (mode === 'multiplayer') {
          if (!internalRival1IdRef.current) {
            console.error('ERROR: No se encontró el ID del oponente para el ataque en 1vs1.');
            setMessage('Error: No se puede atacar, ID del oponente desconocido.');
            return;
          }
          actionData.targetPlayerId = internalRival1IdRef.current;
        } else if (mode === '2vs2') {
          if (!actionData.targetPlayerId || (actionData.targetPlayerId !== internalRival1IdRef.current && actionData.targetPlayerId !== internalRival2IdRef.current)) {
              console.error('ERROR: En 2vs2, la acción de ataque debe especificar un targetPlayerId válido (rival1 o rival2).');
              setMessage('Error: Debes seleccionar un tablero rival para atacar.');
              return;
          }
        }
      }

      socketRef.current.emit('playerAction', {
        ...actionData,
        gameId: actionData.gameId || null,
        senderId: playerId.current || null,
        mode: mode
      });
    } else {
      console.warn('ADVERTENCIA: Socket no conectado, no se pudo enviar la acción:', actionData);
      setMessage('Error de conexión: No se pudo enviar la acción.');
    }
  }, [setMessage, playerId, mode]);

  const reconstructBoard = useCallback((boardData) => {
    if (!boardData) return null;
    const boardInstance = Tablero.fromSimpleObject(boardData);
    if (boardInstance.ships) {
        boardInstance.ships.forEach(ship => {
            if (ship.isSunk && ship.positions) {
                ship.positions.forEach(pos => {
                    if (boardInstance.grid[pos.row] && boardInstance.grid[pos.row][pos.col]) {
                        boardInstance.grid[pos.row][pos.col].isSunkShipPart = true;
                    }
                });
            }
        });
    }
    return boardInstance;
  }, []);

  const handleActionReceived = useCallback((data) => {
    const { action } = data;
    console.log('DEBUG: [Server -> Frontend] Acción recibida:', action.type, action);
    console.log('DEBUG: [Server -> Frontend] Mi ID actual:', playerId.current);

    switch (action.type) {
      case 'ATTACK_RECEIVED': {
        const { coordinates, attackingPlayerId, newTableroPlayer, sunkShip } = action;
        const playerBoardInstance = reconstructBoard(newTableroPlayer);

        if (playerBoardInstance) {
          setTableroPlayer(playerBoardInstance);
          setMessage(`Te ha atacado ${attackingPlayerId?.substring(0,6)}... en [${coordinates.row},${coordinates.col}]: ${action.message}`);

          if (sunkShip) {
            setMessage(`¡Tu barco ${sunkShip.name} ha sido hundido!`);
          }

          if (playerBoardInstance.areAllShipsSunk()) {
            setMessage('¡Has perdido! El oponente hundió todos tus barcos.');
            setGamePhase(FASES_JUEGO.FINALIZADO);
          }
        } else {
            console.warn('ADVERTENCIA: ATTACK_RECEIVED no contiene newTableroPlayer. No se pudo actualizar el tablero del jugador.');
        }
        break;
      }
      case 'ATTACK_RESULT': {
        const { targetPlayerId, newTableroTarget, sunkShip } = action;

        if (targetPlayerId === internalRival1IdRef.current) { 
            setTableroRival(reconstructBoard(newTableroTarget));
            setMessage(`Tu ataque a RIVAL 1 (${targetPlayerId?.substring(0,6)}...) en [${action.coordinates.row},${action.coordinates.col}]: ${action.message}`);
        } else if (mode === '2vs2' && targetPlayerId === internalRival2IdRef.current) { 
            setTableroRival2(reconstructBoard(newTableroTarget));
            setMessage(`Tu ataque a RIVAL 2 (${targetPlayerId?.substring(0,6)}...) en [${action.coordinates.row},${action.coordinates.col}]: ${action.message}`);
        } else {
            console.warn('ADVERTENCIA: ATTACK_RESULT con targetPlayerId desconocido o no aplicable al modo:', targetPlayerId);
        }

        if (sunkShip) {
            setMessage(`¡Hundiste el barco ${sunkShip.name} del jugador ${targetPlayerId?.substring(0,6)}...!`);
        }
        break;
      }
      case 'TURN_CHANGE': {
        const { nextPlayerId, message: turnMessage } = action;
        console.log(`DEBUG: [Server -> Frontend] TURN_CHANGE. Siguiente turno (ID real): ${nextPlayerId}. Mi ID: ${playerId.current}`);
        
        // ¡CORRECCIÓN CLAVE AQUÍ!
        setCurrentPlayerTurn(nextPlayerId); // Establece el ID real del jugador del turno
        setMessage(turnMessage || (nextPlayerId === playerId.current ? '¡Es tu turno!' : 'Es el turno del oponente.'));
        break;
      }
      case 'GAME_STATE_UPDATE': {
        const { myBoard, opponentBoard, allyBoard, secondOpponentBoard, message: stateMessage, playersInfo, currentPlayerTurn: serverCurrentPlayerTurn } = action;
        console.log(`DEBUG: [Server -> Frontend] GAME_STATE_UPDATE recibido. Turno del servidor: ${serverCurrentPlayerTurn}`);
        
        if (myBoard) setTableroPlayer(reconstructBoard(myBoard));
        if (opponentBoard) setTableroRival(reconstructBoard(opponentBoard));
        
        if (mode === '2vs2') {
            if (allyBoard) setTableroAlly(reconstructBoard(allyBoard));
            if (secondOpponentBoard) setTableroRival2(reconstructBoard(secondOpponentBoard));
            if (playersInfo) setPlayersInGame(playersInfo);
        }
        
        // ¡CORRECCIÓN CLAVE AQUÍ! Asegúrate de actualizar el turno también con el GAME_STATE_UPDATE
        if (serverCurrentPlayerTurn) {
            setCurrentPlayerTurn(serverCurrentPlayerTurn);
            console.log(`DEBUG: [Server -> Frontend] setCurrentPlayerTurn con GAME_STATE_UPDATE a: ${serverCurrentPlayerTurn}`);
        }
        setMessage(stateMessage || 'Estado del juego actualizado.');
        break;
      }
      case 'PLAYER_ELIMINATED': {
        const { playerId: eliminatedPlayerId, eliminatedBy, message } = action;
        setMessage(message || `El jugador ${eliminatedPlayerId?.substring(0,6)}... ha sido eliminado de la partida.`);
        break;
      }
      case 'GAME_OVER': {
          const { winnerTeamId, winnerPlayerId, message, teamId: clientTeamId } = action;
          setMessage(message);
          setGamePhase(FASES_JUEGO.FINALIZADO);

          if (mode === '2vs2') {
              if (winnerTeamId && clientTeamId === winnerTeamId) { 
                  console.log('¡Tu equipo ha ganado la batalla!');
              } else {
                  console.log('¡Tu equipo ha perdido la batalla!');
              }
          } else {
              if (winnerPlayerId === playerId.current) {
                  console.log('¡Has ganado la batalla!');
              } else {
                  console.log('¡Has perdido la batalla!');
                  setMessage(winnerPlayerId ? `Has perdido. ¡${winnerPlayerId?.substring(0,6)}... ha ganado!` : message);
              }
          }
          // Asegurarse de que el turno se borra al finalizar
          setCurrentPlayerTurn(null); 
          break;
      }
      case 'OPPONENT_LEFT': {
          const { opponentId, message } = action;
          setMessage(message || `Un oponente ha abandonado la partida.`);
          setGamePhase(FASES_JUEGO.FINALIZADO);
          // Asegurarse de que el turno se borra al abandonar
          setCurrentPlayerTurn(null); 
          break;
      }
      case 'waitingPlayersUpdate': {
        const { count, requiredPlayers, mode: updateMode } = action;
        setMessage(`Jugadores en cola para ${updateMode === 2 ? '1vs1' : '2vs2'}: ${count}. Necesitamos ${requiredPlayers - count} más.`);
        break;
      }
      case 'connectionSuccess': {
        setMessage(action.message);
        break;
      }
      default:
        console.warn('ADVERTENCIA: Acción desconocida recibida del servidor:', action.type, action);
    }
  }, [mode, setTableroPlayer, setTableroRival, setTableroAlly, setTableroRival2, setMessage, setGamePhase, setCurrentPlayerTurn, playerId, setTeamId, setPlayersInGame, reconstructBoard]);

  useEffect(() => {
    if (mode !== 'multiplayer' && mode !== '2vs2') {
      if (socketRef.current) {
        console.log('DEBUG: Desconectando socket (modo no multijugador/2vs2).');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Prevención de reconexión si ya está conectado y en el mismo modo
    if (socketRef.current && socketRef.current.connected && socketRef.current._hasRequestedGameMode === mode) {
        console.log(`DEBUG: Socket ya conectado y modo de juego '${mode}' solicitado. No intentando reconectar.`);
        return;
    }

    // Desconectar socket existente si cambia el modo o no está conectado
    if (socketRef.current) { // Si existe un socket, desconéctalo antes de crear uno nuevo
        console.log(`DEBUG: Desconectando socket existente (previo al cambio de modo o reconexión).`);
        socketRef.current.disconnect();
        socketRef.current = null; // Asegurarse de limpiar la referencia
    }
    
    console.log('DEBUG: Iniciando nueva conexión Socket.IO a:', SOCKET_SERVER_URL);
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('connect', () => {
      playerId.current = socketRef.current.id;
      setMessage('Conectado al servidor. Buscando partida...');
      console.log('DEBUG: [Socket] Conectado. Mi Socket ID/Player ID:', playerId.current);

      let gameModeNumber;
      if (mode === 'multiplayer') {
        gameModeNumber = 2;
      } else if (mode === '2vs2') {
        gameModeNumber = 4;
      } else {
        console.error('ERROR: Modo de juego desconocido. No se puede enviar requestGameMode.');
        setMessage('Error: Modo de juego no configurado correctamente.');
        socketRef.current.disconnect();
        return;
      }
      socketRef.current.emit('requestGameMode', gameModeNumber);
      socketRef.current._hasRequestedGameMode = mode; // Marcar el modo solicitado
    });

    socketRef.current.on('gameFound', (data) => {
      setGameId(data.gameId);
      setGamePhase(FASES_JUEGO.COLOCACION);
      setCurrentPlayerTurn(null); // Al encontrar la partida, nadie tiene el turno aún (fase de colocación)

      console.log(`DEBUG: [Socket] gameFound. Game ID: ${data.gameId}.`);
      console.log('DEBUG: Datos de la partida:', data);

      // Resetear las refs internas y los estados de los IDs al encontrar una nueva partida
      allyIdRef.current = null;
      internalRival1IdRef.current = null;
      internalRival2IdRef.current = null;
      setRival1Id(null); 
      setRival2Id(null); 

      if (mode === 'multiplayer') {
          internalRival1IdRef.current = data.opponentId; // Actualiza la ref interna
          setRival1Id(data.opponentId); // Actualiza el estado para GameComponent
          setMessage(`Partida 1vs1 ${data.gameId?.substring(0,10)}... encontrada. Tu oponente es: ${data.opponentId?.substring(0,6)}... ¡Coloca tus barcos!`);
      } else if (mode === '2vs2') {
          setTeamId(data.teamId); 
          
          if (data.playersInGame && Array.isArray(data.playersInGame)) {
              setPlayersInGame(data.playersInGame);
              let tempRival1 = null;
              let tempRival2 = null;

              data.playersInGame.forEach(player => {
                  if (player.id !== playerId.current) { // Si no es el jugador actual
                      if (player.teamId === data.teamId) { // Es un aliado
                          allyIdRef.current = player.id;
                      } else { // Es un oponente
                          if (!tempRival1) {
                              tempRival1 = player.id;
                          } else {
                              tempRival2 = player.id;
                          }
                      }
                  }
              });
              internalRival1IdRef.current = tempRival1;
              internalRival2IdRef.current = tempRival2;
              setRival1Id(tempRival1); 
              setRival2Id(tempRival2);
          } else {
              console.warn('ADVERTENCIA: gameFound (2vs2) no contiene playersInGame o no es un array válido.', data);
              setMessage('Error al obtener la información de los jugadores de la partida.');
          }

          setMessage(`Partida 2vs2 ${data.gameId?.substring(0,10)}... encontrada. Estás en el equipo: ${data.teamId}. ¡Coloca tus barcos!`);
      }
    });

    socketRef.current.on('playerAction', handleActionReceived);

    socketRef.current.on('gameStarted', (data) => {
      setGamePhase(FASES_JUEGO.BATALLA);
      // ¡CORRECCIÓN CLAVE AQUÍ!
      setCurrentPlayerTurn(data.startingPlayerId); // Establece el ID real del jugador que inicia
      const playerIsStarting = (data.startingPlayerId === playerId.current);
      setMessage(`¡Batalla iniciada! ${playerIsStarting ? '¡Es tu turno!' : 'Es el turno del oponente.'}`);
      console.log(`DEBUG: [Socket] gameStarted. Jugador inicial: ${data.startingPlayerId}. Soy yo: ${playerIsStarting}. Fase: ${FASES_JUEGO.BATALLA}. Turno establecido a: ${data.startingPlayerId}`);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('DEBUG: [Socket] Desconectado del servidor. Razón:', reason);
      setMessage('Desconectado del servidor.');
      setGameId(null);
      setCurrentPlayerTurn(null); // Limpiar el turno al desconectar
      setGamePhase(FASES_JUEGO.COLOCACION);
      allyIdRef.current = null;
      internalRival1IdRef.current = null;
      internalRival2IdRef.current = null;
      setRival1Id(null); 
      setRival2Id(null); 
      setPlayersInGame([]);
      setTeamId(null);
      if (socketRef.current) {
          socketRef.current._hasRequestedGameMode = null; // Restablecer para permitir nueva conexión
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('ERROR: [Socket] Error del socket:', error);
      setMessage(`Error del servidor: ${error.message || 'Desconocido'}`);
    });

    return () => {
      if (socketRef.current) {
        console.log('DEBUG: Limpiando y desconectando socket en cleanup de useEffect.');
        socketRef.current.off('connect');
        socketRef.current.off('gameFound');
        socketRef.current.off('playerAction');
        socketRef.current.off('gameStarted');
        socketRef.current.off('disconnect');
        socketRef.current.off('error');
        socketRef.current.disconnect();
        socketRef.current = null;
        allyIdRef.current = null;
        internalRival1IdRef.current = null;
        internalRival2IdRef.current = null;
      }
    };
  }, [
    mode,
    setGameId,
    setMessage,
    setGamePhase,
    setCurrentPlayerTurn, // Dependencia crucial
    handleActionReceived,
    playerId,
    setTableroRival,
    setTableroAlly,
    setTableroRival2,
    setTeamId,
    setPlayersInGame,
    setRival1Id,
    setRival2Id,
  ]);

  return { sendPlayerAction, currentSocketPlayerId: playerId, rival1Id: internalRival1IdRef.current, rival2Id: internalRival2IdRef.current };
};