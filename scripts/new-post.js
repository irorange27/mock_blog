/* This is a script to create a new post markdown file with front-matter */

import fs from "fs"
import path from "path"

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  const hours = String(today.getHours()).padStart(2, "0")
  const minutes = String(today.getMinutes()).padStart(2, "0")
  const seconds = String(today.getSeconds()).padStart(2, "0")

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No filename argument provided
Usage: pnpm new-post <slug> [title]
  <slug>   - Filename / URL slug, Chinese supported (required)
  [title]  - Display title (optional, defaults to slug)`)
  process.exit(1)
}

const slug = args[0]
const title = args[1] || slug
let fileName = slug
// 显式声明路由：Content v3 会把文件名 slug 化，非 ASCII 字符（中文）会被剥掉，
// 所以用 frontmatter 的 path 固定 URL（数据库与路由均按解码后的原文匹配）
const routePath = "/posts/" + slug.replace(/\.(md|mdx)$/i, "")

// Add .md extension if not present
const fileExtensionRegex = /\.(md|mdx)$/i
if (!fileExtensionRegex.test(fileName)) {
  fileName += ".md"
}

const targetDir = "./content/posts/"
const fullPath = path.join(targetDir, fileName)

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists `)
  process.exit(1)
}

// recursive mode creates multi-level directories
const dirPath = path.dirname(fullPath)
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
}

const content = `---
title: ${title}
date: ${getDate()}
path: ${routePath}
categories: ''
tags:
description: ''
draft: true
---
`

fs.writeFileSync(path.join(targetDir, fileName), content)

console.log(`Post ${fullPath} created`)
