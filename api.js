'use strict';

module.exports = {

  async playSound({ homey, params: { id } }) {
    return homey.app.playSound({ id });
  },

  async getSounds({ homey }) {
    const sounds = await homey.app.getSounds();
    return sounds.map((sound) => ({
      id: sound.id,
      type: sound.type,
      name: sound.name,
      path: sound.path.startsWith('/')
        ? sound.path.substring(1)
        : sound.path,
    }));
  },

  async getSound({ homey, param: { id } }) {
    return homey.app.getSound({ id });
  },

  async createSound({ homey, body: { type, name, buffer } }) {
    return homey.app.createSound({
      type,
      name,
      buffer,
    });
  },

  async updateSound({ homey, params: { id }, body: { name } }) {
    return homey.app.updateSound({
      id,
      name,
    });
  },

  async deleteSound({ homey, params: { id } }) {
    return homey.app.deleteSound({ id });
  },

};
