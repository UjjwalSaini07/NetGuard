export default function PageContainer({ title, children }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {title && <h2 className="mb-6 text-xl font-semibold text-zinc-100">{title}</h2>}
      {children}
    </div>
  )
}
