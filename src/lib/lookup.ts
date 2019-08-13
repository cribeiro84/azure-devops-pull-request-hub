export interface ILookup<T> {
    [key: string]: T;
}

export function toLookup<T>(
    data: T[],
    keySelector: (x: T) => string
): ILookup<T> {
    const map: { [key: string]: T } = {};

    for (const d of data) {
        map[keySelector(d)] = d;
    }

    return map;
}

export function getLookupValue<T>(
    lookup: ILookup<T>,
    key: string
): T | undefined {
    if (!lookup) {
        return undefined;
    }

    return lookup[key];
}
