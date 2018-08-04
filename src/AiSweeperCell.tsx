import React from "react";
import {DisplayState, FieldCell, SpecialFieldState} from "./MineField";
import {noUnhandledCase} from "./util";

export interface AiSweeperCellProps {
    cell: FieldCell
}

function fontAwesome(className: string) {
    return <div className="aisweeper-cell aisweeper-cell-fa">
        <i className={className}/>
    </div>;
}

function text(cellState: string, type: string, className: string = "") {
    return <div className={"aisweeper-cell aisweeper-cell-" + type + " " + className}>
        <strong>{cellState}</strong>
    </div>;
}

function mapFieldState({state, display}: FieldCell) {
    switch (display) {
        case DisplayState.FLAGGED:
            return fontAwesome("fas fa-pennant");
        case DisplayState.HIDDEN:
            return text("", "hidden");
        case DisplayState.VISIBLE:
            break;
        default:
            return noUnhandledCase(display);
    }
    if (typeof state === "number") {
        return text(state === 0 ? "" : state.toString(), "number-" + state);
    }

    switch (state) {
        case SpecialFieldState.MINE:
            return fontAwesome("fal fa-skull");
        default:
            return noUnhandledCase(state);
    }
}

export const AiSweeperCell: React.SFC<AiSweeperCellProps> = (props) => {
    return mapFieldState(props.cell);
};