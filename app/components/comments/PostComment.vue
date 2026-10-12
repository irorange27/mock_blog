<script setup lang="ts">
// 一条评论（主楼与回复共用；回复由 PostComments 拍成两层后平铺传入，不做递归）。
import type { CommentData } from '~/types/comment'

const props = withDefaults(defineProps<{
  comment: CommentData
  /** 回复缩进一级 */
  reply?: boolean
  /** 博主模式：显示删除按钮 */
  showDelete?: boolean
}>(), { reply: false, showDelete: false })

const emit = defineEmits<{
  reply: [comment: CommentData]
  delete: [comment: CommentData]
}>()

// 头像用邮箱的 SHA-256 换 Gravatar。邮箱只在访客自己的浏览器里参与计算：
// 接口不回传它，只有「我刚发的那条」在本地带着它。
const avatar = ref('')

onMounted(async () => {
  if (!props.comment.email) return
  const digest = await sha256(props.comment.email.trim().toLowerCase())
  if (digest) avatar.value = `https://cn.gravatar.com/avatar/${digest}?d=mp&s=80`
})

const initial = computed(() => props.comment.nick.trim().slice(0, 1).toUpperCase() || '?')

const time = computed(() => formatDateTime(props.comment.created))

const iso = computed(() => new Date(props.comment.created).toISOString())
</script>

<template>
  <li class="comment-item" :class="{ 'comment-item-reply': reply }">
    <div class="comment-avatar" aria-hidden="true">
      <img v-if="avatar" :src="avatar" alt="" loading="lazy" decoding="async" width="36" height="36">
      <span v-else>{{ initial }}</span>
    </div>

    <div class="comment-main">
      <div class="comment-meta">
        <a
          v-if="comment.link"
          :href="comment.link"
          class="comment-nick comment-nick-link"
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          {{ comment.nick }}
        </a>
        <span v-else class="comment-nick">{{ comment.nick }}</span>
        <time class="comment-time" :datetime="iso">{{ time }}</time>
      </div>

      <!-- 纯文本：不解析 Markdown，也不注入 HTML。
           换行交给 CSS 的 white-space: pre-wrap，从根上避免 XSS。 -->
      <p class="comment-body">{{ comment.body }}</p>

      <div class="comment-tools">
        <button type="button" class="comment-action" @click="emit('reply', comment)">
          回复
        </button>
        <button
          v-if="showDelete"
          type="button"
          class="comment-action comment-action-danger"
          @click="emit('delete', comment)"
        >
          删除
        </button>
      </div>
    </div>
  </li>
</template>
