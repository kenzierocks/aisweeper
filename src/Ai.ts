import {FxProp} from "./fxprops/FxProp";
import {DisplayState, fieldLocToString, MineField, SpecialFieldState, VisibleState} from "./MineField";
import {generateField, MineFieldGenerationConfig} from "./MineFieldGenerator";
import {FieldLoc, fieldLocEqual, FieldLocMap, getUnsafe, surroundingLocations} from "./FieldLoc";

type AiState = {
    dead: boolean,
};

function defaultState(): AiState {
    return {
        dead: false,
    };
}

type SharedMine = {
    count: number,
    locations: FieldLocMap<boolean>
}

function sharedMineToString({count, locations}: SharedMine): string {
    return `[mines=${count},locations=${Array.from(locations.keys()).map(fieldLocToString)}]`;
}

const LOG: boolean = true;

function AI_LOG(...msg: any[]) {
    if (LOG) {
        console.log('[AI_LOG]', ...msg);
    }
}

export class Ai {
    private state: AiState = defaultState();

    newGame() {
        this.state = defaultState();
    }

    process(): boolean {
        const S = this.state;
        if (S.dead) {
            AI_LOG("Dead, ending process.");
            return false;
        }

        const field = MINE_FIELD.value;
        AI_LOG("Current field:\n" + field);
        if (field.complete) {
            AI_LOG("Board completed.");
            this.state.dead = true;
            return false;
        }

        // inefficient for now, later tracking can be done
        MINE_FIELD.value = this.findAndClickNextPossibility(field);

        return true;
    }

    private exploreTracked(field: MineField, loc: FieldLoc): MineField {
        const result = field.explore(loc);

        if (result.hitMine) {
            AI_LOG("Hit mine, we're dead!");
            this.state.dead = true;
            return result.newField;
        }

        return result.newField;
    }

    private findAndClickNextPossibility(field: MineField): MineField {
        const visible = field.stateField;
        for (let i = 0; i < field.width; i++) {
            for (let j = 0; j < field.height; j++) {
                const loc = {x: i, y: j};
                const state = getUnsafe(visible, loc);
                if (typeof state === "number" && state > 0) {
                    // a possibility!
                    const newField = this.tryClick(field, loc, state);
                    if (newField) {
                        return newField;
                    }
                }
            }
        }

        AI_LOG("Simplistic click model failed.");
        return this.sharedMineDeductions(field);
    }

    private tryClick(field: MineField, loc: FieldLoc, numberMines: number): MineField | undefined {
        // check flags around the location
        const unknown = Ai.countConditions(field, loc, state => state === DisplayState.HIDDEN);
        if (unknown === 0) {
            // we've covered this number
            return undefined;
        }

        // there might be an option here
        return this.discoverOptions(field, loc, numberMines);
    }

    private static countConditions(field: MineField, loc: FieldLoc,
                                   condition: (state: VisibleState) => boolean): number {
        return this.countManyConditions(field, loc, [condition])[0];
    }

    private static countManyConditions(field: MineField, loc: FieldLoc,
                                       conditions: ((state: VisibleState) => boolean)[]): number[] {
        const counters = Array.from<number>({length: conditions.length}).fill(0);
        for (const surrLoc of surroundingLocations(field, loc)) {
            const state = getUnsafe(field.stateField, surrLoc);
            conditions.forEach((cond, i) => {
                if (cond(state)) {
                    counters[i]++;
                }
            });
        }
        return counters;
    }

    private discoverOptions(field: MineField, loc: FieldLoc, numberMines: number): MineField | undefined {
        const [hidden, flags] = Ai.countManyConditions(field, loc, [
            state => state === DisplayState.HIDDEN,
            state => state === DisplayState.FLAGGED
        ]);
        AI_LOG("Near", fieldLocToString(loc), "#H = " + hidden, "#F = " + flags, "#M = " + numberMines);
        if (hidden + flags === numberMines) {
            AI_LOG("Flagging", fieldLocToString(loc), "#H = " + hidden, "#F = " + flags, "#M = " + numberMines);
            // we can just flag these
            return field.withMods(mutField => {
                surroundingLocations(mutField, loc)
                    .filter(surrLoc => mutField.get(surrLoc).display === DisplayState.HIDDEN)
                    .forEach(surrLoc => mutField.flag(surrLoc));
            });
        }
        if (flags === numberMines) {
            AI_LOG("Clicking", fieldLocToString(loc), "#H = " + hidden, "#F = " + flags, "#M = " + numberMines);
            // we can just click these
            return surroundingLocations(field, loc)
                .filter(surrLoc => field.get(surrLoc).display === DisplayState.HIDDEN)
                .reduce((field, surrLoc) => this.exploreTracked(field, surrLoc), field);
        }
        return undefined;
    }

    private sharedMineDeductions(field: MineField): MineField {
        const sharedMines = this.findSharedMines(field);

        if (sharedMines.size > 0) {
            const sharedMineField = this.sharedMineHiddenSpaceLogic(field, sharedMines);
            if (typeof sharedMineField !== "undefined") {
                return sharedMineField;
            }
        }

        AI_LOG("No hidden spaces with no mines.");
        return this.clearIfAllMinesMarked(field);
    }

