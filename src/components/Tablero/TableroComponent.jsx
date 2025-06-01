import React from "react";
import "./TableroComponent.css";

const TableroComponent = ({
  tablero,
  onCellClick,
  onCellMouseEnter,
  onBoardMouseLeave,
  previewCells = [],
  previewInvalidCells = [],
  isPlayerBoard,
  gamePhase,
  selectedShipTypeId,
  disabled,
}) => {
  const handleCellClick = (row, col) => {
    if (disabled) return;
    onCellClick(row, col);
  };

  const getCellClass = (cell, r, c) => {
    let className = 'cell';
    if (cell && cell.isHit) {
      if (cell.isSunkShipPart) {
        className += ' cell-sunk-ship'; 
      } else {
        className += cell.isOccupied ? ' cell-hit' : ' cell-miss';
      }
    } else if (isPlayerBoard && cell && cell.isOccupied) {
      className += ' cell-ship'; 
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
      onMouseLeave={onBoardMouseLeave}
    >
      {tablero && tablero.grid && tablero.grid.map((rowArr, rowIndex) =>
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