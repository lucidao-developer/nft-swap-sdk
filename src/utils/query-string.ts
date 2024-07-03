const stringify = (
  obj: Record<string, any>,
  encode: typeof encodeURIComponent = encodeURIComponent
) => {
  return Object.keys(obj || {})
    .reduce(function (arr: any[], key) {
      [].concat(obj[key]).forEach(function (v) {
        arr.push(encode(key) + '=' + encode(v));
      });
      return arr;
    }, [])
    .join('&')
    .replace(/\s/g, '+');
};

export { stringify };