    private getFullyContainedSharedMine(loc: FieldLoc, sharedMines: FieldLocMap<SharedMine>, locations: FieldLocMap<boolean>): SharedMine | undefined {
        for (const [numberLoc, sharedMine] of sharedMines) {
            if (fieldLocEqual(numberLoc, loc)) {
                continue;
            }
            if (Array.from(sharedMine.locations.keys())
                .every(sharedLoc => locations.has(sharedLoc))) {
                // this one works!
                return sharedMine;
            }
        }
        return undefined;
    }

    private filterOutSharedMines(loc: FieldLoc, mines: number,
                                 sharedMines: FieldLocMap<SharedMine>,
                                 locations: FieldLocMap<boolean>): number | undefined {
        while (mines > 0 && mines !== locations.size) {
            // see if any shared mine is fully contained in the locations
            const fullyContained = this.getFullyContainedSharedMine(loc, sharedMines, locations);
            if (typeof fullyContained === "undefined") {
                return undefined;
            }

            // subtract out the mines
            mines -= fullyContained.count;
            fullyContained.locations.forEach((v, fcLoc) => locations.delete(fcLoc));
        }
        return mines;
    }

    private findSharedMines(field: MineField): FieldLocMap<SharedMine> {
        AI_LOG("Finding shared mines.");
        const sharedMines = new FieldLocMap<SharedMine>();

        for (let i = 0; i < field.width; i++) {
            for (let j = 0; j < field.height; j++) {
                const loc = {x: i, y: j};
                const state = getUnsafe(field.stateField, loc);

                if (typeof state !== "number") {
                    continue;
                }

                const [hidden, flags] = Ai.countManyConditions(field, loc, [
                    state => state === DisplayState.HIDDEN,
                    state => state === DisplayState.FLAGGED,
                ]);
                const mines = state;

                if (hidden === 0 || mines <= flags) {
                    // there's no more mines here, skip this.
                    continue;
                }

                // the remaining mine is shared among the spaces available.
                const locations = new FieldLocMap<boolean>();
                surroundingLocations(field, loc)
                    .filter(surrLoc => getUnsafe(field.stateField, surrLoc) === DisplayState.HIDDEN)
                    .forEach(surrLoc => locations.set(surrLoc, true));

                const sharedMine: SharedMine = {
                    count: mines - flags,
                    locations: locations
                };
                AI_LOG("Shared mine added at", fieldLocToString(loc), sharedMineToString(sharedMine));
                sharedMines.set(loc, sharedMine);
            }
        }

        return sharedMines;
    }

    private sharedMineHiddenSpaceLogic(field: MineField, sharedMines: FieldLocMap<SharedMine>): MineField | undefined {
        AI_LOG("Finding hidden spaces with no mines...");
        for (let i = 0; i < field.width; i++) {
            for (let j = 0; j < field.height; j++) {
                const loc = {x: i, y: j};
                const state = getUnsafe(field.stateField, loc);

                if (typeof state !== "number") {
                    continue;
                }
                const mines = state;
                // find hidden locations
                const locations = new FieldLocMap<boolean>();
                surroundingLocations(field, loc)
                    .filter(surrLoc => getUnsafe(field.stateField, surrLoc) === DisplayState.HIDDEN)
                    .forEach(surrLoc => locations.set(surrLoc, true));
                const remainingMines = this.filterOutSharedMines(loc, mines, sharedMines, locations);
                if (typeof remainingMines === "undefined" || locations.size === 0) {
                    continue;
                }
                if (remainingMines === 0) {
                    // the rest of the locations can be cleared
                    return field.withMods(mutField => {
                        for (const clearable of locations.keys()) {
                            AI_LOG("Found hidden space", fieldLocToString(clearable), "with no mines, exploring.");
                            mutField.explore(clearable);
                        }
                    });
                } else if (remainingMines === locations.size) {
                    // the rest of the locations can be marked
                    return field.withMods(mutField => {
                        for (const clearable of locations.keys()) {
                            AI_LOG("Found hidden space", fieldLocToString(clearable), "with a mine, flagging.");
                            mutField.flag(clearable);
                        }
                    });
                }
            }
        }
        return undefined;
    }

    private clearIfAllMinesMarked(field: MineField): MineField {
        const flags = field.count(cell => cell.display == DisplayState.FLAGGED);
        const mines = field.count(cell => cell.state == SpecialFieldState.MINE);
        if (flags === mines) {
            AI_LOG("All mines marked, clearing all hidden cells.");
            return field.withMods(field => {
                for (let i = 0; i < field.width; i++) {
                    for (let j = 0; j < field.height; j++) {
                        field.explore({x: i, y: j});
                    }
                }
            });
        }
        AI_LOG("Haven't marked all mines. We're dead.");
        this.state.dead = true;
        return field;
    }
}

export const MINE_FIELD = new FxProp(MineField.empty({width: 0, height: 0}));

export function newGame(config: MineFieldGenerationConfig) {
    MINE_FIELD.value = generateField(config);
    GLOBAL_AI.value.newGame();
}

export const GLOBAL_AI = new FxProp(new Ai());

