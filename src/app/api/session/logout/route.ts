import { cookies } from 'next/headers';
import { bffErrorResponse, readJsonBody, validateMutation } from '@/lib/bff';
import { clearAuthFlow } from '@/lib/auth-flow';
export async function POST(request: Request) {
  try {
    const config = await validateMutation(request);
    await readJsonBody(request, 1024);
    const store = await cookies();
    for (const name of [config.sessionCookie, config.csrfCookie])
      store.set(name, '', {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });
    await clearAuthFlow();
    return Response.json({ signedOut: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
