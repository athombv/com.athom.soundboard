'use strict';

const { join } = require('path');
const { readFile, writeFile, unlink, rename } = require('fs');
const { randomBytes } = require('crypto');
const { promisify } = require('util');
const Homey = require('homey');

const SETTING_PREFIX = 'sound_';
const TYPES_MAP = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
};

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);
const renameAsync = promisify(rename);

class SoundboardApp extends Homey.App {

	onInit() {
		this.log('SoundboardApp running...');

		this.homey.flow.getActionCard('play')
			.registerRunListener(async ({ sound }) => {
				return this.playSound({ id: sound.id });
			})
			.registerArgumentAutocompleteListener('sound', async (query) => {
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

		if( TYPES_MAP[type] === 'mp3' )
			return this.homey.audio.playMp3(id, path);

		if( TYPES_MAP[type] === 'wav' )
			return this.homey.audio.playWav(id, path);

		throw new Error('unsupported_type');
	}

	getSounds() {
		return this.homey.settings.getKeys()
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
		const sound = this.homey.settings.get(`${SETTING_PREFIX}${id}`);
		if( !sound ) throw new Error('invalid_sound');
		return sound;
	}

	async createSound({ type, name, buffer }) {
		if( !TYPES_MAP[type] )
			throw new Error(`invalid_type:${type}`);

		const buf = Buffer.from(buffer, 'base64');
		if( !Buffer.isBuffer(buf) )
			throw new Error("invalid_buffer");

		const id = randomBytes(12).toString('hex');
		const ext = this.getExtByType(type);
		const path = `./userdata/${id}${ext}`;
		await writeFileAsync(path, buf);

		await this.homey.settings.set(`${SETTING_PREFIX}${id}`, {
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

		await this.homey.settings.set(`${SETTING_PREFIX}${id}`, sound);

		return this.getSound({ id });

	}

	async deleteSound({ id }) {
		const sound = await this.getSound({ id });
		try {
			await unlinkAsync(sound.path);
		} catch( err ) {
			this.error(err);
		}
		await this.homey.settings.unset(`${SETTING_PREFIX}${id}`);

	}

	getExtByType(type) {
	  const typeSimple = TYPES_MAP[type];
	  if(!typeSimple)
  		throw new Error('unsupported_type');

    return `.${typeSimple}`;
	}

}

module.exports = SoundboardApp;
