import { getConfig } from '@/lib/config';
export function GET() {
  return Response.json(
    { loginEnabled: getConfig().loginEnabled },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
