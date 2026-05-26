'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="main-nav">
      <span className="nav-brand">Riyal Capital</span>
      <div className="nav-tabs">
        <Link href="/" className={`nav-tab ${pathname === '/' ? 'active' : ''}`}>Search</Link>
        <Link href="/database" className={`nav-tab ${pathname === '/database' ? 'active' : ''}`}>Database</Link>
      </div>
    </nav>
  );
}