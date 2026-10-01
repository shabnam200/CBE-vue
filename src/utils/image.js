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

/**
 * Boi er photo ke WebP te compress kore (max `maxSide` px, quality 0.8).
 * - EXIF rotation thik rakhe (phone photo ulta hoy na)
 * - WebP support na korle JPEG e fallback
 * - compress korar por boro hoye gele (ba GIF hole) original ei rakhe
 */
export async function toWebp(file, maxSide = 1200, quality = 0.8) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff' // transparent PNG e black background na ashar jonno
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(bmp, 0, 0, w, h)
    bmp.close?.()
    let blob = await new Promise((r) => c.toBlob(r, 'image/webp', quality))
    let ext = 'webp'
    if (!blob || blob.type !== 'image/webp') { // purono browser: webp nai
      blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality))
      ext = 'jpg'
    }
    if (!blob || blob.size >= file.size) return file
    const base = file.name.replace(/\.[^.]+$/, '') || 'book'
    return new File([blob], `${base}.${ext}`, { type: blob.type })
  } catch {
    return file // kono karone fail hole original upload hobe
  }
}
