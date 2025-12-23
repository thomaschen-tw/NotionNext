import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { getGlobalData, getPost } from '@/lib/db/getSiteData'
import { checkSlugHasMorThanTwoSlash, processPostData } from '@/lib/utils/post'
import { idToUuid } from 'notion-utils'
import Slug from '..'

/**
 * 根据notion的slug访问页面
 * 解析三级以上目录 /article/2023/10/29/test
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

/**
 * 编译渲染页面路径
 * @returns
 */
export async function getStaticPaths() {
  if (!BLOG.isProd) {
    return {
      paths: [],
      fallback: true
    }
  }

  const from = 'slug-paths'
  const { allPages } = await getGlobalData({ from })
  const paths = allPages
    ?.filter(row => checkSlugHasMorThanTwoSlash(row))
    .map(row => ({
      params: {
        prefix: row.slug.split('/')[0],
        slug: row.slug.split('/')[1],
        suffix: row.slug.split('/').slice(2)
      }
    }))
  return {
    paths: paths,
    fallback: true
  }
}

/**
 * 抓取页面数据
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({
  params: { prefix, slug, suffix },
  locale
}) {
  const fullSlug = prefix + '/' + slug + '/' + suffix.join('/')
  const from = `slug-props-${fullSlug}`
  
  // 如果 prefix 是语言代码（如 en, zh），使用它作为 locale
  // 否则使用传入的 locale 参数
  const actualLocale = locale || prefix
  
  const props = await getGlobalData({ from, locale: actualLocale })

  // 在列表内查找文章
  // suffix 是数组，需要转换为字符串进行比较
  const suffixStr = suffix.join('/')
  const lastPart = fullSlug.substring(fullSlug.lastIndexOf('/') + 1)
  // 尝试匹配不同的 slug 格式：完整路径、去掉 prefix 的路径、最后一部分
  const slugWithoutPrefix = slug + '/' + suffixStr
  // 如果 prefix 可能是语言代码，尝试去掉它后的路径
  const slugWithoutLangPrefix = (prefix && ['en', 'zh', 'jp', 'ja'].includes(prefix)) 
    ? slug + '/' + suffixStr 
    : fullSlug
  
  props.post = props?.allPages?.find(p => {
    if (p.type.indexOf('Menu') >= 0) {
      return false
    }
    
    // 尝试多种匹配方式
    return (
      p.slug === suffixStr ||
      p.slug === slugWithoutPrefix ||
      p.slug === slugWithoutLangPrefix ||
      p.slug === fullSlug ||
      p.slug === lastPart ||
      p.id === idToUuid(fullSlug) ||
      p.id === idToUuid(slugWithoutPrefix) ||
      p.id === idToUuid(slugWithoutLangPrefix)
    )
  })

  // 处理非列表内文章的内信息
  if (!props?.post) {
    // 尝试从 fullSlug 的最后一部分提取 pageId
    const pageId = fullSlug.split('/').pop()
    if (pageId && pageId.length >= 32) {
      const post = await getPost(pageId)
      props.post = post
    }
  }

  // 如果 Notion 中找不到文章，尝试从后端 API 获取
  if (!props?.post) {
    try {
      // 尝试使用 suffixStr (例如 "test1") 从后端 API 获取
      // 对于 URL /en/article/test1: prefix="en", slug="article", suffix=["test1"], suffixStr="test1"
      const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
      // 使用 suffixStr 作为实际的文章 slug
      const actualSlug = suffixStr || lastPart
      console.log(`[DEBUG] Trying to fetch post from backend: ${backendUrl}/api/post/slug/${actualSlug}`)
      const apiResponse = await fetch(`${backendUrl}/api/post/slug/${actualSlug}`)
      
      if (apiResponse.ok) {
        const backendPost = await apiResponse.json()
        console.log(`[DEBUG] Backend post fetched successfully:`, { id: backendPost.id, title: backendPost.title, slug: backendPost.slug })
        
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
        } else {
          // 如果没有内容段落，至少确保页面块有正确的结构
          blocks[pageId].value.content = []
        }
        
        console.log(`[DEBUG] Created blockMap with ${Object.keys(blocks).length} blocks`)
        
        // 格式化日期字段，供前端显示使用
        // 导入 formatDate 函数
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
        // 注意：post.id 必须与 blockMap 中页面块的 id 一致
        props.post = {
          id: pageId,  // 必须与 blocks[pageId] 中的 id 一致
          title: backendPost.title,
          slug: backendPost.slug,
          content: backendPost.content,  // 原始内容文本
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
          // content 数组会在 Slug 组件中根据 parent_id 自动生成
          // 但我们需要确保 blockMap 结构正确
        }
        
        console.log(`[DEBUG] Post object created:`, { id: props.post.id, title: props.post.title, hasBlockMap: !!props.post.blockMap })
      } else {
        console.log(`[DEBUG] Backend API returned status: ${apiResponse.status}`)
      }
    } catch (error) {
      console.error('[DEBUG] Failed to fetch post from backend API:', error)
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
