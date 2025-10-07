export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-16 text-center">
      <div className="space-y-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mx-auto" />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
