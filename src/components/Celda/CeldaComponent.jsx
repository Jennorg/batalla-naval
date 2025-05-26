import React from "react";
import { useState } from "react";
import "./CeldaComponent.css"
import Celda from "@/classes/Celda"

const CeldaComponent = ({fila, columna, currentPlayerTurn, setCurrentPlayerTurn}) => {
    let celda = new Celda(fila, columna);
    const [active, setActive] = useState(false);

    const activarCelda = () => {
        setActive(!active);
        setCurrentPlayerTurn(currentPlayerTurn === 'player' ? 'rival' : 'player');
    }

    return(
        <>
            <span 
                className={`celda ${active ? "celdaActiva" : ""}`} 
                onClick={activarCelda}
            >
                .
            </span>
        </>
    )
}

export default CeldaComponent;