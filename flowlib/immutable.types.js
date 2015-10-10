declare module "immutable" {
	declare class List<T> {
		static <T>(array?: Array<T>): List<T>;
		set(value: T): List<T>;
		get(index: number): T;
		count(): number;
		push(...values: T[]): List<T>;
		delete(index: number): List<T>;
		indexOf(searchValue: T): number;
		reduce<R>(reducer: (reduction: R, value: T, index: number) => R, initialReduction?: R): R;
		forEach(sideEffect: (value: T, index: number) => void): void;
		toJS(): Array<T>;
	}

	declare class Map<K, V> {
		static <K, V>(obj?: {[key: K]: V}): Map<K, V>;
		set(key: K, value: V): Map<K, V>;
		get(key: K): V;
		keys(): Iterable<number, K>;
		values(): Iterable<number, V>;
		has(key: K): boolean;
		includes(value: V): boolean;
		map<M>(mapper: (value: V, key: K) => M): Map<K, M>;
		forEach(sideEffect: (value: V, key: K) => void): void;
		toJS(): {[key: K]: V};
	}
}
