export type Riddle = {
  id: number
  question: string
  answers: string[] // 正解として受け付ける表記ゆれ（ひらがな推奨）
  hint: string
  explanation: string
}

// ブラウザの localStorage に保存するときのキー
export const RIDDLES_STORAGE_KEY = 'nazonazo-3d:riddles:v1'
export const RIDDLES_META_STORAGE_KEY = 'nazonazo-3d:riddles-meta:v1'

export type RiddlesMeta = {
  sourceFileName: string
  loadedAt: string // ISO 文字列
  count: number
}

// PDF から抽出したテキストの中で、各項目の見出しとして認識する表記ゆれ
const QUESTION_LABELS = ['問題文', '問題', 'もんだい', '問', 'Q']
const HINT_LABELS = ['ヒント文', 'ヒント', 'Hint', 'H']
const ANSWER_LABELS = ['こたえ', '答え', '解答', '正解', 'Answer', 'A']
const EXPLANATION_LABELS = ['かいせつ', '解説', '説明', 'Explanation', 'E']

const ALL_LABELS = [
  ...QUESTION_LABELS,
  ...HINT_LABELS,
  ...ANSWER_LABELS,
  ...EXPLANATION_LABELS,
]

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function labelAlternation(labels: string[]): string {
  return labels.map(escapeRegExp).join('|')
}

const ALL_LABEL_PATTERN = labelAlternation(ALL_LABELS)

// 指定したラベル群のうち最初に見つかったものの値を、次のラベルが現れる直前まで抜き出す。
// PDFからのテキスト抽出では、元の改行位置が保たれず1つの折り返し段落になることがあるため、
// 改行の有無に依存せず「ラベルの直前」を区切りとして扱う。
function extractField(block: string, labels: string[]): string | null {
  const pattern = new RegExp(
    `(?:^|\\s)(?:${labelAlternation(labels)})\\s*[:：]\\s*([\\s\\S]*?)(?=\\s(?:${ALL_LABEL_PATTERN})\\s*[:：]|$)`,
    'i',
  )
  const match = block.match(pattern)
  if (!match) return null
  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

// 「フライパン、ふらいぱん」「フライパン/ふらいぱん」などをすべて正解として受け付けられるように分割する
function splitAnswers(raw: string): string[] {
  return raw
    .split(/[、,，\/／・]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export type ParseResult = {
  riddles: Riddle[]
  warnings: string[]
}

// 管理者が PDF に用意した「問題：」「ヒント：」「こたえ：」「かいせつ：」形式のテキストを
// パースして Riddle[] に変換する。「問題：」（またはその表記ゆれ）が新しい設問の区切りになる。
export function parseRiddlesFromText(rawText: string): ParseResult {
  const warnings: string[] = []

  // PDF 抽出特有の全角/半角ゆれをある程度吸収する
  const text = rawText.replace(/\r\n/g, '\n').replace(/\u3000/g, ' ')

  const questionAnchor = new RegExp(
    `(?=(?:^|\\s)(?:${labelAlternation(QUESTION_LABELS)})\\s*[:：])`,
  )
  const blocks = text
    .split(questionAnchor)
    .map((b) => b.trim())
    .filter(Boolean)

  const riddles: Riddle[] = []

  blocks.forEach((block, i) => {
    const question = extractField(block, QUESTION_LABELS)
    if (!question) {
      // 「問題：」を含まない前置きの断片などはスキップ
      return
    }

    const hint = extractField(block, HINT_LABELS) ?? ''
    const answerRaw = extractField(block, ANSWER_LABELS)
    const explanation = extractField(block, EXPLANATION_LABELS) ?? ''

    if (!answerRaw) {
      warnings.push(`${i + 1} 番目の問題（「${question.slice(0, 20)}…」）に「こたえ：」が見つからなかったため、この問題はスキップしました。`)
      return
    }

    const answers = splitAnswers(answerRaw)
    if (answers.length === 0) {
      warnings.push(`${i + 1} 番目の問題の「こたえ」が空だったため、この問題はスキップしました。`)
      return
    }

    if (!hint) {
      warnings.push(`「${question.slice(0, 20)}…」に「ヒント：」が見つかりませんでした（ヒントなしで登録します）。`)
    }

    riddles.push({
      id: riddles.length + 1,
      question,
      answers,
      hint,
      explanation: explanation || `こたえは「${answers[0]}」です。`,
    })
  })

  if (riddles.length === 0) {
    warnings.push(
      'PDF から問題を読み取れませんでした。「問題：」「こたえ：」などの見出しが正しく含まれているかご確認ください。',
    )
  }

  return { riddles, warnings }
}

export function saveRiddles(riddles: Riddle[], meta: RiddlesMeta) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RIDDLES_STORAGE_KEY, JSON.stringify(riddles))
  window.localStorage.setItem(RIDDLES_META_STORAGE_KEY, JSON.stringify(meta))
}

export function loadStoredRiddles(): { riddles: Riddle[]; meta: RiddlesMeta | null } {
  if (typeof window === 'undefined') return { riddles: [], meta: null }
  try {
    const raw = window.localStorage.getItem(RIDDLES_STORAGE_KEY)
    const metaRaw = window.localStorage.getItem(RIDDLES_META_STORAGE_KEY)
    const riddles = raw ? (JSON.parse(raw) as Riddle[]) : []
    const meta = metaRaw ? (JSON.parse(metaRaw) as RiddlesMeta) : null
    return { riddles, meta }
  } catch {
    return { riddles: [], meta: null }
  }
}

export function clearStoredRiddles() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(RIDDLES_STORAGE_KEY)
  window.localStorage.removeItem(RIDDLES_META_STORAGE_KEY)
}
