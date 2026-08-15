'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@cloudscape-design/components/app-layout'
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group'
import ContentLayout from '@cloudscape-design/components/content-layout'
import Flashbar from '@cloudscape-design/components/flashbar'
import Header from '@cloudscape-design/components/header'
import HelpPanel from '@cloudscape-design/components/help-panel'
import Modal from '@cloudscape-design/components/modal'
import SpaceBetween from '@cloudscape-design/components/space-between'
import TopNavigation from '@cloudscape-design/components/top-navigation'
import { applyMode, Mode } from '@cloudscape-design/global-styles'

import { RiddleGame } from '@/components/riddle-game'
import { AdminRiddleLoader } from '@/components/admin-riddle-loader'
import { loadStoredRiddles, type Riddle, type RiddlesMeta } from '@/lib/riddles'

export default function AppShell() {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)

  const [riddles, setRiddles] = useState<Riddle[]>([])
  const [riddlesMeta, setRiddlesMeta] = useState<RiddlesMeta | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // 初回マウント時に、ブラウザに保存済みの問題があれば読み込む
  useEffect(() => {
    const { riddles: stored, meta } = loadStoredRiddles()
    setRiddles(stored)
    setRiddlesMeta(meta)
    setHydrated(true)
    // 問題が1つも読み込まれていなければ、最初から管理者ツールを開いておく
    if (stored.length === 0) setAdminOpen(true)
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    applyMode(next ? Mode.Dark : Mode.Light)
  }

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: '#',
            title: 'なぞなぞ 3D クイズ',
            logo: {
              src: `data:image/svg+xml,${encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30"><rect width="30" height="30" rx="6" fill="#4a6cf7"/><text x="15" y="21" font-size="16" text-anchor="middle" fill="#fff" font-family="Arial">?</text></svg>`,
              )}`,
              alt: 'なぞなぞ 3D クイズ',
            },
          }}
          utilities={[
            {
              type: 'button',
              iconName: darkMode ? 'star-filled' : 'star',
              text: darkMode ? 'ダーク' : 'ライト',
              ariaLabel: 'カラーモードを切り替え',
              onClick: toggleDarkMode,
            },
            {
              type: 'button',
              iconName: 'upload',
              text: '管理者ツール',
              ariaLabel: '管理者ツール（問題PDFの読み込み）',
              onClick: () => setAdminOpen(true),
            },
            {
              type: 'button',
              iconName: 'status-info',
              text: '遊び方',
              ariaLabel: '遊び方を表示',
              onClick: () => setToolsOpen(true),
            },
          ]}
          i18nStrings={{
            overflowMenuTriggerText: 'その他',
            overflowMenuTitleText: 'すべて',
          }}
        />
      </div>

      <AppLayout
        headerSelector="#top-nav"
        navigationHide
        navigationOpen={navigationOpen}
        onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
        breadcrumbs={
          <BreadcrumbGroup
            items={[
              { text: 'ホーム', href: '#' },
              { text: 'なぞなぞ 3D クイズ', href: '#' },
            ]}
            ariaLabel="パンくずリスト"
          />
        }
        tools={
          <HelpPanel header={<h2>遊び方</h2>}>
            <SpaceBetween size="m">
              <p>
                3D の「なぞなぞ博士」が、音声と文字であなたに問題を出します。答えがわかったら、
                入力欄に文字で答えを打ち込んで「回答する」を押しましょう。
              </p>
              <p>
                「もう一度きく」で問題を読み上げ直せます。わからないときは「ヒントを見る」を
                使ってみてください。正解すると次の問題に進めます。
              </p>
              <p>音声はブラウザの読み上げ機能（Web Speech API）を利用しています。</p>
              <p>
                出題される問題は、画面右上の「管理者ツール」から管理者がPDFを読み込むことで
                差し替えられます。
              </p>
            </SpaceBetween>
          </HelpPanel>
        }
        notifications={
          <Flashbar
            items={
              showWelcome
                ? [
                    {
                      type: 'info',
                      dismissible: true,
                      onDismiss: () => setShowWelcome(false),
                      statusIconAriaLabel: 'お知らせ',
                      content:
                        'ようこそ！「もう一度きく」を押すと博士が問題を読み上げます。文字で答えを入力してね。',
                      id: 'welcome',
                    },
                  ]
                : []
            }
          />
        }
        content={
          <ContentLayout
            header={
              <Header
                variant="h1"
                description="3D キャラクターが音声と文字でなぞなぞを出題。あなたは文字で答えよう！"
              >
                なぞなぞ 3D クイズ
              </Header>
            }
          >
            {hydrated && <RiddleGame riddles={riddles} />}
          </ContentLayout>
        }
      />

      {hydrated && (
        <Modal
          visible={adminOpen}
          onDismiss={() => setAdminOpen(false)}
          header="管理者ツール：なぞなぞPDFの読み込み"
          size="large"
        >
          <AdminRiddleLoader
            currentMeta={riddlesMeta}
            onRiddlesLoaded={(newRiddles, meta) => {
              setRiddles(newRiddles)
              setRiddlesMeta(meta)
            }}
            onRiddlesCleared={() => {
              setRiddles([])
              setRiddlesMeta(null)
            }}
          />
        </Modal>
      )}
    </>
  )
}
