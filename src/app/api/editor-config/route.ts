import { getStaffMember } from '@/lib/session';
import { backendRequest } from '@/lib/api-server';
import { getPublicTaxonomy } from '@/lib/reading';
import { bffErrorResponse, BffError, requireLoginConfig } from '@/lib/bff';
import { validateEditorConfiguration } from '@/features/editor/editor-contract';

export async function GET() {
  try {
    requireLoginConfig();
    const member = await getStaffMember();
    if (!member) throw new BffError(401, 'UNAUTHENTICATED', 'Sign in again to sync your work.');
    const [envelope, categories, tags] = await Promise.all([
      backendRequest<{ data: unknown }>('/v1/meta'),
      getPublicTaxonomy('categories'),
      getPublicTaxonomy('tags'),
    ]);
    let configuration;
    try {
      configuration = validateEditorConfiguration({
        member,
        meta: envelope.data,
        categories,
        tags,
      });
    } catch {
      throw new BffError(
        502,
        'INVALID_API_RESPONSE',
        'Editor configuration is unavailable. Your local work is kept.',
      );
    }
    return Response.json(configuration, {
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (error) {
    return bffErrorResponse(error);
  }
}
