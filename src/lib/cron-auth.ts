export function isAuthorizedCronRequest(header: string | null, secret: string | undefined): boolean {
  return typeof secret === 'string' && secret.trim().length > 0 && header === `Bearer ${secret}`;
}
