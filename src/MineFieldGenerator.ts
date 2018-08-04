import {DisplayState, MineField, MutableMineField, SpecialFieldState} from "./MineField";
import {Dimensions, FieldLoc, fieldLocEqual, randomLocation, surroundingLocations} from "./FieldLoc";

export interface MineFieldGenerationConfig extends Dimensions {
    mines: number
    display?: DisplayState,
    clickLocation?: FieldLoc
}

export function generateField(config: MineFieldGenerationConfig): MineField {
    return MineField.empty(config).withMods(f => generateFieldModifiable(f, config));
}

function nearClick(field: Dimensions, loc: FieldLoc, clickLocation: FieldLoc) {
    if (fieldLocEqual(loc, clickLocation)) {
        return true;
    }
    return surroundingLocations(field, loc)
        .some(surrLoc => fieldLocEqual(surrLoc, clickLocation));
}

function generateFieldModifiable(field: MutableMineField, config: MineFieldGenerationConfig) {
    // pretty bad algo, don't have the time for a better one now
    const display = typeof config.display === "undefined" ? DisplayState.HIDDEN : config.display;
    const clickLoc = typeof config.clickLocation === "undefined" ? randomLocation(field) : config.clickLocation;
    let placedMines = 0;
    while (placedMines < config.mines) {
        const loc = randomLocation(field);
        const cell = field.get(loc);
        if (cell.state === SpecialFieldState.MINE || nearClick(field, loc, clickLoc)) {
            continue;
        }

        field.set(loc, {state: SpecialFieldState.MINE, display: display});
        updateSurroundingHints(field, loc, display);
        placedMines++;
    }
    if (field.explore(clickLoc)) {
        throw new Error("Hit mine during generation explore?");
    }
}

function updateSurroundingHints(field: MutableMineField, loc: FieldLoc, display: DisplayState) {
    for (const location of surroundingLocations(field, loc)) {
        const cell = field.get(location);
        if (typeof cell.state === "number") {
            field.set(location, {state: cell.state + 1, display: display});
        }
    }
}
