import React from 'react'
import { useState, useEffect } from 'react'

import TableroComponent from '@/components/Tablero/TableroComponent'
import PiezaComponent from '@/components/Pieza/PiezaComponent'
import Lancha from '@/classes/Lancha'

import FASES_JUEGO from '@/assets/FASES_DE_JUEGO.JS'  

import './App.css'

function App() {
  const [tableroPlayer, setPlayerBoard] = useState([]);
  const [tableroRival, setTableroRival] = useState([])
  const [playerShips, setPlayerShips] = useState([]);
  const [rivalShips, setRivalShips] = useState([]);
  const [selectedShipForPlacement, setSelectedShipForPlacement] = useState(null);
  const [placementOrientation, setPlacementOrientation] = useState('horizontal');
  const [currentPlayerTurn, setCurrentPlayerTurn] = useState('player');
  const [message, setMessage] = useState('Bienvenido al juego de Batalla Naval');
  const [turno, setTurno] = useState(true);
  const [gamePhase, setGamePhase] = useState(FASES_JUEGO.COLOCACION);

  const lanchaPlayer = new Lancha()
  const lanchaRival = new Lancha()  

  playerShips.push(lanchaPlayer);
  rivalShips.push(lanchaRival);  

  const handleShipPlacement = (ship) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) {
      setMessage('No puedes colocar barcos en esta fase del juego');
      return;
    }

    if (selectedShipForPlacement) {
      setMessage('Ya tienes un barco seleccionado para colocar');
      return;
    }

    //Logica para colocar el barco en el tablero del jugador
  }

  const handleShipOrientationChange = (orientation) => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) {
      setMessage('No puedes cambiar la orientación de los barcos en esta fase del juego');
      return;
    }

    setPlacementOrientation(orientation);
  }
  
  const handleGameStart = () => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) {
      setMessage('No puedes iniciar el juego en esta fase');
      return;
    }

    // Lógica para iniciar el juego, como cambiar la fase y preparar los tableros
    setGamePhase(FASES_JUEGO.BATALLA);
    setMessage('¡El juego ha comenzado! Es tu turno.');
  }

  const startGame = () => {
    if (gamePhase !== FASES_JUEGO.COLOCACION) {
      setMessage('No puedes iniciar el juego en esta fase');
      return;
    }

    // Aquí podrías agregar la lógica para iniciar el juego, como preparar los tableros y barcos
    setGamePhase(FASES_JUEGO.BATALLA);
    setMessage('¡El juego ha comenzado! Es tu turno.');
  } 

  const endTurn = () => {
    //POR LOS MOMENTOS INACTIVA LA VALIDACION POR PRUEBAS
    // if (gamePhase !== FASES_JUEGO.BATALLA) {
    //   setMessage('No puedes finalizar el turno en esta fase del juego');
    //   return;
    // }

    // Lógica para finalizar el turno, como cambiar al jugador rival
    // setCurrentPlayerTurn(currentPlayerTurn === 'player' ? 'rival' : 'player');
    setMessage(`Turno finalizado. Es el turno del ${currentPlayerTurn === 'player' ? 'rival' : 'jugador'}.`);
    console.log(`Turno finalizado. Es el turno del ${currentPlayerTurn === 'player' ? 'rival' : 'jugador'}.`);
  }

  const resetGame = () => {
    // Lógica para reiniciar el juego, como limpiar los tableros y barcos
    setPlayerBoard([]);
    setTableroRival([]);
    setPlayerShips([]);
    setRivalShips([]);
    setSelectedShipForPlacement(null);
    setPlacementOrientation('horizontal');
    setCurrentPlayerTurn('player');
    setMessage('Bienvenido al juego de Batalla Naval');
    setTurno(true);
    setGamePhase(FASES_JUEGO.COLOCACION);
  }

  const endGame = () => {
    // Lógica para finalizar el juego, como mostrar un mensaje de fin de juego
    setMessage('El juego ha finalizado. ¡Gracias por jugar!');
    setGamePhase(FASES_JUEGO.FINALIZADO);
  }

  useEffect(() => {
    if( gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'player') {
      setMessage('Es tu turno. Selecciona una celda para atacar.');
    }
    if (gamePhase === FASES_JUEGO.BATALLA && currentPlayerTurn === 'rival') {
      setMessage('Es el turno del rival. Espera a que realice su jugada.');
    }
    if (gamePhase === FASES_JUEGO.FINALIZADO) {
      setMessage('El juego ha finalizado. ¡Gracias por jugar!');
    }

    endTurn();
  },[currentPlayerTurn])
  


  return (
    <div className="gameContainer">
      <div className='tableroContainer'>
        <div className='piezaContainer'>
          <PiezaComponent 
            pieza={lanchaPlayer}             
          />
        </div>
        <TableroComponent 
          isActive={currentPlayerTurn === 'player'}
          currentPlayerTurn={currentPlayerTurn}
          setCurrentPlayerTurn={setCurrentPlayerTurn}
        />
      </div>
      <div className='tableroContainer'>
        <div className='piezaContainer'>
          <PiezaComponent 
            pieza={lanchaRival}             
          />
        </div>
        <TableroComponent 
          isActive={currentPlayerTurn === 'rival'}
          currentPlayerTurn={currentPlayerTurn}
          setCurrentPlayerTurn={setCurrentPlayerTurn}
        />
      </div>
    </div>
  )
}

export default App
