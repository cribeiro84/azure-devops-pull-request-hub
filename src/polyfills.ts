import "core-js";

export function addPolyFills() {
  if (!Array.prototype.flat) {
    // eslint-disable-next-line no-extend-native
    Array.prototype.flat = function (depth: any = 1) {
      depth = isNaN(depth) ? 0 : Math.floor(depth);
      const self = this as unknown as any[];
      if (depth < 1) return self.slice();
      return [].concat(
        ...(depth < 2)
          ? self
          : self.map(v => Array.isArray(v) ? v.flat(depth - 1) : v)
      )
    };
  }

  // Get a handle on the global object
  let globalObject: any;
  if (typeof window !== 'undefined' && window.document) {
    globalObject = window;
  }

  // check if the implementation is available
  if (typeof Promise.prototype['finally'] === 'function') {
    return;
  }

  // implementation
  globalObject!.Promise.prototype['finally'] = function (callback: Function) {
    const constructor = this.constructor;

    return this.then(function (value: any) {
      return constructor.resolve(callback()).then(function () {
        return value;
      });
    }, function (reason: any) {
      return constructor.resolve(callback()).then(function () {
        throw reason;
      });
    });
  };
}
