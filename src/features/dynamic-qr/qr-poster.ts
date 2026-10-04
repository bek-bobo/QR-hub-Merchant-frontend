// Composition from admin-qrhub-uz-react/src/shared/ui/qrPoster.ts.
export const QR_POSTER = {
  width: 620,
  height: 877,
  scale: 2,
  background: '#FA0A4B',
  topLines: ['BU YERDA QR - KOD YORDAMIDA', "TO'LASHINGIZ MUMKIN"],
  bottomLines: ['ЗДЕСЬ МОЖНО ОПЛАТИТЬ', 'С ПОМОЩЬЮ QR - КОДА'],
  frame: { x: 130, y: 196, size: 360, radius: 34, padding: 30 },
  logo: { width: 264, y: 738 },
} as const

export const QR_POSTER_LOGO_URL = `${import.meta.env.BASE_URL}qrhub-brand-logo.png`
let whiteLogoPromise: Promise<HTMLCanvasElement> | undefined

function loadWhiteLogo(): Promise<HTMLCanvasElement> {
  if (whiteLogoPromise) return whiteLogoPromise
  whiteLogoPromise = new Promise<HTMLCanvasElement>((resolve, reject) => {
    const image = new Image()
    const timeout = window.setTimeout(() => reject(new Error('QRHub logo unavailable')), 5000)
    image.onload = () => {
      window.clearTimeout(timeout)
      try {
        const logo = document.createElement('canvas')
        logo.width = image.naturalWidth
        logo.height = image.naturalHeight
        const context = logo.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        context.drawImage(image, 0, 0)
        context.globalCompositeOperation = 'source-in'
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, logo.width, logo.height)
        resolve(logo)
      } catch (error) { reject(error) }
    }
    image.onerror = () => {
      window.clearTimeout(timeout)
      reject(new Error('QRHub logo unavailable'))
    }
    image.src = QR_POSTER_LOGO_URL
  }).catch((error: unknown) => {
    whiteLogoPromise = undefined
    throw error
  })
  return whiteLogoPromise
}

// The preview and both downloads use this same native-resolution canvas.
export async function renderQrPoster(qr: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const logo = await loadWhiteLogo()
  const poster = document.createElement('canvas')
  poster.width = QR_POSTER.width * QR_POSTER.scale
  poster.height = QR_POSTER.height * QR_POSTER.scale
  const context = poster.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.scale(QR_POSTER.scale, QR_POSTER.scale)
  context.fillStyle = QR_POSTER.background
  context.fillRect(0, 0, QR_POSTER.width, QR_POSTER.height)
  // Low-contrast curves sit behind the content; the QR frame stays opaque white.
  context.fillStyle = 'rgba(255,255,255,0.06)'
  for (const [x, y, radius] of [[720, 280, 270], [-80, 880, 360], [640, 880, 210]] as const) {
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }
  context.fillStyle = '#ffffff'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 33px Arial, "Segoe UI", sans-serif'
  QR_POSTER.topLines.forEach((line, index) => context.fillText(line, 310, 96 + index * 44))

  const frame = QR_POSTER.frame
  context.beginPath()
  context.roundRect(frame.x, frame.y, frame.size, frame.size, frame.radius)
  context.fill()
  const qrSize = frame.size - frame.padding * 2
  context.imageSmoothingEnabled = false
  context.drawImage(qr, frame.x + frame.padding, frame.y + frame.padding, qrSize, qrSize)
  context.imageSmoothingEnabled = true

  context.font = '700 31px Arial, "Segoe UI", sans-serif'
  QR_POSTER.bottomLines.forEach((line, index) => context.fillText(line, 310, 632 + index * 42))
  const logoWidth = QR_POSTER.logo.width
  context.drawImage(logo, (QR_POSTER.width - logoWidth) / 2, QR_POSTER.logo.y,
    logoWidth, logo.height / logo.width * logoWidth)
  return poster
}
