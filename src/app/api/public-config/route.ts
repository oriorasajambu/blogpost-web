import { getConfig } from '@/lib/config';
import { publicIdentityConfig } from '@/lib/auth-security-policy';
export function GET() {
  return Response.json(publicIdentityConfig(getConfig()), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
