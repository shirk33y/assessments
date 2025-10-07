import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '../contexts/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/assessments', label: 'Assessments' },
]

export function AppLayout() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()

  const userEmail = session?.user?.email ?? ''
  const userMetadata = (session?.user?.user_metadata ?? undefined) as { avatar_url?: string } | undefined
  const avatarUrl = typeof userMetadata?.avatar_url === 'string' ? userMetadata.avatar_url : undefined

  const initials = userEmail
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase())
    .join('') || 'ME'

  const handleSignOut = async () => {
    try {
      await signOut()
      void navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out failed', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white p-6 lg:block">
        <div className="mb-8">
          <p className="text-lg font-semibold">Assessments</p>
          <p className="text-xs text-slate-500">Performance review workspace</p>
        </div>
        <nav className="flex flex-col gap-2">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex w-full items-center justify-between px-6 py-4">
            <div className="lg:hidden">
              <span className="text-lg font-semibold">Assessments</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto flex items-center gap-2 rounded-full border border-transparent px-3 py-2 text-slate-600 hover:border-slate-200 hover:bg-slate-100"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl} alt={userEmail || 'User avatar'} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-xs font-medium text-slate-600 sm:inline">
                    {userEmail || 'Account'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="w-56">
                  <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
                  <div>{userEmail || 'Account'}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void handleSignOut()
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
