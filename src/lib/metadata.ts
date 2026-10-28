import 'server-only';
import type { Metadata } from 'next';
import { getConfig } from './config';
export function canonicalMetadata(path: string): Pick<Metadata, 'alternates'> {
  const origin = getConfig().webOrigin;
  return origin ? { alternates: { canonical: `${origin}${path}` } } : {};
}
