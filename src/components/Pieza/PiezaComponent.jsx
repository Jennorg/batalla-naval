import React from "react";
import { useState } from "react";

const PiezaComponent = ({pieza}) => {  
  return (
    <div className="pieza">
      <img src={pieza.getSkin()} alt="Pieza Skin" className="piezaSkin" />
    </div>
  );
}

export default PiezaComponent;