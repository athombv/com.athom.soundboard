"use strict";

const Homey = require('homey');

module.exports = [

	{
		method		: 'POST',
		path		: '/:id/play',
		fn: async ({ params: { id }}) => {
			return Homey.app.playSound({ id });
		},
	},

	{
		method: 'GET',
		path: '/',
		fn: async ({}) => {
			return Homey.app.getSounds();
		},
	},

	{
		method: 'GET',
		path: '/',
		fn: async ({ params: { id } }) => {
			return Homey.app.getSound({ id });
		},
	},

	{
		method: 'POST',
		path: '/',
		fn: async ({ body: { type, name, buffer } }) => {
			return Homey.app.createSound({
				type,
				name,
				buffer,
			});
		},
	},

	{
		method		: 'PUT',
		path		: '/:id',
		fn: async ({ params: { id }, body: {  name } }) => {
			return Homey.app.updateSound({
				id,
				name,
			});
		},
	},

	{
		method		: 'DELETE',
		path		: '/:id',
		fn: async ({ params: { id } }) => {
			return Homey.app.deleteSound({ id });
		},
	}

]