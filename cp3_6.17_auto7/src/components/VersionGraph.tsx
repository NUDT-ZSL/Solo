import type { Version } from '@/types';

interface VersionGraphProps {
  versions: Version[];
}

export default function VersionGraph({ versions }: VersionGraphProps) {
  if (versions.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          borderLeft: '1px solid #eee',
          color: '#999',
          fontSize: 14,
        }}
      >
        暂无版本记录
      </div>
    );
  }

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getBranchColor = (branch: string, isMain: boolean, isMerge: boolean) => {
    if (isMerge) return 'var(--merge-node)';
    if (isMain) return 'var(--main-branch)';
    return 'var(--feature-branch)';
  };

  return (
    <div
      style={{
        height: '100%',
        backgroundColor: 'white',
        borderLeft: '1px solid #eee',
        overflowY: 'auto',
        padding: 16,
      }}
    >
      <h3
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--secondary)',
          marginBottom: 16,
          marginTop: 0,
        }}
      >
        版本历史
      </h3>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div
          style={{
            position: 'absolute',
            left: 7,
            top: 8,
            bottom: 8,
            width: 2,
            backgroundColor: '#ddd',
          }}
        />
        {sortedVersions.map((version, index) => {
          const isMain = version.branch === 'main';
          const color = getBranchColor(version.branch, isMain, version.isMerge);
          return (
            <div
              key={version.id}
              style={{
                position: 'relative',
                paddingBottom: index === sortedVersions.length - 1 ? 0 : 20,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '3px solid white',
                  boxShadow: '0 0 0 2px ' + color,
                }}
              />
              <div
                style={{
                  backgroundColor: 'var(--card-bg)',
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: '#333',
                    }}
                  >
                    v{version.versionNumber}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: '2px 8px',
                      borderRadius: 10,
                      backgroundColor: color,
                      color: 'white',
                    }}
                  >
                    {version.branch}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>
                  {version.commitMessage}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {version.authorName} ·{' '}
                  {new Date(version.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
