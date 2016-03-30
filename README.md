# Isomorphic Dispatcher
*A redux style Dispatcher that can be used on both the client and server*

Dispatcher/Store classes that can be used for data flow in isomorphic javascript apps.
Based on [redux](https://github.com/rackt/redux/) and [async-dispatcher](https://github.com/nheyn/async-dispatcher)  projects.

### Features
* The Dispatcher sends actions to multiple Stores
* Subscriber functions can be added to all of a Dispatchers Stores or just one
* Stores can use any data structure for its state
* Stores can use multiple updater functions to mutate their state
* Updater functions can finish running on the server (to query a database, make api calls, etc) with one function call
  * NOTE: The connection to the server must be implemented separately, see [express-isomorphic-dispatcher](https://github.com/nheyn/express-isomorphic-dispatcher) for use with express or an example for custom implementations

### Dependencies
* ES2015(ES6) Promises
  * Must include an ES2015 compatible Promises library, tested using [Babel polyfill](https://babeljs.io/docs/usage/polyfill/)

### Install
Isomorphic Dispatcher is hosted on npm, and can be installed using:

```
npm install --save isomorphic-dispatcher
```

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

The updater is also sent a third argument, which can be used to finish the current dispatch on the server. When called the current dispatch will pick up from the where the 'onServer' function is called. The value returned from the 'onServer' function must be returned from the updater in order for the server to be called. For performance reason, the action should be checked before the 'onServer' function is called.
```
store = store.register(function(state, action, onServer) {
  if(action.type !== 'CORRECT_TYPE') return state;

  return onServer(function(serverArg) {
    // Code that should only run on the server

    return state;
  });
});
```
*NOTE: The Store class is immutable, so use the Store returned from the '.register' method*

##### Dispatcher
Dispatchers contain a set of Stores, where the same actions are dispatched to all of the Stores at the same time.

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
If a dispatch is currently happening, it will return the state before the dispatch began.
```
var states = dispatcher.getStateForAll();
for(var storeName in states) {
  var state = states[storeName];

  // Perform updates for new state
}
```

To get the state of a single Store use the 'getStateFor' method.
```
var state = dispatcher.getStateFor('storeName');
```

Use the 'subscribeToAll' method to subscribe to the changes in the Stores.
The subscriber will be passed an object that contains the updated states in the Stores.
It returns a function that will, when called, unsubscribe the subscriber.
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

Use the 'subscribeTo' method to add to subscribe to the changes in a single Stores.
The subscriber will be passed the updated state for the given Store.
It returns a function that will, when called, unsubscribe the subscriber.
```
// Subscribe to 'storeName'
var unsubscribe = dispatcher.subscribeTo('storeName', function(updatedState) {
   // Perform updates for new state
});

// Unsubscribe from 'storeName'
unsubscribe();
```

##### DispatcherFactory
Dispatcher are made using DispatcherFactory objects.


*Server*

On the server side, use the 'createServerFactory' function to make a new Dispatcher factory.
It takes an object that contains the Stores used by the Dispatchers, along with an object.
The object will be passed to the 'onServer' functions in every updater that calls it.
```
var stores = { ... };
var serverArg = { some: 'object' };
var dispatcherFactory = IsomorphicDispatcher.createServerFactory(stores, serverArg);
```

*Client*

On the client side, use the 'createClientFactory' function to make a new Dispatcher factory.
It takes an object that contains the Stores used by the Dispatchers, along with a function.
The function should call the sever, and return the updated states from the response as a Promise.
```
var stores = { ... };
var dispatcherFactory = IsomorphicDispatcher.createClientFactory(stores, function(pausePoints, actions) {
  return Promise(function(resolve, reject) {
    // Send action and starting points to the server

    // Resolve the states returned from the server
  });
});
```

To create a Dispatcher with the initial state in its Stores, call the 'getInitialDispatcher' method of the Factory.
```
var dispatcher = dispatcherFactory.getInitialDispatcher();
```

To create a Dispatcher with an updated state use the 'getDispatcherAfter' method of the Factory.
The first argument is an array of actions to perform on the dispatcher.
The second is the place to start the dispatch at, this can be used when connecting the client and server Dispatchers.
These arguments, actions and startingPoints, are the same as the ones that are passed to function used to create the client's DispatcherFactory.
```
var dispatcher = dispatcherFactory.getDispatcherAfter(actions, startingPoints);
```

### Tests
Test are written using [jest](https://facebook.github.io/jest/). Static type checking is done use [Flowtype](http://flowtype.org).

To perform static type check and the tests, build/run a Docker image/container using:
```
docker build -t dispatcher-test <path to repo>
docker run -it --rm dispatcher-test
```

### Documentation
Basic usage is given above. More detailed documentation is before class/function definitions within the code.

### Plans
* Only call subscribers when the state of the Store that was subscribed to has mutated
* Create flow type definitions for public API
* Get documentation from code
