// components/BuyMeCoffeeWidget.tsx
'use client'
import { useEffect } from 'react'

export default function BuyMeCoffeeWidget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.setAttribute('data-name', 'BMC-Widget')
    script.setAttribute('data-cfasync', 'false')
    script.setAttribute('src', 'https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js')
    script.setAttribute('data-id', 'bebedi')
    script.setAttribute('data-description', 'Support me on Buy me a coffee!')
    script.setAttribute('data-message', '')
    script.setAttribute('data-color', '#FF813F')
    script.setAttribute('data-position', 'Right')
    script.setAttribute('data-x_margin', '18')
    script.setAttribute('data-y_margin', '18')
    
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return null
}
