import React from "react";
import { useState } from "react";

import CeldaComponent from "@/components/Celda/CeldaComponent";

import "./TableroComponent.css";

const BOARD_SIZE = 10; // Tamaño del tablero

const TableroComponent = ({isActive, currentPlayerTurn, setCurrentPlayerTurn}) => {  
  
  const renderTablero = () => {
    let tableroElements = [];

    for (let i = 0; i < BOARD_SIZE; i++) {
      for (let j = 0; j < BOARD_SIZE ;j++) {
        tableroElements.push(
            <CeldaComponent 
              key={`${i}-${j}`}
              fila={i} 
              columna={j}
              currentPlayerTurn={currentPlayerTurn}
              setCurrentPlayerTurn={setCurrentPlayerTurn}
            />
        )
      }
    }

    return tableroElements;
  }

  return(
    <>
      <div className="tablero">
        {!isActive && (
          <div
            className="tablero-overlay"
          />
        )}
        {renderTablero()}
      </div>
    </>
  )  
};

export default TableroComponent;
