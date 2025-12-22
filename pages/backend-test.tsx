import { useEffect, useState } from 'react'

type Post = {
  id: number
  title: string
  content: string
}

export default function BackendTestPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('http://localhost:8000/api/posts')
        if (!res.ok) {
          throw new Error(`后端返回错误状态码: ${res.status}`)
        }
        const data = await res.json()
        setPosts(data)
      } catch (e: any) {
        setError(e.message || '请求失败')
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1>后端联调测试</h1>
      {loading && <p>加载中...</p>}
      {error && <p style={{ color: 'red' }}>错误：{error}</p>}
      {!loading && !error && (
        <ul>
          {posts.map(p => (
            <li key={p.id}>
              <strong>{p.title}</strong>
              <div>{p.content}</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
