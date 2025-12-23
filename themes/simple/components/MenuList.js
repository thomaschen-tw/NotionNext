import Collapse from '@/components/Collapse'
import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import CONFIG from '../config'
import { MenuItemCollapse } from './MenuItemCollapse'
import { MenuItemDrop } from './MenuItemDrop'

/**
 * 菜单导航
 * @param {*} props
 * @returns
 */
export const MenuList = ({ customNav, customMenu }) => {
  const { locale } = useGlobal()
  const [isOpen, changeIsOpen] = useState(false)
  const toggleIsOpen = () => {
    changeIsOpen(!isOpen)
  }
  const closeMenu = e => {
    changeIsOpen(false)
  }
  const router = useRouter()
  const collapseRef = useRef(null)

  useEffect(() => {
    router.events.on('routeChangeStart', closeMenu)
  })

  let links = [
    {
      icon: 'fas fa-search',
      name: locale.NAV.SEARCH,
      href: '/search',
      show: siteConfig('SIMPLE_MENU_SEARCH', null, CONFIG)
    },
    {
      icon: 'fas fa-archive',
      name: locale.NAV.ARCHIVE,
      href: '/archive',
      show: siteConfig('SIMPLE_MENU_ARCHIVE', null, CONFIG)
    },
    {
      icon: 'fas fa-folder',
      name: locale.COMMON.CATEGORY,
      href: '/category',
      show: siteConfig('SIMPLE_MENU_CATEGORY', null, CONFIG)
    },
    {
      icon: 'fas fa-tag',
      name: locale.COMMON.TAGS,
      href: '/tag',
      show: siteConfig('SIMPLE_MENU_TAG', null, CONFIG)
    },
    {
      icon: 'fas fa-plus-circle',
      name: locale.NAV.CREATE_POST,
      href: '/create-post',
      show: true  // 始终显示创建文章按钮
    }
  ]

  if (customNav) {
    links = links.concat(customNav)
  }

  // 如果 开启自定义菜单，则覆盖Page生成的菜单
  if (siteConfig('CUSTOM_MENU')) {
    links = customMenu
  }

  // 确保创建文章按钮始终显示（即使有自定义菜单也添加）
  const createPostLink = {
    icon: 'fas fa-plus-circle',
    name: locale.NAV.CREATE_POST,
    href: '/create-post',
    show: true
  }
  
  // 检查是否已经存在创建文章按钮，避免重复
  const hasCreatePost = links?.some(link => link.href === '/create-post')
  if (!hasCreatePost) {
    links = links ? [...links, createPostLink] : [createPostLink]
  }

  if (!links || links.length === 0) {
    return null
  }

  return (
    <>
      {/* 大屏模式菜单 */}
      <div id='nav-menu-pc' className='hidden md:flex my-auto'>
        {links?.map((link, index) => (
          <MenuItemDrop key={index} link={link} />
        ))}
      </div>
      {/* 移动端小屏菜单 */}
      <div
        id='nav-menu-mobile'
        className='flex md:hidden my-auto justify-start'>
        <div
          onClick={toggleIsOpen}
          className='cursor-pointer hover:text-red-400 transition-all duration-200'>
          <i
            className={`${isOpen && 'rotate-90'} transition-all duration-200 fa fa-bars mr-3`}
          />
          <span>{!isOpen ? 'MENU' : 'CLOSE'}</span>
        </div>

        <Collapse
          collapseRef={collapseRef}
          className='absolute w-full top-12 left-0'
          isOpen={isOpen}>
          <div
            id='menu-wrap'
            className='bg-white dark:border-hexo-black-gray border'>
            {links?.map((link, index) => (
              <MenuItemCollapse
                key={index}
                link={link}
                onHeightChange={param =>
                  collapseRef.current?.updateCollapseHeight(param)
                }
              />
            ))}
          </div>
        </Collapse>
      </div>
    </>
  )
}
