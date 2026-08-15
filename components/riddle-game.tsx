'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Alert from '@cloudscape-design/components/alert'
import Badge from '@cloudscape-design/components/badge'
import Box from '@cloudscape-design/components/box'
import Button from '@cloudscape-design/components/button'
import ColumnLayout from '@cloudscape-design/components/column-layout'
import Container from '@cloudscape-design/components/container'
import FormField from '@cloudscape-design/components/form-field'
import Header from '@cloudscape-design/components/header'
import Input from '@cloudscape-design/components/input'
import ProgressBar from '@cloudscape-design/components/progress-bar'
import SpaceBetween from '@cloudscape-design/components/space-between'
import StatusIndicator from '@cloudscape-design/components/status-indicator'

import dynamic from 'next/dynamic'

import type { Riddle } from '@/lib/riddles'
import type { CharacterMood } from '@/components/riddle-character'

// r3f の Canvas はブラウザ専用のため SSR を無効化して読み込む
const RiddleCharacter = dynamic(
  () => import('@/components/riddle-character').then((m) => m.RiddleCharacter),
  {
    ssr: false,
    loading: () => (
      <Box padding="xxl" textAlign="center" color="text-status-inactive">
        3D キャラクターを読み込み中…
      </Box>
    ),
  },
)

// カタカナ→ひらがな・空白除去などで表記ゆれを吸収する
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000ー・、。！？!?]/g, '')
}

type Phase = 'asking' | 'correct' | 'wrong' | 'revealed'

// この回数まちがえると自動的に答えを表示して次へ進めるようにする
const MAX_WRONG = 5

