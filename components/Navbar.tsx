// components/Navbar.tsx
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/router';

const Navbar: React.FC = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  const router = useRouter();

  const isActive = (pathname: string) => router.pathname === pathname;

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md fixed w-full top-0 z-50">
      <div className="container mx-auto flex items-center"> {/* Removed justify-between for now */}
        
        {/* Left side: Logo/Brand */}
        <div className="flex-shrink-0"> {/* Prevents this from shrinking */}
          <Link href="/" className="text-xl font-bold hover:text-blue-200">
            Analyzer Tools 
          </Link>
        </div>

        {/* Center: Navigation Links - This div will grow and center its content */}
        <div className="flex-grow flex justify-center space-x-4 sm:space-x-6">
          <Link 
            href="/" 
            className={`text-sm font-medium px-3 py-2 rounded-md transition-colors 
                        ${isActive('/') ? 'bg-blue-700' : 'hover:bg-blue-700 hover:text-blue-100'}`}
          >
            PageSpeed
          </Link>
          <Link 
            href="/security-checker" 
            className={`text-sm font-medium px-3 py-2 rounded-md transition-colors 
                        ${isActive('/security-checker') ? 'bg-blue-700' : 'hover:bg-blue-700 hover:text-blue-100'}`}
          >
            Security Checker
          </Link>
          {/* Add more centered links here if needed */}
        </div>

        {/* Right side: Auth status and buttons */}
        <div className="flex-shrink-0 flex items-center space-x-4"> {/* Prevents shrinking, ensures items stay together */}
          {loading && <p className="text-sm">Loading...</p>}
          {!loading && session?.user ? (
            <>
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User avatar'}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-blue-400"
                />
              )}
              <span className="hidden sm:inline text-sm">{session.user.name || session.user.email}</span>
              <button
                onClick={() => signOut()}
                className="bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-md shadow hover:shadow-md transition-all"
              >
                Sign Out
              </button>
            </>
          ) : (
            !loading && (
              <button
                onClick={() => signIn('github')}
                className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2 px-4 rounded-md shadow hover:shadow-md transition-all"
              >
                Sign In with GitHub
              </button>
            )
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;