/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './content/**/*.md'
  ],
  theme: {
    extend: {}
  },
  plugins: [
    require('@tailwindcss/typography')
  ]
}
