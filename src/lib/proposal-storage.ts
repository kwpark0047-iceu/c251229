// 이 앱에서 해당 제안서 전용 폴더에 올린 파일만 정리한다.
export function getOwnedProposalFile(url: string | null, projectUrl: string, orgId: string | null, id: string): string | null {
  if (!url || !orgId) return null;
  try {
    const file = new URL(url), project = new URL(projectUrl);
    const prefix = '/storage/v1/object/public/proposals/';
    if (file.origin !== project.origin || !file.pathname.startsWith(prefix)) return null;
    const key = decodeURIComponent(file.pathname.slice(prefix.length));
    const folder = `${orgId}/${id}/`;
    if (!key.startsWith(folder) || !/^proposal\.[a-z0-9]+$/i.test(key.slice(folder.length))) return null;
    return key;
  } catch { return null; }
}
