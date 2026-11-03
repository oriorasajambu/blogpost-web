import { authHelper } from '@/lib/auth-helper';
export function GET(request: Request) {
  return authHelper(request, 'init.json', true);
}
