import React from "react";


const CeldaComponent = ({
  fila,
  columna,
  inPreview,
  onHover,
  onLeave,
  onClick
}) => {
  return (
    <span
      onMouseEnter={() => onHover && onHover(fila, columna)}
      onMouseLeave={() => onLeave && onLeave()}
      onClick={() => onClick && onClick(fila, columna)}
    >
      .
    </span>
  );
};

export default CeldaComponent;