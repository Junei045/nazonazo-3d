'use client'

import { useRef, useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ExpandableSection from '@cloudscape-design/components/expandable-section'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import SpaceBetween from '@cloudscape-design/components/space-between'
import Spinner from '@cloudscape-design/components/spinner'
import Table from '@cloudscape-design/components/table'

import { extractTextFromPdf } from '@/lib/pdf-text'
import {
  clearStoredRiddles,
  loadStoredRiddles,
  parseRiddlesFromText,
  saveRiddles,
  type Riddle,
  type RiddlesMeta,
} from '@/lib/riddles'

type Status = 'idle' | 'reading' | 'error'

export function AdminRiddleLoader({
  currentMeta,
  onRiddlesLoaded,
  onRiddlesCleared,
}: {
  currentMeta: RiddlesMeta | null
  onRiddlesLoaded: (riddles: Riddle[], meta: RiddlesMeta) => void
  onRiddlesCleared: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [preview, setPreview] = useState<Riddle[] | null>(null)
  const [pendingFileName, setPendingFileName] = useState<string | null>(null)

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    setStatus('reading')
    setErrorMessage(null)
    setWarnings([])
    setPreview(null)
    setPendingFileName(file.name)

    try {
      const text = await extractTextFromPdf(file)
      const { riddles, warnings: parseWarnings } = parseRiddlesFromText(text)
      setWarnings(parseWarnings)
      setPreview(riddles)
      setStatus('idle')
    } catch (err) {
      console.error(err)
      setStatus('error')
      setErrorMessage(
        'PDFの読み込みに失敗しました。ファイルが破損していないか、パスワード保護されていないかご確認ください。',
      )
    }
  }

  const applyPreview = () => {
    if (!preview || preview.length === 0 || !pendingFileName) return
    const meta: RiddlesMeta = {
      sourceFileName: pendingFileName,
      loadedAt: new Date().toISOString(),
      count: preview.length,
    }
    saveRiddles(preview, meta)
    onRiddlesLoaded(preview, meta)
    setPreview(null)
    setPendingFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClear = () => {
    clearStoredRiddles()
    onRiddlesCleared()
    setPreview(null)
    setPendingFileName(null)
    setWarnings([])
    setErrorMessage(null)
  }

  return (
    <SpaceBetween size="l">
      <Alert type="info" header="PDFの作り方">
        <SpaceBetween size="xs">
          <Box>
            1問ごとに、以下のように「見出し：内容」の形式で書いてください（見出しの前後の空行は自由です）。
          </Box>
          <Box variant="code" fontSize="body-s">
            {`問題：パンはパンでも、食べられないパンはなーんだ？\nヒント：台所で料理に使う「パン」だよ。\nこたえ：フライパン、ふらいぱん\nかいせつ：フライパンは料理道具なので食べられません。`}
          </Box>
          <Box>
            「こたえ」は読点（、）やカンマ（,）で区切ると、複数の表記ゆれ（ひらがな・カタカナ・漢字など）を正解として受け付けられます。「かいせつ」は省略できます。
          </Box>
        </SpaceBetween>
      </Alert>

      {currentMeta && (
        <Alert type="success" header="現在読み込まれている問題">
          {`「${currentMeta.sourceFileName}」から ${currentMeta.count} 問を読み込み済みです（${new Date(
            currentMeta.loadedAt,
          ).toLocaleString('ja-JP')}）`}
        </Alert>
      )}

      <FormField label="謎解きPDFを選択" description="管理者が用意した問題・ヒント・こたえ入りのPDFを選んでください">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      </FormField>

      {status === 'reading' && (
        <Box textAlign="center" padding="m">
          <Spinner /> <Box variant="span">PDFを解析しています…</Box>
        </Box>
      )}

      {status === 'error' && errorMessage && <Alert type="error">{errorMessage}</Alert>}

      {warnings.length > 0 && (
        <Alert type="warning" header="確認事項">
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Alert>
      )}

      {preview && preview.length > 0 && (
        <SpaceBetween size="m">
          <ExpandableSection headerText={`読み込みプレビュー（${preview.length} 問）`} defaultExpanded>
            <Table
              columnDefinitions={[
                { id: 'q', header: '問題', cell: (item: Riddle) => item.question },
                { id: 'hint', header: 'ヒント', cell: (item: Riddle) => item.hint || '（なし）' },
                { id: 'a', header: 'こたえ', cell: (item: Riddle) => item.answers.join(' / ') },
              ]}
              items={preview}
              variant="embedded"
            />
          </ExpandableSection>
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" onClick={applyPreview}>
              この内容で出題を更新する
            </Button>
          </SpaceBetween>
        </SpaceBetween>
      )}

      {currentMeta && (
        <Box>
          <Button onClick={handleClear}>読み込み済みの問題を消去する</Button>
        </Box>
      )}
    </SpaceBetween>
  )
}
