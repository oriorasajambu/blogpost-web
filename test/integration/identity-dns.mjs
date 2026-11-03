// Test-only mapping; HTTPS still validates the generated local certificate in the BFF.
import dns from 'node:dns';
const original = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  return original.call(
    this,
    hostname === 'identity-api.blogpost.test' ? '127.0.0.1' : hostname,
    options,
    callback,
  );
};
