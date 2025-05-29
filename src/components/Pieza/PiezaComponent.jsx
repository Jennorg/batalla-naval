import React from "react";
import FASES_JUEGO from "@/assets/FASES_DE_JUEGO.JS";
import "./PiezaComponent.css";

const PiezaComponent = ({ shipTypeConfig, remainingCount, isSelected, onSelectShipType, gamePhase }) => {
  const canSelect = gamePhase === FASES_JUEGO.COLOCACION && remainingCount > 0;
  const handleClick = () => {
    if (canSelect) {
      onSelectShipType(shipTypeConfig.id);
    }
  };

  let btnClass = "pieza-btn";
  if (isSelected) btnClass += " pieza-btn-selected";
  if (!canSelect) btnClass += " pieza-btn-disabled";

  return (
    <button
      onClick={handleClick}
      disabled={!canSelect}
      className={btnClass}
    >
      {shipTypeConfig.name} ({shipTypeConfig.size})
      <br />
      <small className="pieza-btn-qty">Quedan: {remainingCount}</small>
    </button>
  );
};

export default PiezaComponent;