import React, { useState } from "react";

import CeldaComponent from "@/components/Celda/CeldaComponent";
import "./TableroComponent.css";

const TableroComponent = ({
  tablero,
  onCellClick, // Cambiado de onPlaceShip a un manejador de clic genérico
  onCellMouseEnter,
  onBoardMouseLeave,
  previewCells = [],
  previewInvalidCells = [],
  isPlayerBoard, // Para saber si es el tablero del jugador (para colocar) o del rival (para atacar)
  gamePhase,
  selectedShipTypeId, // Para saber si hay un barco seleccionado para colocar
  disabled, // Para deshabilitar interacciones en el tablero del rival durante la colocación
}) => {
  const handleCellClick = (row, col) => {
    if (disabled) return;
    onCellClick(row, col);
  };

  const getCellClass = (cell, r, c) => {
    let className = 'cell';
    if (cell && cell.isHit) {
      className += cell.isOccupied ? ' cell-hit' : ' cell-miss';
    } else if (isPlayerBoard && cell && cell.isOccupied) {
      className += ' cell-ship'; // Mostrar barcos del jugador
    }

    if (previewCells.some(p => p.row === r && p.col === c)) {
      className += ' cell-preview';
    }
    if (previewInvalidCells.some(p => p.row === r && p.col === c)) {
      className += ' cell-preview-invalid';
    }
    return className;
  };

  return (
    <div
      className="tablero-grid"
      onMouseLeave={onBoardMouseLeave} // Evento para cuando el mouse sale del tablero
    >
      {tablero.grid.map((rowArr, rowIndex) =>
        rowArr.map((cell, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={getCellClass(cell, rowIndex, colIndex)}
            onClick={() => handleCellClick(rowIndex, colIndex)}
            onMouseEnter={() => onCellMouseEnter && onCellMouseEnter(rowIndex, colIndex)}
          >
          </div>
        ))
      )}
    </div>
  );
};

export default TableroComponent;