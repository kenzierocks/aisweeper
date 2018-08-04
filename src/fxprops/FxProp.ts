export type FxPropListener<T> = (oldValue: T, newValue: T) => void;

export interface FxPropNestedListener<T, N> {
    nestedListener: FxPropListener<N>
    listener: FxPropListener<T>
    prop: (value: T) => FxProp<N>
}

/**
 * Emulator of JavaFx's property system.
 */
export class FxProp<T> {
    private readonly listeners = new Set<FxPropListener<T>>();
    private _value: T;

    constructor(value: T) {
        this._value = value;
    }

    get value() {
        return this._value;
    }

    set value(value: T) {
        const old = this._value;
        this._value = value;
        if (old !== this._value) {
            this.listeners.forEach(l => l(old, value));
        }
    }

    modify(modifier: (value: T) => T): T {
        this.value = modifier(this.value);
        return this.value;
    }

    addListener(listener: FxPropListener<T>) {
        listener(this.value, this.value);
        this.listeners.add(listener);
    }

    removeListener(listener: FxPropListener<T>) {
        this.listeners.delete(listener);
    }

    addNestedListener<N>(nestedProp: (value: T) => FxProp<N>, nestedListener: FxPropListener<N>): FxPropNestedListener<T, N> {
        const listener: FxPropNestedListener<T, N> = {
            nestedListener: nestedListener,
            listener(oldValue, newValue) {
                nestedProp(oldValue).removeListener(nestedListener);
                nestedProp(newValue).addListener(nestedListener);
            },
            prop: nestedProp
        };
        this.addListener(listener.listener);
        return listener;
    }

    removeNestedListener<N>(listener: FxPropNestedListener<T, N>) {
        this.removeListener(listener.listener);
        listener.prop(this.value).removeListener(listener.nestedListener);
    }
}