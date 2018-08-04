import {Dimensions, FieldLoc, getUnsafe, inBounds, setUnsafe, surroundingLocations} from "./FieldLoc";
import {noUnhandledCase} from "./util";

export enum SpecialFieldState {
    MINE = 'MINE',
}

export enum DisplayState {
    HIDDEN = 'HIDDEN',
    VISIBLE = 'VISIBLE',
    FLAGGED = 'FLAGGED',
}

export type FieldState = SpecialFieldState | number;

export interface FieldCell {
    readonly state: FieldState
    readonly display: DisplayState
}

export function fieldLocToString(loc: FieldLoc) {
    return `<${loc.x}, ${loc.y}>`;
}

export type Field = FieldCell[][];

export type VisibleState = (FieldState | DisplayState.FLAGGED | DisplayState.HIDDEN);
export type StateField = VisibleState[][];

export interface MutableMineField {
    width: number
    height: number

    get(loc: FieldLoc): FieldCell

    set(loc: FieldLoc, cell: FieldCell): void

    flag(loc: FieldLoc): void

    explore(loc: FieldLoc): boolean
}


export interface ExploreResult {
    hitMine: boolean
    newField: MineField
}

export class MineField {

    static empty(size: { width: number, height: number }): MineField {
        return new MineField(Array.from({length: size.height}, () => {
            return new Array<FieldCell>(size.width).fill({state: 0, display: DisplayState.HIDDEN});
        }));
    }

    private readonly field: Field;
    private readonly visibleCount: number;
    readonly stateField: StateField;

    constructor(field: Field) {
        this.field = field;
        this.visibleCount = field.reduce(
            (acc, row) => acc
                + row.reduce(
                    (acc2, cell) => acc2
                        + (cell.display === DisplayState.HIDDEN ? 0 : 1),
                    0),
            0);
        this.stateField = MineField.makeStateField(field);
    }

    count(condition: (cell: FieldCell) => boolean): number {
        return this.field
            .map(col => col.filter(condition).length)
            .reduce((acc, nMines) => acc + nMines, 0);
    }

    get width() {
        return this.field.length;
    }

    get height() {
        return this.width === 0 ? 0 : this.field[0].length;
    }

    get complete() {
        return this.remaining === 0;
    }

    get remaining() {
        return this.width * this.height - this.visibleCount;
    }

    /**
     * Compute a simplified Field of only visible components.
     */
    private static makeStateField(field: Field): StateField {
        return field.map(row => {
            return row.map(x => {
                const disp = x.display;
                switch (disp) {
                    case DisplayState.VISIBLE:
                        return x.state;
                    case DisplayState.HIDDEN:
                    case DisplayState.FLAGGED:
                        return disp;
                    default:
                        return noUnhandledCase(disp);
                }
            });
        });
    }

    static checkBounds(loc: FieldLoc, dimensions: Dimensions) {
        if (!inBounds(loc, dimensions)) {
            throw new Error("Location out of bounds: " + fieldLocToString(loc))
        }
    }

    private copyField(): Field {
        return this.field.map(sub => sub.slice());
    }

    get(loc: FieldLoc): FieldCell {
        MineField.checkBounds(loc, this);
        return getUnsafe(this.field, loc);
    }

    with(loc: FieldLoc, cell: FieldCell): MineField {
        MineField.checkBounds(loc, this);
        const currentCell = getUnsafe(this.field, loc);
        if (currentCell === cell) {
            // TODO deep compare
            return this;
        }
        const field = this.copyField();
        setUnsafe(field, loc, cell);
        return new MineField(field);
    }

    withMods(modifier: (field: MutableMineField) => void): MineField {
        const copyField = () => this.copyField();
        const field = new MutableMineFieldImpl(copyField, this.width, this.height);
        modifier(field);
        return typeof field.field === "undefined" ? this : new MineField(field.field);
    }

    // helpers
    explore(loc: FieldLoc): ExploreResult {
        let hitMine = false;
        const newField = this.withMods(field => {
            hitMine = field.explore(loc);
        });
        return {
            hitMine: hitMine,
            newField: newField
        };
    }

