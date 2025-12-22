// ./NotionNext/pages/api/search.js
export default async function handler(req, res) {
  const { q } = req.query
  if (!q) {
    return res.status(400).json({ error: 'Missing query parameter q' })
  }

  try {
    // 调用后端 FastAPI
    const backendRes = await fetch(`http://127.0.0.1:8000/api/search?q=${encodeURIComponent(q)}`)
    const data = await backendRes.json()
    res.status(200).json(data)
  } catch (err) {
    console.error('Proxy error:', err)
    res.status(500).json({ error: 'Backend search failed' })
  }
}
