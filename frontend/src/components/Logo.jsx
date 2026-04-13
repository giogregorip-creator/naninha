export default function Logo({ size = 40, withText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Moon shape */}
        <circle cx="20" cy="20" r="18" fill="#4A7C6F" />
        <circle cx="26" cy="14" r="11" fill="#EEF5F3" />
        {/* Stars */}
        <circle cx="10" cy="12" r="1.5" fill="#F5EFE6" opacity="0.9" />
        <circle cx="14" cy="8" r="1" fill="#F5EFE6" opacity="0.7" />
        <circle cx="8" cy="18" r="1" fill="#F5EFE6" opacity="0.6" />
        {/* Baby face */}
        <circle cx="19" cy="23" r="7" fill="#F5EFE6" />
        <circle cx="17" cy="22" r="1" fill="#4A7C6F" />
        <circle cx="21" cy="22" r="1" fill="#4A7C6F" />
        <path d="M17 25.5 Q19 27 21 25.5" stroke="#4A7C6F" strokeWidth="1" strokeLinecap="round" fill="none" />
      </svg>
      {withText && (
        <span style={{
          fontFamily: "'Nunito', sans-serif",
          fontWeight: 700,
          fontSize: size * 0.6,
          color: '#4A7C6F',
          letterSpacing: '-0.02em'
        }}>
          naninha
        </span>
      )}
    </div>
  )
}
