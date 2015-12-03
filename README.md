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
* Immutable JS
	* Automatically included with isomorphic-dispatcher

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
store = store.register(function(state, action) {
	// Update state for action
	//NOTE, do not mutate either argument

	return state;
});
```

The updater is also sent a third argument, which is a function. It can be called with a function that will always run  on the server. The return value of the 'onServer' function must be returned from the updater. The return value of the callback passed to the 'onServer' function, which can be a Promise or normal value, will be the new state after the updater finished running.
```
store = store.register(function(state, action, onServer) {
	return onServer(function(serverArg) {
		// Code that should only run on ther server

		return state;
	});
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
dispatcher.dispatch(action).then(function(updatedStates) {
	for(var storeName in updatedStates) {
		var state = updatedStates[storeName];

		// Perform updates for new state
	}
});
```

To get the state for all the Stores use the 'getStateForAll' method.
It will throw an Error if the called while a 'dispatch' is happening.
```
var states = dispatcher.getStateForAll();
for(var storeName in states) {
	var state = states[storeName];

	// Perform updates for new state
}
```

To get the state of a single Store use the 'getStateFor' method.
It will throw an Error if the called while a 'dispatch' is happening.
```
var state = dispatcher.getStateFor('storeName');
```

Use the 'subscribeToAll' method to add a subscriber to the changes the Stores.
The subscriber will be passed an object that contains the updated states in the Stores.
It returns a function will unsubscribe the subscriber.
```
// Subscribe to all stores
var unsubscribe = dispatcher.subscribeToAll(function(updatedStates) {
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
var unsubscribe = dispatcher.subscribeTo('storeName', function(updatedState) {
	 // Perform updates for new state
});

// Unsubscribe from 'storeName'
unsubscribe();
```

##### ClientDispatcher
The Dispatcher for the client is created using the 'createClientDispatcher' function.
The first argument is the same array of Stores that passed to the 'createServerDispatcher' function on server.
Its second argument is a function that should call the 'startDispatchAt' method of the ServerDispatcher.
```
function handleDispatchOnServer(action, startingPoints) => {
	return Promise((resolve, reject) => {
		// Send action and starting points to the server

		// Resolve the states returned from the server
	});
}

var serverDispatcher = IsomorphicDispatcher.createClientDispatcher(stores, handleDispatchOnServer);
```

##### ServerDispatcher
The Dispatcher for the client is created using the 'createServerDispatcher' function.
It takes the same array of Stores that passed to the 'createDispatcher' function.
```
var serverDispatcher = IsomorphicDispatcher.createServerDispatcher(stores);
```

To add the argument that will be given to the 'onServer' callback, see Store updaters, use the 'cloneWithOnServerArg' method.
```
var onServerArg = {};
var serverDispatcherWithArg = serverDispatcher.cloneWithOnServerArg(arg);
```
*NOTE: This method creates a new Dispatcher, so use the value returned from 'cloneWithOnServerArg'*

To connection with the ClientDispatcher, call the 'startDispatchAt' method when the second argument of 'createClientDispatcher' function is called.
It should be passed the actions and starting points from the 'createClientDispatcher' callback.
The states returned from 'startDispatchAt' (on the server) should be returned as a Promise in the 'createClientDispatcher' callback (on the client).
```
// Call after 'handleDispatchOnServer' is called on the server
function handleDispatchFromClient(function(action, startingPoints) {
	return serverDispatcher.startDispatchAt(action, startingPoints);
}
```

### Tests
Test are writen using [jest](https://facebook.github.io/jest/).

To perform tests, build/run a Docker image/container using:
```
docker build -t dispatcher-test <path to repo>
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
* Only call subscribers when the state of a Store has mutated
* Create Express middleware and/or Socket.io bindings, that automatically connects the client and the server Dispatchers
* Create flow type definitions for public API
* Get documentation from code
