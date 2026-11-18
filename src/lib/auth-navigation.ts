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
      return 'This account does not have staff access. Use your invited account or ask an administrator for an invitation.';
    case 'ACCOUNT_PENDING':
      return 'Your account is waiting for approval. An administrator will enable access; you can sign in again afterwards.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Confirm your email address first. Open the verification link we sent, or request a new one.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'The email address or password is not correct.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a few minutes before trying again.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This link has expired or was already used. Request a new verification email.';
    case 'CAPTCHA_FAILED':
      return 'The verification challenge did not complete. Try it again.';
    case 'VALIDATION_FAILED':
      return 'Check the email address and use a password of 12 to 128 characters that has not appeared in a data breach.';
    case 'RATE_LIMITED':
      return 'Too many requests. Wait a moment before trying again.';
    case 'DEPENDENCY_UNAVAILABLE':
      return 'This is not available right now. Please try again later.';
    case 'AUTHENTICATION_TOO_OLD':
    case 'RECENT_AUTHENTICATION_REQUIRED':
    case 'auth/requires-recent-login':
      return 'Please sign in to Google again to start a fresh staff session.';
    case 'auth/network-request-failed':
      return 'Sign-in could not connect. Check your connection and try again.';
    case 'auth/unauthorized-domain':
    case 'auth/operation-not-allowed':
      return 'Sign-in is not configured for this web address. Contact the site administrator.';
    case 'CSRF_VALIDATION_FAILED':
    case 'OAUTH_STATE_INVALID':
      return 'The sign-in check expired or changed. Start sign-in again from this page.';
    default:
      return 'We couldn’t complete sign-in. Please try again. If it keeps happening, contact an administrator.';
  }
}
