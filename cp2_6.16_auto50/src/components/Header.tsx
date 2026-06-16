import UserInfo from '@/components/UserInfo'

export default function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        height: 60,
        background: '#0d2137',
        boxShadow: '0 2px 4px #00000040',
        padding: '0 24px',
      }}
    >
      <span style={{ color: '#64ffda', fontSize: 24, fontWeight: 'bold' }}>
        益公里
      </span>
      <UserInfo />
    </header>
  )
}
