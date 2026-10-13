<script setup lang="ts">
// 文章评论区：列表 + 主楼回复 + 发表表单 + 博主删除入口。
//
// 设计取舍（详见 docs/comments.md）：
// - 评论正文按纯文本渲染，不解析 Markdown / 不注入 HTML；
// - 昵称、邮箱、网址是访客自填的，没有服务端会话，本版不防冒充；
// - 身份存在 localStorage，下次来访自动带上。
import type { CommentData } from '~/types/comment'

const props = defineProps<{ slug: string }>()

const {
  tree, count, loading, submitting, identity, submit, remove,
} = useComments(() => props.slug)

const body = ref('')
const nick = ref(identity.nick)
const email = ref(identity.email)
const link = ref(identity.link)
const replyTo = ref<CommentData | null>(null)
const error = ref('')
const notice = ref('')

const textarea = ref<HTMLTextAreaElement | null>(null)
const token = ref('')

// 管理入口不在界面上露面：读者看不到任何「管理」按钮或提示，
// 只有博主自己知道在地址后面加 ?admin=1（拼在文章 URL 上，如
// /posts/foo/?admin=1）。参数在就展开令牌框，同时把令牌记进
// sessionStorage，这样在文章之间跳转时不用每篇都加参数。
// 与服务端 worker/comments.ts 保持同一条邮箱规则，避免「前端放行、服务端打回」
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 正文上限，与 worker/comments.ts 的 BODY_MAX 对应；改一处必须改两处。
const BODY_MAX = 1000

const ADMIN_QUERY = 'admin'
const TOKEN_KEY = 'comment-admin-token'

const showAdmin = ref(false)

if (import.meta.client) {
  const fromQuery = new URLSearchParams(window.location.search).has(ADMIN_QUERY)
  let remembered = ''
  try {
    remembered = sessionStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    // 存储不可用：每次都要带 ?admin=1 重新填令牌
  }
  token.value = remembered
  showAdmin.value = fromQuery || Boolean(remembered)
}

// 只要这个页面是「管理态」，就把令牌留给同一标签页里的后续文章。
watch(token, (value) => {
  if (!import.meta.client) return
  try {
    if (value) sessionStorage.setItem(TOKEN_KEY, value)
    else sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // 同上，存不下就算了
  }
})

// 表单左侧的头像预览：跟评论卡片同一个规则，用昵称首字。
// 它要表达的是「发出去之后你会长这样」，所以不该跟卡片里的头像长得不一样。
const previewInitial = computed(() => nick.value.trim().slice(0, 1).toUpperCase() || '?')

// 输入框是身份的单一真相源，identity 只用于提交与持久化，所以只做单向同步。
// 反向的 watch(identity) 曾经存在，但 identity 在组件存活期间只会被写、
// 不会被外部改（loadIdentity 只在 useComments 的 setup 里跑一次），
// 所以那条反向 watch 永远不会触发，是死代码。回到本页时恢复身份靠 loadIdentity，
// 上面几个 ref 的初值已经拿到了。
watch([nick, email, link], () => {
  identity.nick = nick.value
  identity.email = email.value
  identity.link = link.value
}, { immediate: true })

async function onSubmit() {
  error.value = ''
  notice.value = ''

  if (!nick.value.trim()) {
    error.value = '请填写昵称'
    return
  }
  // 邮箱必填：原生 required 只保证非空，格式还得自己看一遍，
  // 否则用户要等一次服务端往返才知道写错了。
  if (!email.value.trim()) {
    error.value = '请填写邮箱'
    return
  }
  if (!EMAIL_PATTERN.test(email.value.trim())) {
    error.value = '邮箱格式不正确'
    return
  }
  if (!body.value.trim()) {
    error.value = '请写点什么再提交'
    return
  }

  const failure = await submit(body.value, replyTo.value?.id ?? '')
  if (failure) {
    error.value = failure
    return
  }

  body.value = ''
  replyTo.value = null
  notice.value = '已发布'
}

function onReply(comment: CommentData) {
  replyTo.value = comment
  notice.value = ''
  nextTick(() => textarea.value?.focus())
}

async function onDelete(comment: CommentData) {
  if (!token.value.trim()) {
    error.value = '请先填写删除令牌'
    return
  }
  const failure = await remove(comment.id, token.value.trim())
  error.value = failure ?? ''
  notice.value = failure ? '' : '已删除'
}
</script>

<template>
  <section class="comments" aria-labelledby="comments-heading">
    <header class="comments-header">
      <h2 id="comments-heading" class="comments-title">
        评论
        <span v-if="count" class="comments-count">{{ count }}</span>
      </h2>
    </header>

    <p v-if="showAdmin" class="comments-admin">
      <label class="comments-field">
        <span>删除令牌</span>
        <input
          v-model="token"
          type="password"
          autocomplete="off"
          placeholder="COMMENT_ADMIN_TOKEN"
        >
      </label>
      <span class="comments-hint">令牌填对后，点评论右侧的「删除」即可移除（主楼连同回复）。</span>
    </p>

    <form class="comments-form" @submit.prevent="onSubmit">
      <p v-if="replyTo" class="comments-replying">
        正在回复 <strong>{{ replyTo.nick }}</strong>
        <button type="button" class="comments-action" @click="replyTo = null">取消</button>
      </p>

      <div class="comments-identity">
        <!-- 头像预览：填了完整邮箱就换成 Gravatar，否则显示昵称首字 -->
        <div class="comments-avatar-preview" aria-hidden="true">
          <span>{{ previewInitial }}</span>
        </div>

        <label class="comments-field">
          <span>昵称</span>
          <input v-model="nick" type="text" maxlength="24" required placeholder="必填">
        </label>
        <label class="comments-field">
          <span>邮箱</span>
          <input v-model="email" type="email" maxlength="254" required placeholder="必填">
        </label>
        <label class="comments-field">
          <span>网址</span>
          <input v-model="link" type="url" maxlength="200" placeholder="选填">
        </label>
      </div>

      <textarea
        ref="textarea"
        v-model="body"
        class="comments-body"
        rows="4"
        :maxlength="BODY_MAX"
        required
        placeholder="写下你的想法…"
      />

      <div class="comments-actions">
        <span v-if="error" class="comments-error" role="alert">{{ error }}</span>
        <span v-else-if="notice" class="comments-notice" role="status">{{ notice }}</span>
        <span class="comments-counter">{{ body.length }} / {{ BODY_MAX }}</span>
        <button type="submit" class="comments-submit" :disabled="submitting">
          {{ submitting ? '发送中…' : '发表评论' }}
        </button>
      </div>
    </form>

    <p v-if="loading && !count" class="comments-empty">正在加载评论…</p>
    <p v-else-if="!count" class="comments-empty">还没有评论，来说两句吧。</p>

    <ul v-else class="comments-list">
      <template v-for="root in tree" :key="root.id">
        <PostComment :comment="root" :show-delete="showAdmin" @reply="onReply" @delete="onDelete" />
        <PostComment
          v-for="child in root.children"
          :key="child.id"
          :comment="child"
          reply
          :show-delete="showAdmin"
          @reply="onReply"
          @delete="onDelete"
        />
      </template>
    </ul>

  </section>
</template>
