// ブラウザ内で PDF から文字を抽出するユーティリティ。
// サーバーには送らず、すべてブラウザ内（クライアントサイド）で処理する。
'use client'

export async function extractTextFromPdf(file: File): Promise<string> {
  // pdfjs-dist は SSR 環境（Node）で読み込めないため、実行時に動的 import する
  const pdfjs = await import('pdfjs-dist')
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  pdfjs.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`

  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: buffer })
  const pdf = await loadingTask.promise

  const pageTexts: string[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    // 同じ y 座標（行）のアイテムをまとめて 1 行にし、行の並び順を保つ
    type Item = { str: string; x: number; y: number }
    const items: Item[] = []
    for (const it of content.items) {
      if (!('str' in it) || !('transform' in it)) continue
      const transform = (it as { transform?: unknown }).transform
      if (!Array.isArray(transform)) continue
      items.push({
        str: (it as { str: string }).str,
        x: transform[4] as number,
        y: Math.round(transform[5] as number),
      })
    }

    const lines = new Map<number, Item[]>()
    for (const item of items) {
      const bucket = lines.get(item.y) ?? []
      bucket.push(item)
      lines.set(item.y, bucket)
    }

    const sortedLineYs = Array.from(lines.keys()).sort((a, b) => b - a)
    const pageLines = sortedLineYs.map((y) =>
      (lines.get(y) ?? [])
        .sort((a, b) => a.x - b.x)
        .map((it) => it.str)
        .join(''),
    )

    pageTexts.push(pageLines.join('\n'))
  }

  return pageTexts.join('\n\n')
}
