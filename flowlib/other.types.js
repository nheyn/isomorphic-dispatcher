type MaybePromise<T> = Promise<T> | T;

type Action = {[key: string]: any};
type StartingPoint<S> = { state: S, index: number };
