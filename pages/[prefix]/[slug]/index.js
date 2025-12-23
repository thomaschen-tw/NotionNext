import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData, getPost } from '@/lib/db/getSiteData'
import { checkSlugHasOneSlash, processPostData } from '@/lib/utils/post'
import { idToUuid } from 'notion-utils'
import Slug from '..'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await getGlobalData({ from })

  // 根据slug中的 / 分割成prefix和slug两个字段 ; 例如 article/test
  // 最终用户可以通过  [domain]/[prefix]/[slug] 路径访问，即这里的 [domain]/article/test
  const paths = allPages
    ?.filter(row => checkSlugHasOneSlash(row))
    .map(row => ({
      params: { prefix: row.slug.split('/')[0], slug: row.slug.split('/')[1] }
    }))

  // 增加一种访问路径 允许通过 [category]/[slug] 访问文章
  // 例如文章slug 是 test ，然后文章的分类category是 production
  // 则除了 [domain]/[slug] 以外，还支持分类名访问: [domain]/[category]/[slug]

  return {
    paths: paths,
    fallback: true
  }
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  const fullSlug = prefix + '/' + slug
  const from = `slug-props-${fullSlug}`
  const props = await getGlobalData({ from, locale })

  // 在列表内查找文章
  props.post = props?.allPages?.find(p => {
    return (
      p.type.indexOf('Menu') < 0 &&
      (p.slug === slug || p.slug === fullSlug || p.id === idToUuid(fullSlug))
    )
  })

  // 处理非列表内文章的内信息
  if (!props?.post) {
    const pageId = slug.slice(-1)[0]
    if (pageId.length >= 32) {
      const post = await getPost(pageId)
      props.post = post
    }
  }

  // 如果 Notion 中找不到文章，尝试从后端 API 获取
  // 对于 URL /en/article/test1，如果匹配到这里，说明可能是 /en/article 这样的二级路径
  // 但实际文章 slug 可能是 "article" 或其他值
  if (!props?.post) {
    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
      // 如果 prefix 是语言代码（如 en），则实际的 slug 就是 slug 参数
      // 例如 /en/article -> prefix="en", slug="article"，应该用 "article" 去后端查找
      const actualSlug = (prefix && ['en', 'zh', 'jp', 'ja'].includes(prefix)) ? slug : slug
      
      console.log(`[DEBUG] [index.js] Trying to fetch post from backend: ${backendUrl}/api/post/slug/${actualSlug}`)
      const apiResponse = await fetch(`${backendUrl}/api/post/slug/${actualSlug}`)
      
      if (apiResponse.ok) {
        const backendPost = await apiResponse.json()
        
        // 将纯文本内容转换为 Notion blockMap 格式
        const pageId = `page-${backendPost.id}`
        
        // 将内容按段落分割
        const paragraphs = backendPost.content
          ? backendPost.content.split('\n').filter(p => p.trim())
          : []
        
        const blocks = {}
        const contentIds = []
        
        // 创建页面块
        blocks[pageId] = {
          value: {
            id: pageId,
            type: 'page',
            properties: {
              title: [[backendPost.title]]
            },
            content: []
          }
        }
        
        // 为每个段落创建一个文本块
        paragraphs.forEach((paragraph, index) => {
          const blockId = `block-${backendPost.id}-${index}`
          contentIds.push(blockId)
          
          blocks[blockId] = {
            value: {
              id: blockId,
              type: 'text',
              properties: {
                title: [[paragraph]]
              },
              parent_id: pageId
            }
          }
        })
        
        // 设置页面块的 content 数组
        if (contentIds.length > 0) {
          blocks[pageId].value.content = contentIds
          // 设置每个块的 content 指向下一个块（形成链式结构）
          contentIds.forEach((blockId, index) => {
            if (index < contentIds.length - 1) {
              blocks[blockId].value.content = [contentIds[index + 1]]
            }
          })
        }
        
        // 格式化日期字段，供前端显示使用
        const formatDate = (dateStr, lang = 'en-US') => {
          if (!dateStr) return null
          try {
            const date = new Date(dateStr)
            const options = { year: 'numeric', month: 'short', day: 'numeric' }
            const res = date.toLocaleDateString(lang, options)
            // 如果格式是中文日期，则转为横杆
            const format = lang.slice(0, 2).toLowerCase() === 'zh'
              ? res.replace('年', '-').replace('月', '-').replace('日', '')
              : res
            return format
          } catch (e) {
            return null
          }
        }
        
        const createdTime = backendPost.created_at
        const publishDate = createdTime ? new Date(createdTime).getTime() : null
        const lang = props.NOTION_CONFIG?.LANG || 'en-US'
        
        // 将后端数据格式转换为前端需要的格式
        props.post = {
          id: pageId,
          title: backendPost.title,
          slug: backendPost.slug,
          content: backendPost.content,
          summary: backendPost.summary,
          tags: backendPost.tags || [],
          type: backendPost.type || 'Post',
          status: backendPost.status || 'Published',
          createdTime: createdTime,
          publishDate: publishDate,  // 时间戳，用于格式化显示
          publishDay: formatDate(createdTime, lang),  // 格式化后的日期字符串
          lastEditedTime: createdTime,  // 如果没有更新日期，使用创建日期
          lastEditedDay: formatDate(createdTime, lang),  // 格式化后的日期字符串
          date: backendPost.date || (createdTime ? {
            start_date: createdTime.split('T')[0]
          } : null),
          blockMap: {
            block: blocks
          },
          content: contentIds
        }
      }
    } catch (error) {
      console.error('Failed to fetch post from backend API:', error)
    }
  }

  if (!props?.post) {
    // 无法获取文章
    props.post = null
  } else {
    // 只有当文章有 blockMap 时才调用 processPostData（Notion 文章）
    // 后端文章已经有基本格式，不需要 processPostData
    if (props.post.blockMap?.block && Object.keys(props.post.blockMap.block).length > 1) {
      await processPostData(props, from)
    }
  }
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

export default PrefixSlug
