export default function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {String(message)}
    </div>
  )
}
