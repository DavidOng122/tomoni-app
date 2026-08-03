export default function Home() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <h1>Tomoni MVP</h1>
      <p>Go to <a href="/dev/mobile-foundation" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>/dev/mobile-foundation</a> to view the UI foundation testing ground.</p>
    </div>
  );
}
