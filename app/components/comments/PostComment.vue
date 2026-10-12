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

// 头像用昵称首字。
//
// 曾经接过 Gravatar（邮箱 SHA-256 换图），但它要访客自己注册过才有图，
// 没注册的邮箱会拿到一张默认灰色人像——看上去像加载失败，比没有头像更糟。
// 这个站的读者基本不会注册过，所以统一退回首字。
const initial = computed(() => props.comment.nick.trim().slice(0, 1).toUpperCase() || '?')

const time = computed(() => formatDateTime(props.comment.created))

const iso = computed(() => new Date(props.comment.created).toISOString())
</script>

<template>
  <li class="comment-item" :class="{ 'comment-item-reply': reply }">
    <div class="comment-avatar" aria-hidden="true">
      <span>{{ initial }}</span>
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
