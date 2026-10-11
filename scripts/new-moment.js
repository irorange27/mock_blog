/* Create a new moment markdown file under content/moments/.
   Title is optional — most moments are just a line of text written straight into the body. */

import fs from "fs"
import path from "path"

function getDate() {
  const today = new Date()
  const pad = (n) => String(n).padStart(2, "0")
  const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
  const time = `${pad(today.getHours())}:${pad(today.getMinutes())}:${pad(today.getSeconds())}`
  return { date, time }
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No filename argument provided
Usage: pnpm new-moment <slug> [title]
  <slug>   - English filename (required), saved as content/moments/YYYY-MM-DD-<slug>.md
  [title]  - Display title (optional; pass "动态" to omit it from display)`)
  process.exit(1)
}

const slug = args[0]
const title = args[1] || "动态"
const fileName = `${getDate().date}-${slug.replace(/\.(md|mdx)$/i, "")}.md`

const targetDir = "./content/moments/"
const fullPath = path.join(targetDir, fileName)

if (fs.existsSync(fullPath)) {
  console.error(`Error: File ${fullPath} already exists`)
  process.exit(1)
}

const { date, time } = getDate()
const content = `---
title: ${title}
date: "${date} ${time}"
---

`

fs.writeFileSync(fullPath, content)

console.log(`Moment ${fullPath} created`)
