import * as THREE from 'three';

export default class SceneManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.scenes = new Map();
    this.active = null; // { name, instance }
    this._lastTime = performance.now();
  }

  register(name, factory) {
    this.scenes.set(name, { factory, instance: null });
  }

  async show(name, options = { unloadOthers: true }) {
    if (!this.scenes.has(name)) throw new Error(`Scene '${name}' not registered`);

    // stop current
    if (this.active) {
      try { await this.active.instance.stop(); } catch (e) { console.warn('error stopping scene', e); }
    }

    const entry = this.scenes.get(name);
    if (!entry.instance) {
      // create instance lazily
      entry.instance = await entry.factory(this.renderer);
      if (entry.instance.init) await entry.instance.init(this.renderer);
    }

    this.active = { name, instance: entry.instance };
    if (this.active.instance.start) await this.active.instance.start();

    // Optionally unload other scenes to free GPU resources
    if (options.unloadOthers) {
      for (const [otherName, otherEntry] of this.scenes) {
        if (otherName === name) continue;
        if (otherEntry.instance && otherEntry.instance.dispose) {
          try {
            otherEntry.instance.stop && await otherEntry.instance.stop();
            otherEntry.instance.dispose();
          } catch (e) {
            console.warn('error disposing scene', otherName, e);
          }
          otherEntry.instance = null;
        }
      }
    }
  }

  // Unload a specific scene resources (dispose and remove instance)
  unload(name) {
    const entry = this.scenes.get(name);
    if (!entry || !entry.instance) return;
    try {
      entry.instance.stop && entry.instance.stop();
      entry.instance.dispose && entry.instance.dispose();
    } catch (e) {
      console.warn('error unloading scene', name, e);
    }
    entry.instance = null;
  }

  // Unload all scenes except the provided name
  unloadAllExcept(name) {
    for (const [otherName, otherEntry] of this.scenes) {
      if (otherName === name) continue;
      if (otherEntry.instance && otherEntry.instance.dispose) {
        try {
          otherEntry.instance.stop && otherEntry.instance.stop();
          otherEntry.instance.dispose();
        } catch (e) {
          console.warn('error disposing scene', otherName, e);
        }
        otherEntry.instance = null;
      }
    }
  }

  async update() {
    if (!this.active) return;
    const now = performance.now();
    const dt = (now - this._lastTime) / 1000;
    this._lastTime = now;
    try {
      if (this.active.instance.animate) this.active.instance.animate(dt);
    } catch (e) {
      console.error('scene animate error', e);
    }
  }

  async resize(width, height) {
    for (const [, entry] of this.scenes) {
      if (entry.instance && entry.instance.resize) entry.instance.resize(width, height);
    }
  }
}
