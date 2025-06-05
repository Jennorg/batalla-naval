import { useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS';
import Tablero from '@/classes/tablero/Tablero';

const SOCKET_SERVER_URL = 'https://backend-batallanaval.onrender.com'
// const SOCKET_SERVER_URL = 'http://localhost:3000';

export const useGameSocketEvents = ({
  mode,
  setMessage,
  setGameId,
  setCurrentPlayerTurn,
  setGamePhase,
  setTableroPlayer,
  setTableroOpponent1,
  setTableroOpponent2,
  setTableroOpponent3,
  setTeamId,
  setPlayersInGame,
  playerId,
  setOpponent1Id,
  setOpponent2Id,
  setOpponent3Id,
}) => {
  const socketRef = useRef(null);
  const internalOpponent1IdRef = useRef(null); 
  const internalOpponent2IdRef = useRef(null); 
  const internalOpponent3IdRef = useRef(null); 

  const sendPlayerAction = useCallback((actionData) => {
    if (socketRef.current && socketRef.current.connected) {
      const payload = {
        ...actionData,
        gameId: actionData.gameId || null,
        senderId: playerId.current || null,
        mode: mode
      };

      if (actionData.type === 'ATTACK') {
        if (mode === 'multiplayer') {
          if (!internalOpponent1IdRef.current) {
            setMessage('Error: No se puede atacar, ID del oponente desconocido (interno).');
            return;
          }
          payload.targetPlayerId = internalOpponent1IdRef.current;
        } else if (mode === '2vs2') {
          const validTargets = [internalOpponent1IdRef.current, internalOpponent2IdRef.current, internalOpponent3IdRef.current].filter(Boolean);
          if (!actionData.targetPlayerId || !validTargets.includes(actionData.targetPlayerId)) {
              setMessage('Error: Debes seleccionar un tablero rival válido para atacar.');
              return;
          }
          payload.targetPlayerId = actionData.targetPlayerId;
        }
      }

      console.log(`[FRONTEND - sendPlayerAction] Emitiendo acción:`, payload);

      socketRef.current.emit('playerAction', payload);
    } else {
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
        }
        break;
      }
      case 'ATTACK_RESULT': {
        const { targetPlayerId, newTableroTarget, sunkShip } = action;

        if (targetPlayerId === internalOpponent1IdRef.current) { 
            setTableroOpponent1(reconstructBoard(newTableroTarget));
            setMessage(`Tu ataque a Oponente 1 (${targetPlayerId?.substring(0,6)}...) en [${action.coordinates.row},${action.coordinates.col}]: ${action.message}`);
        } else if (targetPlayerId === internalOpponent2IdRef.current) { 
            setTableroOpponent2(reconstructBoard(newTableroTarget));
            setMessage(`Tu ataque a Oponente 2 (${targetPlayerId?.substring(0,6)}...) en [${action.coordinates.row},${action.coordinates.col}]: ${action.message}`);
        } else if (targetPlayerId === internalOpponent3IdRef.current) {
            setTableroOpponent3(reconstructBoard(newTableroTarget));
            setMessage(`Tu ataque a Oponente 3 (${targetPlayerId?.substring(0,6)}...) en [${action.coordinates.row},${action.coordinates.col}]: ${action.message}`);
        } else {
        }

        if (sunkShip) {
            setMessage(`¡Hundiste el barco ${sunkShip.name} del jugador ${targetPlayerId?.substring(0,6)}...!`);
        }
        break;
      }
      case 'TURN_CHANGE': {
        const { nextPlayerId, message: turnMessage } = action;
        
        setCurrentPlayerTurn(nextPlayerId);
        setMessage(turnMessage || (nextPlayerId === playerId.current ? '¡Es tu turno!' : 'Es el turno del oponente.'));
        break;
      }
      case 'GAME_STATE_UPDATE': {
        const { myBoard, opponentBoards, message: stateMessage, playersInfo, currentPlayerTurn: serverCurrentPlayerTurn } = action;
        
        if (myBoard) setTableroPlayer(reconstructBoard(myBoard));
        
        const currentOpponentsIds = playersInfo
            .filter(p => p.id !== playerId.current && p.isActive && !p.allMyShipsSunk)
            .map(p => p.id);

        internalOpponent1IdRef.current = null;
        internalOpponent2IdRef.current = null;
        internalOpponent3IdRef.current = null;
        setOpponent1Id(null);
        setOpponent2Id(null);
        setOpponent3Id(null);

        if (currentOpponentsIds.length > 0) {
            internalOpponent1IdRef.current = currentOpponentsIds[0];
            setOpponent1Id(currentOpponentsIds[0]);
            setTableroOpponent1(reconstructBoard(opponentBoards ? opponentBoards[currentOpponentsIds[0]] : null));
        } else {
             setTableroOpponent1(new Tablero());
        }
        if (currentOpponentsIds.length > 1) {
            internalOpponent2IdRef.current = currentOpponentsIds[1];
            setOpponent2Id(currentOpponentsIds[1]);
            setTableroOpponent2(reconstructBoard(opponentBoards ? opponentBoards[currentOpponentsIds[1]] : null));
        } else {
             setTableroOpponent2(new Tablero());
        }
        if (currentOpponentsIds.length > 2) {
            internalOpponent3IdRef.current = currentOpponentsIds[2];
            setOpponent3Id(currentOpponentsIds[2]);
            setTableroOpponent3(reconstructBoard(opponentBoards ? opponentBoards[currentOpponentsIds[2]] : null));
        } else {
             setTableroOpponent3(new Tablero());
        }

        if (playersInfo) setPlayersInGame(playersInfo);
        
        if (serverCurrentPlayerTurn) {
            setCurrentPlayerTurn(serverCurrentPlayerTurn);
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
              } else {
              }
          } else {
              if (winnerPlayerId === playerId.current) {
              } else {
                  setMessage(winnerPlayerId ? `Has perdido. ¡${winnerPlayerId?.substring(0,6)}... ha ganado!` : message);
              }
          }
          setCurrentPlayerTurn(null); 
          break;
      }
      case 'OPPONENT_LEFT': {
          const { opponentId, message } = action;
          setMessage(message || `Un oponente ha abandonado la partida.`);
          setGamePhase(FASES_JUEGO.FINALIZADO);
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
    }
  }, [mode, setTableroPlayer, setTableroOpponent1, setTableroOpponent2, setTableroOpponent3, setMessage, setGamePhase, setCurrentPlayerTurn, playerId, setTeamId, setPlayersInGame, reconstructBoard, setOpponent1Id, setOpponent2Id, setOpponent3Id]);

  useEffect(() => {
    if (mode !== 'multiplayer' && mode !== '2vs2') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOpponent1Id(null);
      setOpponent2Id(null);
      setOpponent3Id(null);
      return;
    }

    if (socketRef.current && socketRef.current.connected && socketRef.current._hasRequestedGameMode === mode && playerId.current === socketRef.current.id) {
        return;
    }

    if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
    }
  
    internalOpponent1IdRef.current = null;
    internalOpponent2IdRef.current = null;
    internalOpponent3IdRef.current = null;
    setOpponent1Id(null); 
    setOpponent2Id(null); 
    setOpponent3Id(null); 
    setGameId(null);
    setCurrentPlayerTurn(null);
    setGamePhase(FASES_JUEGO.LOBBY);
    setPlayersInGame([]);
    setTeamId(null);
    
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('connect', () => {
      playerId.current = socketRef.current.id;
      setMessage('Conectado al servidor. Buscando partida...');

      let gameModeNumber;
      if (mode === 'multiplayer') {
        gameModeNumber = 2;
      } else if (mode === '2vs2') {
        gameModeNumber = 4;
      } else {
        setMessage('Error: Modo de juego no configurado correctamente.');
        socketRef.current.disconnect();
        return;
      }
      socketRef.current.emit('requestGameMode', gameModeNumber);
      socketRef.current._hasRequestedGameMode = mode;
    });

    socketRef.current.on('gameFound', (data) => {
      setGameId(data.gameId);
      setGamePhase(FASES_JUEGO.COLOCACION);
      setCurrentPlayerTurn(null);

      if (mode === 'multiplayer') {
          const foundOpponentId = (data.opponentIds && data.opponentIds.length > 0) 
                                   ? data.opponentIds[0] 
                                   : null;
          internalOpponent1IdRef.current = foundOpponentId;
          setOpponent1Id(foundOpponentId); 
          setMessage(`Partida 1vs1 ${data.gameId?.substring(0,10)}... encontrada. Tu oponente es: ${foundOpponentId?.substring(0,6) || 'desconocido'}... ¡Coloca tus barcos!`);
      } else if (mode === '2vs2') {
          setTeamId(data.teamId); 
          if (data.playersInGame && Array.isArray(data.playersInGame)) {
              setPlayersInGame(data.playersInGame);
              const opponents = [];
              data.playersInGame.forEach(player => {
                  if (player.id !== playerId.current) {
                       opponents.push(player.id);
                  }
              });
              
              internalOpponent1IdRef.current = opponents[0] || null;
              internalOpponent2IdRef.current = opponents[1] || null;
              internalOpponent3IdRef.current = opponents[2] || null;

              setOpponent1Id(opponents[0] || null); 
              setOpponent2Id(opponents[1] || null);
              setOpponent3Id(opponents[2] || null);
              
          } else {
              setMessage('Error al obtener la información de los jugadores de la partida.');
          }

          setMessage(`Partida 2vs2 ${data.gameId?.substring(0,10)}... encontrada. ¡Coloca tus barcos!`);
      }
    });

    socketRef.current.on('playerAction', handleActionReceived);

    socketRef.current.on('gameStarted', (data) => {
      setGamePhase(FASES_JUEGO.BATALLA);
      setCurrentPlayerTurn(data.startingPlayerId);
      const playerIsStarting = (data.startingPlayerId === playerId.current);
      setMessage(`¡Batalla iniciada! ${playerIsStarting ? '¡Es tu turno!' : 'Es el turno del oponente.'}`);
    });

    socketRef.current.on('disconnect', (reason) => {
      setMessage('Desconectado del servidor.');
    
      internalOpponent1IdRef.current = null;
      internalOpponent2IdRef.current = null;
      internalOpponent3IdRef.current = null;
      setOpponent1Id(null); 
      setOpponent2Id(null); 
      setOpponent3Id(null); 
      setGameId(null);
      setCurrentPlayerTurn(null);
      setGamePhase(FASES_JUEGO.LOBBY);
      setPlayersInGame([]);
      setTeamId(null);
      if (socketRef.current) {
          socketRef.current._hasRequestedGameMode = null;
      }
    });

    socketRef.current.on('error', (error) => {
      setMessage(`Error del servidor: ${error.message || 'Desconocido'}`);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect');
        socketRef.current.off('gameFound');
        socketRef.current.off('playerAction');
        socketRef.current.off('gameStarted');
        socketRef.current.off('disconnect');
        socketRef.current.off('error');
        socketRef.current.disconnect(); 
        socketRef.current = null;
        internalOpponent1IdRef.current = null;
        internalOpponent2IdRef.current = null;
        internalOpponent3IdRef.current = null;
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
    setTableroOpponent1,
    setTableroOpponent2,
    setTableroOpponent3,
    setTeamId,
    setPlayersInGame,
    setOpponent1Id, 
    setOpponent2Id,
    setOpponent3Id,
  ]);

  return { 
    sendPlayerAction, 
    currentSocketPlayerId: playerId, 
  };
};