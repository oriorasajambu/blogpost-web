/** Return only same-origin staff paths, including validated query strings for recovery. */
export function safeReturnTo(value: unknown, fallback = '/studio/posts'): string {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return fallback;
  try {
    const base = 'https://blogpost.invalid';
    const url = new URL(value, base);
    if (url.origin !== base || url.hash || !/^\/studio(?:\/|$)/.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export const staffRoles = ['AUTHOR', 'EDITOR', 'ADMIN'] as const;
export type StaffRole = (typeof staffRoles)[number];
export function staffNavigation(role: string) {
  if (!staffRoles.some((known) => known === role)) return [];
  return [
    { href: '/studio/posts', label: 'Your workspace' },
    { href: '/studio/trash', label: 'Trash' },
    { href: '/studio/profile', label: 'Your profile' },
    ...(role === 'EDITOR' || role === 'ADMIN'
      ? [
          { href: '/studio/review', label: 'Review' },
          { href: '/studio/taxonomy', label: 'Taxonomy' },
        ]
      : []),
    ...(role === 'ADMIN' ? [{ href: '/studio/admin', label: 'Staff access' }] : []),
  ];
}

export function identityError(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled. You can try again when you’re ready.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow popups, or use the redirect option below.';
    case 'INVITATION_ACCOUNT_MISMATCH':
      return 'This invitation belongs to a different Google account. Choose the invited account to continue; the invitation has not been used.';
    case 'INVITATION_EXPIRED':
      return 'This invitation has expired. Ask an administrator for a replacement link.';
    case 'INVITATION_REVOKED':
    case 'INVITATION_ALREADY_USED':
    case 'INVITATION_USED':
    case 'INVALID_INVITATION':
    case 'INVITATION_NOT_FOUND':
      return 'This invitation is no longer available. Ask an administrator to check your access.';
    case 'ACCESS_REVOKED':
    case 'auth/user-disabled':
      return 'Staff access for this account is unavailable. Ask an administrator to check your access.';
    case 'INSUFFICIENT_PERMISSION':
    case 'MEMBERSHIP_REQUIRED':
    case 'MEMBER_NOT_FOUND':
    case 'MEMBERSHIP_NOT_FOUND':
      return 'This Google account does not have staff access. Use your invited account or ask an administrator for an invitation.';
    case 'AUTHENTICATION_TOO_OLD':
    case 'RECENT_AUTHENTICATION_REQUIRED':
    case 'auth/requires-recent-login':
      return 'Please sign in to Google again to start a fresh staff session.';
    case 'auth/network-request-failed':
      return 'Google sign-in could not connect. Check your connection and try again.';
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not configured for this web address. Contact the site administrator.';
    case 'CSRF_VALIDATION_FAILED':
    case 'OAUTH_STATE_INVALID':
      return 'The sign-in check expired or changed. Start sign-in again from this page.';
    default:
      return 'We couldn’t complete sign-in. Please try again. If it keeps happening, contact an administrator.';
  }
}
