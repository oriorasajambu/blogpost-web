const options = process.argv.slice(2);
for (let index = 0; index < options.length; index += 2) {
  const key = options[index],
    value = options[index + 1];
  if (
    key === '--port' &&
    value &&
    /^\d+$/.test(value) &&
    Number(value) >= 1 &&
    Number(value) <= 65535
  )
    process.env.PORT = value;
  else if (key === '--hostname' && value && /^[a-zA-Z0-9.:-]+$/.test(value))
    process.env.HOSTNAME = value;
  else throw new Error('Supported arguments: --port 8080 --hostname 0.0.0.0');
}
process.env.PORT ??= '8080';
process.env.HOSTNAME ??= '0.0.0.0';
process.env.NEXT_TELEMETRY_DISABLED = '1';
await import('../.next/standalone/server.js');
