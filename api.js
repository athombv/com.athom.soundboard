"use strict";

module.exports = [


	{
		method		: 'POST',
		path		: '/:id/play',
		fn			: function( callback, args ) {
			Homey.app.playSound( args.params.id, callback );
		}
	},

	{
		method		: 'GET',
		path		: '/',
		fn			: function( callback, args ) {
			var sounds = Homey.app.getSounds();
			callback( null, sounds );
		}
	},


	{
		method		: 'POST',
		path		: '/',
		fn			: function( callback, args ) {
			var result = Homey.app.addSound( args.body );
			if( result instanceof Error ) return callback( result );
			callback( null, result );
		}
	},


	{
		method		: 'PUT',
		path		: '/:id',
		fn			: function( callback, args ) {
			var result = Homey.app.updateSound( args.params.id, args.body );
			if( result instanceof Error ) return callback( result );
			callback( null, result );
		}
	},


	{
		method		: 'DELETE',
		path		: '/:id',
		fn			: function( callback, args ) {
			var result = Homey.app.deleteSound( args.params.id );
			if( result instanceof Error ) return callback( result );
			callback( null, result );
		}
	}

]