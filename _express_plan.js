//----------------------------------------------------------------------------------------------------------------------
// server.js
//----------------------------------------------------------------------------------------------------------------------

import express from 'express';
import { serverDispatcherWith } from 'express-isomorphic-dispatcher';

import { pageStringUsing } from './app';
import stores from './stores';


let app = express();
app.use(serverDispatcherWith(stores, {							// Contains the defaults
	path: '/dispatch',
	encodeState(state, storeName) {
		return Json.stringify(state);
	},
	decodeState(stateString, storeName) {
		return Json.parse(stateString);
	}
}, (req, res) => {
	return req;
}));
app.get('/', (req, res) => {
	const dispatcher = req.dispatcher.getInitialDispatcher();

	res.send(pageStringUsing(dispatcher));
});

app.listen(8080);

//----------------------------------------------------------------------------------------------------------------------
// client.js
//----------------------------------------------------------------------------------------------------------------------

import { createClientDispatcher } from 'express-isomorphic-dispatcher';

import { renderPage } from './app';
import stores from './stores';

window.onload = () => {
	const dispatcher = createClientDispatcher(stores, {			// Contains the defaults
		path: '/dispatch',
		encodeState(state, storeName) {
			return Json.stringify(state);
		},
		decodeState(stateString, storeName) {
			return Json.parse(stateString);
		}
	});

	renderPage(dispatcher, document.getElementFromId('app-wrapper'));
};

//----------------------------------------------------------------------------------------------------------------------
// express-isomorphic-dispatcher
//----------------------------------------------------------------------------------------------------------------------

import express from 'express';
import { createClientFactory, createServerFactory } from 'isomorphic-dispatcher';

import * as dispatchRequest from './dispatchRequest';
import * as dispatchResponse from './dispatchResponse';
import sendXMLHttpRequest from './utils/sendXMLHttpRequest';

import type Store from '../Store';

const DEFAULT_PATH = '/dispatch';

export function serverDispatcherWith(
	stores: {[key: string]: Store<any>},
	settings: Object,
	getOnServerArg: (req: ExpressReq, res: ExpressRes) => any
): ExpressRouter {
	const { path, encodeState, decodeState } = settings;

	let router = express.Router();
	router.use((req, res, next) => {
		req.dispatcher = createServerFactory(stores, { onServerArg: getOnServerArg(req, res) });
		next();
	});
	router.post(path? path: DEFAULT_PATH, (req, res, next) => {
		// Perform given actions on store
		const { startingPoints, actions } = dispatchRequest.decode(req.body, decodeState);
		const dispatcherPromise = req.dispatcher.getDispatcherAfter(startingPoints, actions);

		dispatcherPromise.then((dispatcher) => {
			// Get updated stores
			const updatedStoreNames = Object.keys(pausedStates);
			const updatedStates = dispatcher.getStateForAll().filter((_, storeName) => {
				return pausedStates.includes(storeName);
			});

			// Send response
			const responseJson = dispatchResponse(updatedStates, encodeState);
			res.send(responseJson);
		}).catch((err) => {
			next(err);
		});
	});

	return router;
}

export function createClientDispatcher(stores: {[key: string]: Store<any>}, settings: Object): Dispatcher {
	const { path, encodeState, decodeState } = settings;
	const dispatcherFactory = createClientFactory(stores, {
		finishOnServer(pausePoints: StartingPoints, actions: Array<Action>): Promise<Object> {
			// Send paused state to server
			const data = dispatchRequest.encode(pausePoints, actions, encodeState);
			const responsePromise = sendXMLHttpRequest(path? path: DEFAULT_PATH, data);

			// Update client for response
			return responsePromise.then((response) => {
				return dispatchResponse.decode(response, decodeState);
			});
		}
	});

	return dispatcherFactory.getInitialDispatcher();
}