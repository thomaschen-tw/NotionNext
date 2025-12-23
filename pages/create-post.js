import { useState } from 'react'
import { useRouter } from 'next/router'

/**
 * 创建文章页面
 * Day 5: 实现前端保存按钮与后端 API 联调
 */
export default function CreatePost() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    slug: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [createdPost, setCreatedPost] = useState(null)

  // 后端 API URL
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // 清除错误信息
    if (error) setError(null)
  }

  const generateSlug = (title) => {
    if (!title) return ''
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleSlugChange = (e) => {
    setFormData(prev => ({
      ...prev,
      slug: e.target.value
    }))
  }

  const handleAutoGenerateSlug = () => {
    if (formData.title) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(prev.title)
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // 准备请求数据
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : []

      const payload = {
        title: formData.title,
        content: formData.content,
        tags: tagsArray,
        slug: formData.slug || generateSlug(formData.title)
      }

      // 调用后端 API
      const response = await fetch(`${backendUrl}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setCreatedPost(data)
      setSuccess(true)

      // 3秒后跳转到文章详情页
      setTimeout(() => {
        if (data.slug) {
          router.push(`/en/article/${data.slug}`)
        } else {
          router.push(`/en/article/${data.id}`)
        }
      }, 3000)

    } catch (err) {
      console.error('Error creating post:', err)
      setError(err.message || 'Failed to create post. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 dark:text-white">创建新文章</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 标题 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2 dark:text-gray-300">
            标题 *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="输入文章标题"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium mb-2 dark:text-gray-300">
            URL Slug
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleSlugChange}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="article-slug (留空将自动生成)"
            />
            <button
              type="button"
              onClick={handleAutoGenerateSlug}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
            >
              自动生成
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium mb-2 dark:text-gray-300">
            内容 *
          </label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            required
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="输入文章内容"
          />
        </div>

        {/* 标签 */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium mb-2 dark:text-gray-300">
            标签（用逗号分隔）
          </label>
          <input
            type="text"
            id="tags"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="例如: docker, ci, web"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md dark:bg-red-900 dark:border-red-700 dark:text-red-200">
            <strong>错误：</strong> {error}
          </div>
        )}

        {/* 成功提示 */}
        {success && createdPost && (
          <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md dark:bg-green-900 dark:border-green-700 dark:text-green-200">
            <strong>成功！</strong> 文章已创建。
            <p className="mt-2 text-sm">
              文章 ID: {createdPost.id} | Slug: {createdPost.slug}
            </p>
            <p className="mt-1 text-sm">3秒后自动跳转到文章页面...</p>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '保存中...' : '保存文章'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-md dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  )
}

