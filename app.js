'use strict';

const fs = require('fs');
const crypto = require('crypto');
const Homey = require('homey');

const SETTING_PREFIX = 'sound_';
const TYPES_MAP = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp3': 'mp3',
  'audio/mpeg': 'mp3',
};

class SoundboardApp extends Homey.App {

  async onInit() {
    this.log('SoundboardApp running...');

    this.homey.flow.getActionCard('play')
      .registerRunListener(async ({ sound }) => {
        return this.playSound({ id: sound.id });
      })
      .registerArgumentAutocompleteListener('sound', async (query) => {
        const sounds = await this.getSounds();
        return sounds
          .filter((sound) => {
            return sound.name.toLowerCase().indexOf(query.toLowerCase()) > -1;
          })
          .map((sound) => {
            return {
              id: sound.id,
              name: sound.name,
            };
          });
      });
  }

  async playSound({ id }) {
    const sound = await this.getSound({ id });

    if (typeof this.homey.platformVersion === 'number' && this.homey.platformVersion >= 2) {
      throw new Error('This Homey Pro cannot play sounds.');
    }

    if (TYPES_MAP[sound.type] === 'mp3') {
      return this.homey.audio.playMp3(id, sound.path);
    }

    if (TYPES_MAP[sound.type] === 'wav') {
      return this.homey.audio.playWav(id, sound.path);
    }

    throw new Error(`Unspported Type: ${sound.type}`);
  }

  async getSounds() {
    return this.homey.settings.getKeys()
      .filter((key) => key.startsWith(SETTING_PREFIX))
      .map((key) => this.homey.settings.get(key));
  }

  async getSound({ id }) {
    const sound = this.homey.settings.get(`${SETTING_PREFIX}${id}`);
    if (!sound) {
      throw new Error(`Invalid Sound: ${id}`);
    }

    return sound;
  }

  async createSound({ type, name, buffer }) {
    if (!TYPES_MAP[type]) {
      throw new Error(`Invalid Type: ${type}`);
    }

    const buf = Buffer.from(buffer, 'base64');
    if (!Buffer.isBuffer(buf)) {
      throw new Error('Invalid Buffer');
    }

    const id = crypto.randomBytes(12).toString('hex');
    const ext = this.getExtByType(type);
    const path = `./userdata/${id}${ext}`;
    await fs.promises.writeFile(path, buf);

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

    if (typeof name === 'string') {
      sound.name = name;
    }

    if (typeof path === 'string') {
      sound.path = path;
    }

    await this.homey.settings.set(`${SETTING_PREFIX}${id}`, sound);

    return this.getSound({ id });
  }

  async deleteSound({ id }) {
    const sound = await this.getSound({ id });
    await this.homey.settings.unset(`${SETTING_PREFIX}${id}`);

    try {
      await fs.promises.unlink(sound.path);
    } catch (err) {
      this.error(`Error Deleting File: ${err.message}`);
    }
  }

  getExtByType(type) {
    const typeSimple = TYPES_MAP[type];
    if (!typeSimple) {
      throw new Error(`Unsupported Type: ${type}`);
    }

    return `.${typeSimple}`;
  }

}

module.exports = SoundboardApp;
