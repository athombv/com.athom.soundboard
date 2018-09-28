'use strict';

const { join } = require('path');
const { readFile, writeFile, unlink, rename } = require('fs');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const Homey = require('homey');

var SETTING_PREFIX = 'sound_';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);
const renameAsync = promisify(rename);

class SoundboardApp extends Homey.App {
	
	onInit() {
		this.log('SoundboardApp running...');
		
		new Homey.FlowCardAction('play')
			.register()
			.registerRunListener(async ({ sound }) => {
				return this.playSound({ id: sound.id });
			})
			.getArgument('sound')
			.registerAutocompleteListener(async query => {
				return this.getSounds()
					.filter(sound => {
						return sound.name.toLowerCase().indexOf( query.toLowerCase() ) > -1;						
					})
					.map(sound => {
						return {
							id: sound.id,
							name: sound.name,
						}
					})
			});
			
		this._migration1().catch(this.error);
		
	}
	
	/*
		Add file extension to paths, to serve the correct Content-Type for e.g. Sonos integration
	*/
	async _migration1() {
		const sounds = this.getSounds();
		await Promise.all(sounds.map(async ({ id, type, path }) => {
			const ext = this.getExtByType(type);				
			if( path.endsWith(ext) ) return;
			
			const newPath = path + ext;
			
			await renameAsync(path, newPath);
			await this.updateSound({ id, path: newPath });
		}));
		
	}
	
	async playSound({ id }) {
		const { type, path } = await this.getSound({ id });
		const filepath = join(__dirname, path);
		
		if( type === 'audio/mp3' )
			return Homey.ManagerAudio.playMp3(id, filepath);
			
		if( type === 'audio/wav' )
			return Homey.ManagerAudio.playWav(id, filepath);
		
		throw new Error('unsupported_type');
	}
	
	getSounds() {
		return Homey.ManagerSettings.getKeys()
			.filter(key => {
				return key.indexOf(SETTING_PREFIX) === 0;
			})
			.map(key => {
				return this.getSound({
					id: key.substring(SETTING_PREFIX.length),
				});			
			});
	}
	
	getSound({ id }) {
		const sound = Homey.ManagerSettings.get(`${SETTING_PREFIX}${id}`);
		if( !sound ) throw new Error('invalid_sound');
		return sound;
	}
	
	async createSound({ type, name, buffer }) {
		if( !['audio/wav', 'audio/mp3'].includes(type) )
			throw new Error('invalid_type');
			
		const buf = new Buffer(buffer, 'base64');
		if( !Buffer.isBuffer(buf) )
			throw new Error("invalid_buffer");
			
		const id = randomBytes(12).toString('hex');
		const ext = this.getExtByType(type);
		const path = `./userdata/${id}${ext}`;
		await writeFileAsync(path, buf);
		
		await Homey.ManagerSettings.set(`${SETTING_PREFIX}${id}`, {
			id,
			type,
			name,
			path,
		});
		return this.getSound({ id });
	}
	
	async updateSound({ id, name, path }) {
		const sound = await this.getSound({ id });
		
		if( typeof name === 'string' )
			sound.name = name;
			
		if( typeof path === 'string' )
			sound.path = path;
		
		await Homey.ManagerSettings.set(`${SETTING_PREFIX}${id}`, sound);
		
		return this.getSound({ id });
		
	}
	
	async deleteSound({ id }) {
		const sound = await this.getSound({ id });
		try {
			await unlinkAsync(sound.path);
		} catch( err ) {
			this.error(err);
		}
		await Homey.ManagerSettings.unset(`${SETTING_PREFIX}${id}`);
		
	}
	
	getExtByType(type) {
		if( type === 'audio/mp3' )
			return '.mp3';
			
		if( type === 'audio/wav' )
			return '.wav';
		
		throw new Error('unsupported_type');
	}
	
}

module.exports = SoundboardApp;