import 'server-only';
import { getConfig } from './config';
import { publicationMetadata } from './metadata-policy';
export function publicMetadata(details: { title: string; description: string; path: string }) {
  return publicationMetadata({ ...details, origin: getConfig().webOrigin });
}
