"use strict";

var fs			= require('fs');
var path		= require('path');
var crypto		= require('crypto');

var SETTING_PREFIX = 'sound_';
var registered_sounds = [];

function init() {

	Homey.log("com.athom.soundboard running");

	Homey.manager('flow').on('action.play', function( callback, args ){
		playSound( args.sound.id, callback );
	});

	Homey.manager('flow').on('action.play.sound.autocomplete', function( callback, args ){

		var sounds = getSounds();
			sounds = sounds.filter(function(sound){
				return sound.name.toLowerCase().indexOf( args.query ) > -1;
			})

		callback( null, sounds );
	})

}

function playSound( sound_id, callback ) {

	var soundObj = getSound( sound_id, true );
	if( soundObj instanceof Error ) return callback( soundObj );

	// don't upload sample if already uploaded
	if( registered_sounds.indexOf(sound_id) > -1 ) {
		soundObj.path = null;
	}

	if( soundObj.type == 'audio/wav' ) {
		Homey.manager('speaker').playWav( soundObj.id, soundObj.path, function(err){
			if( err ) return callback(err);
			registered_sounds.push( soundObj.id );
			return callback( null, true );
		});
	} else if( soundObj.type == 'audio/mp3' ) {
		Homey.manager('speaker').playMp3( soundObj.id, soundObj.path, function(err){
			if( err ) return callback(err);
			registered_sounds.push( soundObj.id );
			return callback( null, true );
		});
	} else {
		return callback( new Error("invalid_sound_type") );
	}

}

function getSounds() {
	var result = [];

	Homey.manager('settings')
		.getKeys()
		.forEach(function(setting){

			// skip other settings
			if( setting.substring(0, SETTING_PREFIX.length) != SETTING_PREFIX ) return;

			var sound_id = setting.substring(SETTING_PREFIX.length);
			result.push( getSound( sound_id ) );
		})

	return result;
}

function getSound( sound_id ) {

	var sound = Homey.manager('settings').get( SETTING_PREFIX + sound_id );
	if( typeof sound == 'undefined' ) return new Error("invalid_sound_id");

	var returnObj = {
		id		: sound.id,
		name	: sound.name,
		type	: sound.type,
		path	: sound.path
	}

	return returnObj;
}

function addSound( sound ) {

	if( typeof sound.buffer == 'string' ) sound.buffer = new Buffer(sound.buffer, 'base64');
	if( !Buffer.isBuffer(sound.buffer) ) return new Error("invalid_sound.buffer");

	var id = crypto.randomBytes(12).toString('hex');

	var soundObj = {
		id		: id,
		name	: sound.name || 'New Sound',
		type	: sound.type,
		path	: path.join( Homey.paths.userdata, id )
	}

	try {
		fs.writeFileSync( soundObj.path, sound.buffer );
	} catch(e){
		return e;
	}

	Homey.manager('settings').set( SETTING_PREFIX + soundObj.id, soundObj );

	return getSound( soundObj.id );

}

function updateSound( sound_id, sound ) {

	var soundObj = getSound( sound_id );
	if( soundObj instanceof Error ) return soundObj;

	if( sound && sound.name ) soundObj.name = sound.name;

	Homey.manager('settings').set( SETTING_PREFIX + soundObj.id, soundObj );

	return getSound( soundObj.id );

}

function deleteSound( sound_id ) {

	var sound = Homey.manager('settings').get( SETTING_PREFIX + sound_id );
	if( typeof sound == 'undefined' ) return new Error("invalid_sound_id");

	try {
		fs.unlinkSync( sound.path );
	} catch(e){
		return e;
	}

	Homey.manager('settings').unset( SETTING_PREFIX + sound_id );

	return true;
}

module.exports.playSound 	= playSound;
module.exports.getSound 	= getSound;
module.exports.getSounds 	= getSounds;
module.exports.addSound 	= addSound;
module.exports.updateSound 	= updateSound;
module.exports.deleteSound 	= deleteSound;
module.exports.init 		= init;