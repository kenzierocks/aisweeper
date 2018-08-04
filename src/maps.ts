export interface KeyMappingMap<EXPOSED_K, V> extends Map<EXPOSED_K, V> {
    getOrDefault<D>(key: EXPOSED_K, defValue: D): V | D
}

class KeyMappingMapImpl<EXPOSED_K, INTERNAL_K, V> implements KeyMappingMap<EXPOSED_K, V> {

    private readonly delegate: Map<INTERNAL_K, V> = new Map();
    readonly [Symbol.toStringTag]: "Map" = "Map";

    private readonly exposedToInternal: (exp: EXPOSED_K) => INTERNAL_K;
    private readonly internalToExposed: (exp: INTERNAL_K) => EXPOSED_K;

    constructor(exposedToInternal: (exp: EXPOSED_K) => INTERNAL_K,
                internalToExposed: (exp: INTERNAL_K) => EXPOSED_K) {
        this.exposedToInternal = exposedToInternal;
        this.internalToExposed = internalToExposed;
    }

    set(key: EXPOSED_K, value: V): this {
        this.delegate.set(this.exposedToInternal(key), value);
        return this;
    }

    get(key: EXPOSED_K): V | undefined {
        return this.delegate.get(this.exposedToInternal(key));
    }

    getOrDefault<D>(key: EXPOSED_K, defValue: D): V | D {
        const internalKey = this.exposedToInternal(key);
        if (!this.delegate.has(internalKey)) {
            return defValue;
        }
        return this.delegate.get(internalKey) as V;
    }

    get size() {
        return this.delegate.size;
    }

    private* newIterator(): Iterator<[EXPOSED_K, V]> {
        for (const [k, v] of this.delegate) {
            yield [this.internalToExposed(k), v];
        }
    }

    [Symbol.iterator](): IterableIterator<[EXPOSED_K, V]> {
        const iter: IterableIterator<[EXPOSED_K, V]> = Object.assign(this.newIterator(), {
            [Symbol.iterator](): IterableIterator<[EXPOSED_K, V]> {
                return iter;
            }
        });
        return iter;
    }

    clear(): void {
    }

    delete(key: EXPOSED_K): boolean {
        return this.delegate.delete(this.exposedToInternal(key));
    }

    entries(): IterableIterator<[EXPOSED_K, V]> {
        return this[Symbol.iterator]();
    }

    forEach(callbackfn: (value: V, key: EXPOSED_K, map: Map<EXPOSED_K, V>) => void, thisArg?: any): void {
        for (const [k, v] of this) {
            callbackfn.call(thisArg, v, k, this);
        }
    }

    has(key: EXPOSED_K): boolean {
        return this.delegate.has(this.exposedToInternal(key));
    }

    private* newKeysIterator(): Iterator<EXPOSED_K> {
        for (const k of this.delegate.keys()) {
            yield this.internalToExposed(k);
        }
    }

    keys(): IterableIterator<EXPOSED_K> {
        const iter: IterableIterator<EXPOSED_K> = Object.assign(this.newKeysIterator(), {
            [Symbol.iterator](): IterableIterator<EXPOSED_K> {
                return iter;
            }
        });
        return iter;
    }

    values(): IterableIterator<V> {
        return this.delegate.values();
    }

}

interface KeyMappingMapConstructor<EK> {
    new<V>(): KeyMappingMap<EK, V>
}

export function newKeyMapperMap<EK, IK>(name: string, extToInt: (ext: EK) => IK, intToExt: (int: IK) => EK): KeyMappingMapConstructor<EK> {
    class CustomKeyMappingMap<V> extends KeyMappingMapImpl<EK, IK, V> {
        constructor() {
            super(extToInt, intToExt);
        }

        get name(): string {
            return name;
        }
    }

    return CustomKeyMappingMap;
}