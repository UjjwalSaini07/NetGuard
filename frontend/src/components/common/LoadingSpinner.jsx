export default function LoadingSpinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center gap-3 py-10 text-zinc-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
