import "core-js";

export function addPolyFills() {
  if (!Array.prototype.flat) {
      Array.prototype.flat = function() {
          var depth = arguments[0];
          depth = depth === undefined ? 1 : Math.floor(depth);
          if (depth < 1) return Array.prototype.slice.call(this);
          return (function flat(arr, depth) {
              var len = arr.length >>> 0;
              var flattened: any[] = [];
              var i = 0;
              while (i < len) {
                  if (i in arr) {
                      var el = arr[i];
                      if (Array.isArray(el) && depth > 0)
                          flattened = flattened.concat(flat(el, depth - 1));
                      else flattened.push(el);
                  }
                  i++;
              }
              return flattened;
          })(this, depth);
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