    flag(loc: FieldLoc): MineField {
        return this.withMods(field => field.flag(loc));
    }

    showGrid(): MineField {
        return this.withMods(MineField.showGridMutable);
    }

    static showGridMutable(field: MutableMineField) {
        for (let i = 0; i < field.width; i++) {
            for (let j = 0; j < field.height; j++) {
                const loc = {x: i, y: j};
                const cell = field.get(loc);
                if (cell.display !== DisplayState.VISIBLE) {
                    field.set(loc, {
                        ...cell,
                        display: DisplayState.VISIBLE
                    });
                }
            }
        }
    }

    isWinningField(): boolean {
        for (let i = 0; i < this.width; i++) {
            for (let j = 0; j < this.height; j++) {
                const loc = {x: i, y: j};
                const {state, display} = this.get(loc);
                switch (display) {
                    case DisplayState.VISIBLE:
                        if (state === SpecialFieldState.MINE) {
                            return false;
                        }
                        break;
                    case DisplayState.HIDDEN:
                    case DisplayState.FLAGGED:
                        if (state !== SpecialFieldState.MINE) {
                            return false;
                        }
                        break;
                    default:
                        return noUnhandledCase(display);
                }
            }
        }
        return true;
    }

    toString(): string {
        let indexes: string[] = [];
        for (let i = 0; i < this.width; i++) {
            indexes.push(i.toString());
        }
        const indexRow = "  | " + indexes.join(" ");
        const sepRow = Array.from(indexRow).map(() => "-").join("");
        let rows = [
            indexRow, sepRow, ...this.field
                .map((col, index) => index + " | " + col.map(({state, display}) => {
                    switch (display) {
                        case DisplayState.HIDDEN:
                            if (state === SpecialFieldState.MINE) {
                                return "M";
                            }
                            return "H";
                        case DisplayState.FLAGGED:
                            return "F";
                        case DisplayState.VISIBLE:
                            if (typeof state === "number") {
                                return state.toString();
                            }
                            switch (state) {
                                case SpecialFieldState.MINE:
                                    return "M";
                                default:
                                    return noUnhandledCase(state);
                            }
                        default:
                            return noUnhandledCase(display);
                    }
                }).join(" "))
        ];
        return rows.join("\n");
    }

}

class MutableMineFieldImpl implements MutableMineField {
    private readonly copyField: () => Field;
    private _field: Field | undefined;
    readonly width: number;
    readonly height: number;

    constructor(copyField: () => Field, width: number, height: number) {
        this.copyField = copyField;
        this.width = width;
        this.height = height;
    }

    get field() {
        if (typeof this._field === "undefined") {
            this._field = this.copyField();
        }
        return this._field;
    }

    get(loc: FieldLoc): FieldCell {
        MineField.checkBounds(loc, this);
        return getUnsafe(this.field, loc);
    }


    set(loc: FieldLoc, cell: FieldCell) {
        if (getUnsafe(this.field, loc) === cell) {
            // TODO deep compare
            return;
        }
        MineField.checkBounds(loc, this);
        setUnsafe(this.field, loc, cell);
    }

    flag(loc: FieldLoc) {
        const cell = this.get(loc);
        if (cell.display !== DisplayState.FLAGGED) {
            setUnsafe(this.field, loc, {
                ...cell,
                display: DisplayState.FLAGGED
            });
        }
    }

    explore(loc: FieldLoc): boolean {
        const cell = this.get(loc);
        // we do not explore visible areas
        if (cell.display !== DisplayState.HIDDEN) {
            return false;
        }
        if (cell.state === SpecialFieldState.MINE) {
            MineField.showGridMutable(this);
            return true;
        }

        setUnsafe(this.field, loc, {...cell, display: DisplayState.VISIBLE});
        if (cell.state === 0) {
            // need to recursively generate
            surroundingLocations(this, loc).forEach(surrLoc => this.explore(surrLoc));
        }
        return false;
    }
}
