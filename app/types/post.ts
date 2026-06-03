export interface Post {
  _path: string
  title: string
  date: string
  draft?: boolean
  categories?: string
  tags?: string[]
  description?: string
  content?: string
  body?: {
    toc?: TableOfContentsItem[]
  }
}

export interface TableOfContentsItem {
  id: string
  text: string
  depth: number
  children?: TableOfContentsItem[]
}

export interface FriendLink {
  name: string
  url: string
  avatar: string
  description: string
}

export interface CategoryCount {
  name: string
  count: number
}

export interface TagCount {
  name: string
  count: number
}
