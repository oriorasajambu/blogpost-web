import { clearAuthFlow, writeAuthFlow } from '@/lib/auth-flow';
import { invitationTokenPattern } from '@/lib/auth-flow-policy';
import { getConfig } from '@/lib/config';

export async function GET(request: Request) {
  const config = getConfig();
  const values = new URL(request.url).searchParams.getAll('token');
  if (config.loginEnabled && values.length === 1 && invitationTokenPattern.test(values[0]))
    await writeAuthFlow({ invitationToken: values[0], kind: 'invitation' });
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
