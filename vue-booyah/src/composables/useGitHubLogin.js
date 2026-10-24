const VITE_GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID

export function redirectToGitHub() {
  const rootUrl = 'https://github.com/login/oauth/authorize'
  const options = { client_id: VITE_GITHUB_CLIENT_ID, scope: 'read:user user:email repo' }
  const q = new URLSearchParams(options).toString()
  window.location.href = `${rootUrl}?${q}`
}