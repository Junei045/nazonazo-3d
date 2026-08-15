/** @type {import('next').NextConfig} */

// GitHub Pages で公開する場合のリポジトリ名。
// 別名で公開する場合はここだけ書き換えれば OK。
// Vercel など、ドメイン直下（サブフォルダなし）で公開する場合は
// GITHUB_PAGES 環境変数を設定しない（= このままで basePath なしで動く）。
const REPO_NAME = 'nazonazo-3d'
const isGithubPagesBuild = process.env.GITHUB_PAGES === 'true'

const nextConfig = {
  // Cloudscape ships untranspiled ESM/SCSS-adjacent code that Next must transpile.
  transpilePackages: [
    '@cloudscape-design/components',
    '@cloudscape-design/component-toolkit',
    '@cloudscape-design/board-components',
  ],

  // GitHub Pages は静的ファイルしか配信できないため、
  // GITHUB_PAGES=true でビルドしたときだけ静的書き出し（SPA）にする。
  ...(isGithubPagesBuild && {
    output: 'export',
    // https://junei045.github.io/nazonazo-3d/ のようにサブフォルダ配下で
    // 公開されるため、その分のパスを付与する。
    basePath: `/${REPO_NAME}`,
    assetPrefix: `/${REPO_NAME}/`,
    // GitHub Pages はディレクトリ index.html を前提にするため付与しておく。
    trailingSlash: true,
  }),

  // ブラウザ側のコード（lib/pdf-text.ts）が pdf.worker.min.mjs を
  // 読み込む際にも同じ basePath を使えるようにする。
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPagesBuild ? `/${REPO_NAME}` : '',
  },
}

export default nextConfig
