import { clearAuthFlow, writeAuthFlow } from '@/lib/auth-flow';
import { invitationTokenPattern } from '@/lib/auth-flow-policy';
import { getConfig } from '@/lib/config';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const config = getConfig();
  const token = (await params).token;
  if (config.loginEnabled && invitationTokenPattern.test(token))
    await writeAuthFlow({ invitationToken: token, kind: 'invitation' });
  else await clearAuthFlow();
  return new Response(null, {
    status: 303,
    headers: {
      Location: '/invite',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
