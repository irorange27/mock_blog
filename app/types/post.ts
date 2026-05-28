export interface Post {
  _path: string
  title: string
  date: string
  categories?: string
  tags?: string[]
  description?: string
  content?: string
  body?: {
    toc?: Array<{
      id: string
      text: string
      level: string
      children?: Array<{
        id: string
        text: string
        level: string
        children?: any[]
      }>
    }>
  }
}
