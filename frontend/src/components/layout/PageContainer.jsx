export default function PageContainer({ title, subtitle, action, children }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      {(title || subtitle || action) && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>}
            {subtitle && <p className="text-xs text-slate-500 sm:text-sm mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2 mt-2 sm:mt-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}


