import type { Member } from '../types';

interface MemberPanelProps {
  members: Member[];
  currentMemberId: string | null;
}

function MemberPanel({ members, currentMemberId }: MemberPanelProps) {
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
        成员 ({members.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.map((member, index) => (
          <div
            key={member.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              borderRadius: '8px',
              background: member.id === currentMemberId ? 'rgba(46, 134, 193, 0.08)' : 'transparent',
              animation: `fadeIn 0.3s ease ${index * 0.05}s both`,
              transition: 'background 0.2s ease'
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: member.avatar_color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              {getInitials(member.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '14px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {member.name}
                {member.id === currentMemberId && (
                  <span style={{
                    fontSize: '11px',
                    color: 'var(--primary)',
                    marginLeft: '6px',
                    fontWeight: 400
                  }}>
                    (我)
                  </span>
                )}
              </p>
            </div>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: member.is_online ? 'var(--success)' : 'var(--text-light)',
              boxShadow: member.is_online ? '0 0 8px rgba(39, 174, 96, 0.4)' : 'none'
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default MemberPanel;
