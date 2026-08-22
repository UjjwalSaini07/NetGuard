export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          bg: '#f8fafc',
          DEFAULT: '#ffffff',
          raised: '#f1f5f9',
          card: '#ffffff',
          hover: '#f8fafc',
          border: '#e2e8f0',
          'border-light': '#cbd5e1'
        },
        brand: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          light: '#eef2ff',
          border: '#c7d2fe',
          text: '#3730a3'
        },
        pass: '#10b981',
        fail: '#e11d48'
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      }
    }
  },
  plugins: []
}
