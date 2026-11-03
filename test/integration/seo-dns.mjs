// Test process only. The real HTTPS client still validates our locally generated CA/certificate.
import dns from 'node:dns';
const lookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  return lookup.call(
    this,
    hostname === 'public-api.blogpost.test' ? '127.0.0.1' : hostname,
    options,
    callback,
  );
};
