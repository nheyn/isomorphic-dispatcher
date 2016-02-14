/**
 * @flow
 */
import DispatcherFactory from './DispatcherFactory';
import { ServerDispatchHandler, ClientDispatchHandler } from './DispatchHandler';
import SubscriptionHandler from './SubscriptionHandler';

type StoresObject = {[key: string]: Store<any>};
type FinishOnServerFunc = (startingPoints: StartingPoints, actions: Array<Action>) => any;

/**
 * Creates a DispatcherFactory, from the given stores, that should be used on the server.
 *
 * @param stores		{StoresObject}		The initial stores to use in the dispatcher
 * @param onServerArg	{any}				The argument to pass to the function given to 'onServer'
 *											NOTE:	'onServer' is the third argument passed to each updater
 *
 * @return				{DispatcherFactory}	The dispatcher factory
 */
export function createServerFactory(stores: StoresObject, onServerArg: any): DispatcherFactory {
	return DispatcherFactory.createFactory({
		stores,
		createDispatchHandler(currStores: StoresObject): DispatchHandler {
			return new ServerDispatchHandler(currStores, onServerArg);
		},,
		createSubscriptionHandler(): SubscriptionHandler {
			return new SubscriptionHandler();
		}
	});
}

/**
 * Creates a DispatcherFactory, from the given stores, that should be used on the client.
 *
 * @param stores			{StoresObject}			The initial stores to use in the dispatcher
 * @param finishOnServer	{FinishOnServerFunc}	A function that will send the state of dispatch to finish on the
 *													server
 *
 * @return					{DispatcherFactory}		The dispatcher factory
 */
export function createClientFactory(stores: StoresObject, finishOnServer: FinishOnServerFunc): DispatcherFactory {
	return DispatcherFactory.createFactory({
		stores,
		createDispatchHandler(currStores: StoresObject): SubscriptionHandler {
			return new ClientDispatchHandler(currStores, finishOnServer);
		},
		createSubscriptionHandler(): SubscriptionHandler {
			return new SubscriptionHandler();
		}
	});
}