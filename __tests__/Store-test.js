jest.dontMock('../src/Store');

var Store = require('../src/Store');

describe('Store', () => {
	it('will call updaters passed to register method with the action passed to dispatch', () => {
		//TODO, rewrite test
	});

	it('can replace the state before starting to dispatch', () => {
		//TODO, rewrite test
	});

	it('can skip updaters at the beginning of the dispatch', () => {
		//TODO, rewrite test
	});

	it('will call the onSever arg of the updaters if no client side settings are given', () => {
		//TODO, rewrite test
	});

	it('will call the onSever arg of the updaters if the arg is given', () => {
		//TODO, rewrite test
	});

	it('will call the finishOnServer function if given and onServer is called', () => {
		//TODO, rewrite test
	});

	it('will not call the finishOnServer function if given and onServer is not called', () => {
		//TODO, rewrite test
	});

	it('will call finishedUpdaters after all the updater have been called in the store', () => {
		//TODO, rewrite test
	});

	it('can replace the state of the store, keeping the same updaters', () => {
		//TODO, rewrite test
	});

	it('will get the initial state before dispatch is called', () => {
		//TODO, rewrite test
	});

	it('will get the initial state during a dispatch', () => {
		//TODO, rewrite test
	});

	it('will get the new state after the dispatch has finished', () => {
		//TODO, rewrite test
	});
});
