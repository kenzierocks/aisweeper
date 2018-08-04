import {KeyMappingMap, newKeyMapperMap} from "./maps";

export interface Dimensions {
    width: number
    height: number
}

export interface FieldLoc {
    readonly x: number
    readonly y: number
}

export function inBounds(loc: FieldLoc, {width, height}: Dimensions) {
    return 0 <= loc.x && loc.x < width
        && 0 <= loc.y && loc.y < height;
}

export function surroundingLocations(dim: Dimensions, loc: FieldLoc): FieldLoc[] {
    const surrounding = [];
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i == 0 && j == 0) {
                continue;
            }
            surrounding.push(add(loc, i, j));
        }
    }
    return surrounding.filter(loc => inBounds(loc, dim));
}

export function add(loc: FieldLoc, dx: number, dy: number): FieldLoc {
    return {
        x: loc.x + dx,
        y: loc.y + dy
    }
}

export function randomLocation({width, height}: Dimensions): FieldLoc {
    return {
        x: randomNumber(width),
        y: randomNumber(height)
    }
}

function randomNumber(upperBound: number): number {
    return Math.floor(Math.random() * upperBound);
}

export function fieldLocEqual(a?: FieldLoc, b?: FieldLoc) {
    if (!a || !b) {
        return false;
    }
    return a.x === b.x && a.y === b.y;
}

export function hashKey(loc: FieldLoc): string {
    return `${loc.x}/${loc.y}`;
}

export function unhash(key: string): FieldLoc {
    const [x, y] = key.split('/');
    return {
        x: parseInt(x),
        y: parseInt(y),
    }
}

export function getUnsafe<T>(field: T[][], loc: FieldLoc): T {
    return field[loc.x][loc.y];
}

export function setUnsafe<T>(field: T[][], loc: FieldLoc, cell: T) {
    field[loc.x][loc.y] = cell;
}

export interface FieldLocMap<V> extends KeyMappingMap<FieldLoc, V> {
}

export const FieldLocMap = newKeyMapperMap('FieldLocMap', hashKey, unhash);
