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
  <slug>   - English filename / URL slug (required)
  [title]  - Display title, can be Chinese (optional, defaults to slug)`)
  process.exit(1)
}

const slug = args[0]
const title = args[1] || slug
let fileName = slug

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
categories: ''
tags:
description: ''
draft: true
---
`

fs.writeFileSync(path.join(targetDir, fileName), content)

console.log(`Post ${fullPath} created`)
