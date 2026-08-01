import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-content">
        <h1>CoLink Protocol</h1>
        <p>
          Canonical specifications for CoLink cloud, peer-to-peer, and
          business protocols.
        </p>
        <Link href="/docs/README">Read the protocol documentation</Link>
      </div>
    </main>
  );
}
