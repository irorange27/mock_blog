export interface Post {
  _path: string
  title: string
  date: string
  categories?: string
  tags?: string[]
  description?: string
}

interface CategoryCount {
  name: string
  count: number
}