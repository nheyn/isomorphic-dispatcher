declare module "immutable" {
  declare class List<T> {
    static <T>(array?: Array<T>): List<T>;
    size: number;
    set(value: T): List<T>;
    get(index: number): T;
    first(): T;
    last(): T;
    count(): number;
    push(...values: T[]): List<T>;
    delete(index: number): List<T>;
    clear(): List<T>;
    shift(): List<T>;
    indexOf(searchValue: T): number;
    reduce<R>(reducer: (reduction: R, value: T, index: number) => R, initialReduction?: R): R;
    map<M>(mapper: (value: T, index: number) => M): List<M>;
    forEach(sideEffect: (value: T, index: number) => void): void;
    toJS(): Array<T>;
    toArray(): Array<T>;
  }

  declare class Map<K, V> {
    static <K, V>(obj?: {[key: K]: V}): Map<K, V>;
    size: number;
    set(key: K, value: V): Map<K, V>;
    get(key: K): V;
    delete(key: K): Map<K, V>;
    keys(): Iterable<number, K>;
    values(): Iterable<number, V>;
    has(key: K): boolean;
    includes(value: V): boolean;
    merge(otheMap: Map<K, V>): Map<K, V>;
    filter(filterFunc: (value: V, key: K) => boolean): Map<K, V>;
    map<M>(mapper: (value: V, key: K) => M): Map<K, M>;
    forEach(sideEffect: (value: V, key: K) => void): void;
    toJS(): {[key: K]: V};
    toObject(): {[key: K]: V};
  }
}
