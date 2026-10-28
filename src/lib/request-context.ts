import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { diagnosticHeaders, uuidPattern } from './request-policy';
import packageInfo from '../../package.json';
export const getRequestContext = cache(async () => {
  const incoming = await headers();
  const id = incoming.get('x-blogpost-installation');
  return diagnosticHeaders(
    incoming,
    id && uuidPattern.test(id) ? id : crypto.randomUUID(),
    packageInfo.version,
  );
});