export function RiddleGame({ riddles: RIDDLES }: { riddles: Riddle[] }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('asking')
  const [mood, setMood] = useState<CharacterMood>('idle')
  const [showHint, setShowHint] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)
  const [score, setScore] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [solvedIds, setSolvedIds] = useState<number[]>([])
  const [voiceReady, setVoiceReady] = useState(false)

  const riddle = RIDDLES[index]
  const isLast = index === RIDDLES.length - 1
  const finished = solvedIds.length === RIDDLES.length

  const speakTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 音声合成（Web Speech API）で問題文を読み上げる
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ja-JP'
    utter.rate = 1
    utter.pitch = 1.15
    const voices = window.speechSynthesis.getVoices()
    const jaVoice = voices.find((v) => v.lang.startsWith('ja'))
    if (jaVoice) utter.voice = jaVoice
    utter.onstart = () => setMood('speaking')
    utter.onend = () => setMood((m) => (m === 'speaking' ? 'idle' : m))
    window.speechSynthesis.speak(utter)
  }, [])

  // 音声リストの読み込み完了を検知
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const check = () => setVoiceReady(window.speechSynthesis.getVoices().length > 0)
    check()
    window.speechSynthesis.onvoiceschanged = check
    return () => {
      window.speechSynthesis.onvoiceschanged = null
      window.speechSynthesis.cancel()
    }
  }, [])

  const askCurrent = useCallback(() => {
    if (!riddle) return
    speak(riddle.question)
  }, [speak, riddle])

  // 答えを表示して次へ進めるようにする（「わからない」や5回不正解のとき）
  const reveal = useCallback(() => {
    setPhase('revealed')
    setMood('idle')
    if (!solvedIds.includes(riddle.id)) {
      setSolvedIds((ids) => [...ids, riddle.id])
    }
    speak(`こたえは ${riddle.answers[0]} でした。`)
    if (speakTimer.current) clearTimeout(speakTimer.current)
    speakTimer.current = setTimeout(() => setMood('idle'), 2600)
  }, [riddle, solvedIds, speak])

  const handleSubmit = useCallback(() => {
    if ((phase !== 'asking' && phase !== 'wrong') || answer.trim() === '') return
    const normalized = normalize(answer)
    const correct = riddle.answers.some((a) => normalize(a) === normalized)
    setAttempts((n) => n + 1)

    if (correct) {
      setPhase('correct')
      setMood('correct')
      if (!solvedIds.includes(riddle.id)) {
        setScore((s) => s + 1)
        setSolvedIds((ids) => [...ids, riddle.id])
      }
      speak(`せいかい！ こたえは ${riddle.answers[0]} でした。`)
      if (speakTimer.current) clearTimeout(speakTimer.current)
      speakTimer.current = setTimeout(() => setMood('idle'), 2600)
      return
    }

    // 不正解: 回数をカウントし、上限に達したら自動で答えを表示
    const nextWrong = wrongCount + 1
    setWrongCount(nextWrong)
    if (nextWrong >= MAX_WRONG) {
      setMood('wrong')
      speak(`ざんねん、${MAX_WRONG}回まちがえました。こたえは ${riddle.answers[0]} です。`)
      if (speakTimer.current) clearTimeout(speakTimer.current)
      speakTimer.current = setTimeout(() => reveal(), 1800)
    } else {
      setPhase('wrong')
      setMood('wrong')
      speak('ざんねん、はずれです。もう一度かんがえてみよう。')
      if (speakTimer.current) clearTimeout(speakTimer.current)
      speakTimer.current = setTimeout(() => setMood('idle'), 2200)
    }
  }, [phase, answer, riddle, solvedIds, wrongCount, speak, reveal])

  const goNext = useCallback(() => {
    if (isLast) return
    const next = index + 1
    setIndex(next)
    setAnswer('')
    setPhase('asking')
    setShowHint(false)
    setWrongCount(0)
    setMood('idle')
    speak(RIDDLES[next].question)
  }, [index, isLast, speak])

  const retry = useCallback(() => {
    setPhase('asking')
    setAnswer('')
    setMood('idle')
  }, [])

  const restart = useCallback(() => {
    setIndex(0)
    setAnswer('')
    setPhase('asking')
    setShowHint(false)
    setWrongCount(0)
    setMood('idle')
    setScore(0)
    setAttempts(0)
    setSolvedIds([])
  }, [])

  const progressValue = useMemo(
    () => (RIDDLES.length === 0 ? 0 : Math.round((solvedIds.length / RIDDLES.length) * 100)),
    [solvedIds.length, RIDDLES.length],
  )

  if (RIDDLES.length === 0) {
    return (
      <Container
        header={
          <Header variant="h2" description="出題する問題がまだ読み込まれていません">
            なぞなぞチャレンジ
          </Header>
        }
      >
        <Alert type="warning" header="問題が読み込まれていません">
          管理者が「管理者ツール」からなぞなぞPDFを読み込むと、ここに問題が表示されます。
        </Alert>
      </Container>
    )
  }

  return (
    <ColumnLayout columns={2} variant="text-grid">
      {/* 3Dキャラクター */}
      <Container
        fitHeight
        header={
          <Header variant="h2" description="なぞなぞ博士があなたに問題を出します">
            出題キャラクター
          </Header>
        }
      >
        <div
          style={{
            height: 420,
            borderRadius: 12,
            overflow: 'hidden',
            background: '#0b1020',
          }}
        >
          <RiddleCharacter mood={mood} />
        </div>
        <Box padding={{ top: 's' }} textAlign="center">
          <StatusIndicator type={mood === 'speaking' ? 'in-progress' : 'success'}>
            {mood === 'speaking'
              ? '博士がお話し中…'
              : mood === 'correct'
                ? '正解！やったね！'
                : mood === 'wrong'
                  ? 'うーん、ちがうみたい'
                  : '待機中'}
          </StatusIndicator>
        </Box>
      </Container>

      {/* 問題・回答エリア */}
      <Container
        fitHeight
        header={
          <Header
            variant="h2"
            description="音声と文字で出される問題に、文字で答えよう"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Badge color="green">スコア {score}</Badge>
                <Badge color="blue">
                  {index + 1} / {RIDDLES.length} 問目
                </Badge>
              </SpaceBetween>
            }
          >
            なぞなぞチャレンジ
          </Header>
        }
      >
        <SpaceBetween size="l">
          <ProgressBar
            value={progressValue}
            label="クリア状況"
            description={`${solvedIds.length} / ${RIDDLES.length} 問クリア`}
            additionalInfo={`挑戦回数 ${attempts} 回`}
          />

          {/* 問題文 */}
          <Container
            variant="stacked"
            header={
              <Header
                variant="h3"
                actions={
                  <Button
                    iconName="microphone"
                    onClick={askCurrent}
                    disabled={mood === 'speaking'}
                  >
                    もう一度きく
                  </Button>
                }
              >
                第 {index + 1} 問
              </Header>
            }
          >
            <Box variant="p" fontSize="heading-m" padding={{ vertical: 's' }}>
              {riddle.question}
            </Box>
            {showHint && (
              <Alert type="info" header="ヒント">
                {riddle.hint}
              </Alert>
            )}
          </Container>

          {/* 回答入力 */}
          <FormField
            label="あなたの答え"
            description="ひらがな・カタカナ・漢字どれでもOKです"
            constraintText="Enter キーでも回答できます"
          >
            <Input
              value={answer}
              type="text"
              placeholder="ここに答えを入力…"
              disabled={phase === 'correct' || phase === 'revealed'}
              onChange={({ detail }) => setAnswer(detail.value)}
              onKeyDown={({ detail }) => {
                if (detail.key === 'Enter') handleSubmit()
              }}
            />
          </FormField>

          {/* 判定結果 */}
          {phase === 'correct' && (
            <Alert type="success" header="正解！">
              {riddle.explanation}
            </Alert>
          )}
          {phase === 'wrong' && (
            <Alert type="error" header="残念、はずれ">
              もう一度チャレンジしてみよう。ヒントも使えるよ。あと{' '}
              {MAX_WRONG - wrongCount} 回まちがえると答えが表示されます。
            </Alert>
          )}
          {phase === 'revealed' && (
            <Alert type="warning" header={`答えは「${riddle.answers[0]}」でした`}>
              {riddle.explanation}
            </Alert>
          )}

          {/* 操作ボタン */}
          <SpaceBetween direction="horizontal" size="xs">
            {(phase === 'asking' || phase === 'wrong') && (
              <Button variant="primary" onClick={handleSubmit} disabled={answer.trim() === ''}>
                回答する
              </Button>
            )}
            {phase === 'wrong' && <Button onClick={retry}>もう一度</Button>}
            {(phase === 'asking' || phase === 'wrong') && (
              <Button
                iconName="status-info"
                onClick={() => setShowHint(true)}
                disabled={showHint}
              >
                ヒントを見る
              </Button>
            )}
            {(phase === 'asking' || phase === 'wrong') && (
              <Button iconName="undo" onClick={reveal}>
                わからない（答えを見る）
              </Button>
            )}
            {(phase === 'correct' || phase === 'revealed') && !isLast && (
              <Button variant="primary" iconName="angle-right" iconAlign="right" onClick={goNext}>
                次の問題へ
              </Button>
            )}
            {(phase === 'correct' || phase === 'revealed') && isLast && (
              <Button variant="primary" iconName="refresh" onClick={restart}>
                最初から遊ぶ
              </Button>
            )}
          </SpaceBetween>

          {/* 全問クリア */}
          {finished && (
            <Alert type="success" header="全問終了おめでとう！">
              全 {RIDDLES.length} 問のうち {score} 問を自力で正解しました。挑戦回数は{' '}
              {attempts} 回でした。
            </Alert>
          )}

          {!voiceReady && (
            <Box variant="small" color="text-status-inactive">
              ※ お使いのブラウザによっては音声読み上げが利用できない場合があります。その場合も文字で問題を確認できます。
            </Box>
          )}
        </SpaceBetween>
      </Container>
    </ColumnLayout>
  )
}
