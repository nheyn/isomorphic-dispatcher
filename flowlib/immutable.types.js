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
	}
}
