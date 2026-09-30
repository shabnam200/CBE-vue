// Photo ke square te crop + resize kore (upload fast hoy, storage kom lage)
export function squareResize(file, size = 480, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = c.height = size
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(new File([b], 'avatar.jpg', { type: 'image/jpeg' })) : reject(new Error('resize failed'))), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')) }
    img.src = url
  })
}
export const toDataUrl = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })
