import { authHelper } from '@/lib/auth-helper';
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  return authHelper(request, parts.length === 1 ? parts[0] : '');
}
export { handle as GET, handle as POST };
