# Isomorphic Dispatcher
*A redux style Dispatcher that can be used on both the client and server*

Dispatcher/Store classes that can be used for data flow in isomorphic javascript apps.
Based on [async-dispatcher](https://github.com/nheyn/async-dispatcher) and [redux](https://github.com/rackt/redux/) projects.

### Features
* The Dispatcher sends actions to multiple Stores
* Subscriber functions can be added to all of a Dispatchers Stores or just one
* Stores can use any data structure for its state
* Stores can use multiple updater functions to mutate their state
* Updater functions can force part of their code to run only on the server

### Dependencies
* ES2015(ES6) Promises
	* Must include an ES2015 compatible Promises library, tested using [Babel polyfill](https://babeljs.io/docs/usage/polyfill/)

### Usage
##### Store
Stores contain a state and a list of functions that are used to update the state.
They are created using the 'createStore' function, which takes the initial state of the Store as its argument.

```
var IsomorphicDispatcher = require('isomorphic-dispatcher');

var initialState = {};
var store  = IsomorphicDispatcher.createStore(initialState);
```

The state of Store can be mutated though updater functions. The function is sent the current state of the store and the action dispatched to the store. It should return the updated state, the return value can be a Promise. Updaters can be added using the 'register' method.
```
store = store.register((state, action) => {
	// Update state for action
	//NOTE, do not mutate either argument

	return state;
});
```

The updater is also sent a third argument, which is a function. It can be called with a function that will always run  on the server. The 'onServer' callback can return a Promise or normal value, but the return value of 'onServer' will always be a promise. Currently, the 'onServer' function can not be called asynchronously, meaning it must be called before the updater function returns.
```
store = store.register((state, action, onServer) => {
	var promiseFromServer = onServer((serverArg) => {
		// Code that should only run on ther server

		return state;
	});

	return promiseFromServer;
});
```
*NOTE: The Store class is immutable, so use the Store returned from the '.register' method*

##### Dispatcher
Dispatchers contain a set of Stores, where the same actions are dispatched to all of the Stores at the same time.
They are created using the 'createDispatcher' function, which is passed an object that contains the Stores to be used by the Dispatcher.
```
var stores = { storeName: store };
var dispatcher = IsomorphicDispatcher.createDispatcher(stores);
```

To update the states of the Stores use the 'dispatch' method. The return value is a Promise that contains the updated states for all of the Stores.
```
var action = { type: 'SOME_ACTION' };
dispatcher.dispatch(action).then((updatedStates) => {
	for(var storeName in updatedStates) {
		var state = updatedStates[storeName];

		// Perform updates for new state
	}
});
```

Use the 'subscribeToAll' method to add a subscriber to the changes the Stores.
The subscriber will be passed an object that contains the updated states in the Stores.
It returns a function will unsubscribe the subscriber.
```
// Subscribe to all stores
var unsubscribe = dispatcher.subscribeToAll((updatedStates) => {
	for(var storeName in updatedStates) {
		var state = updatedStates[storeName];

		// Perform updates for new state
	}
});

// Unsubscribe from all stores
unsubscribe();
```

Use the 'subscribeTo' method to add a subscriber to the changes in a single Stores.
The subscriber will be passed the updated state for the given Store.
It returns a function will unsubscribe the subscriber.
```
// Subscribe to 'storeName'
var unsubscribe = dispatcher.subscribeTo('storeName', (updatedState) => {
	 // Perform updates for new state
});

// Unsubscribe from 'storeName'
unsubscribe();
```

##### ClientDispatcher
The Dispatcher for the client is created using the 'createClientDispatcher' function. The first argument is the same array of Stores that passed to the 'createServerDispatcher' function on server. Its second argument is a function that should call the 'startDispatchAt' method of the ServerDispatcher.
```
function handleDispatchOnServer = (action, startingPoints) => {
	return Promise((resolve, reject) => {
		// Send action and starting points to the server

		// Resolve the states returned from the server
	});
}

var serverDispatcher = IsomorphicDispatcher.createClientDispatcher(stores, handleDispatchOnServer);
```

##### ServerDispatcher
The Dispatcher for the client is created using the function 'createServerDispatcher', which takes the same argument as 'createDispatcher'.
```
var serverDispatcher = IsomorphicDispatcher.createServerDispatcher(stores);
```

To connection with the ClientDispatcher, call the 'startDispatchAt' method when the second argument of 'createClientDispatcher' function is called. It should be passed the actions and starting points from the 'createClientDispatcher' callback, along with an object that will be passed to 'onServer' in the updaters of the Store. The states returned from 'startDispatchAt' (on the server) should be returned as a Promise in the 'createClientDispatcher' callback.
```
// Call after 'handleDispatchOnServer' is called on the server
function handleDispatchFromClient(action, startingPoints) {
	var serverArgs = {};

	return serverDispatcher.startDispatchAt(action, startingPoints, serverArgs);
}
```

### Tests
Test are writen using [jest](https://facebook.github.io/jest/).

To perform tests, build/run a Docker image/container using:
```
docker build -t dispatcher-test .
docker run -it --rm dispatcher-test
```

Static type checking is done use [Flowtype](http://flowtype.org).

To perform the checks, use the 'flow' cli tool:
```
cd <path to repo>/src/
flow start
flow
```

### Documentation
Basic usage is given above. More detailed documentation is before class/function definitions within the code.

### Plans
* Add index.js for public API
* Update to use let/const
* Change Store method name 'useIsoDispatcher' to 'finishOnServerUsing'
* Move utilities functions / classes to their own files
* Update Store to take the arg passed to 'onServer' the same way it adds 'useIsoDispatcher'
* Update internal data structures to use [Immutable.js](http://facebook.github.io/immutable-js/)
* Only call subscribers when the state of a Store has mutated
* Update Store to allow 'onServer' to be called asynchronously
* Create React.js bindings, that allows
	* Shortcut (mixin) for add/removing subscriber functions to the dispatcher
	* Stores to be added within a react class (for parent/child components communication)
* Create Express middleware and/or Socket.io bindings, that automatically connects the client and the server Dispatchers
* Add flow type definitions for public API
* Get documentation from code
