/**
 * Validate that the `default` branch of a switch is never taken.
 * @param x - the switch expression, which will evaluate to `never` if the default branch will never be taken
 */
export function noUnhandledCase(x: never): never {
    throw new Error("Unhandled case: " + x);
}