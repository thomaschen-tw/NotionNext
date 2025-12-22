import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData } from '@/lib/db/getSiteData'
import { DynamicLayout } from '@/themes/theme'
import { useRouter } from 'next/router'

/**
 * 搜索路由
 * @param {*} props
 * @returns
 */
// const Search = props => {
//   const { posts } = props

//   const router = useRouter()
//   const keyword = router?.query?.s

//   let filteredPosts
//   // 静态过滤
//   if (keyword) {
//     filteredPosts = posts.filter(post => {
//       const tagContent = post?.tags ? post?.tags.join(' ') : ''
//       const categoryContent = post.category ? post.category.join(' ') : ''
//       const searchContent =
//         post.title + post.summary + tagContent + categoryContent
//       return searchContent.toLowerCase().includes(keyword.toLowerCase())
//     })
//   } else {
//     filteredPosts = []
//   }

//   props = { ...props, posts: filteredPosts }

//   const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
//   return <DynamicLayout theme={theme} layoutName='LayoutSearch' {...props} />
// }

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

const Search = props => {
  const router = useRouter()
  const keyword = router?.query?.s
  const [posts, setPosts] = useState([])

  useEffect(() => {
    if (keyword) {
      fetch(`/api/search?q=${encodeURIComponent(keyword)}`)
        .then(res => res.json())
        .then(data => setPosts(data))
    }
  }, [keyword])

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">搜索结果</h1>
      {posts.length > 0 ? (
        <ul className="space-y-4">
          {posts.map(post => (
            <li key={post.id} className="border-b pb-2">
              <h2 className="text-lg font-semibold">{post.title}</h2>
              <p className="text-sm text-gray-600">{post.summary}</p>
              <span className="text-xs text-gray-400">{post.tags}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">没有找到匹配的文章。</p>
      )}
    </div>
  )
}

/**
 * 浏览器前端搜索
 */
export async function getStaticProps({ locale }) {
  const props = await getGlobalData({
    from: 'search-props',
    locale
  })
  const { allPages } = props
  props.posts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export default Search
