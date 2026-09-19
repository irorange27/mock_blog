<script setup lang="ts">
useSeoMeta({
  title: "niina's blog",
  description: "niina's blog homepage。",
})

const currentPage = ref(1)
const postsPerPage = 9

const { posts } = useBlogData()

const totalPages = computed(() => Math.ceil(posts.value.length / postsPerPage))

const currentPosts = computed(() => {
  const start = (currentPage.value - 1) * postsPerPage
  return posts.value.slice(start, start + postsPerPage)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="space-y-5">
    <article v-for="post in currentPosts" :key="post._path"
      class="card-base p-4 sm:p-7 hover:border-[var(--line-strong)] hover:-translate-y-0.5 transition-all duration-200">
      <div>
        <NuxtLink :to="post._path" class="block mb-3">
          <h2 class="text-xl font-bold mb-2 text-[var(--txt-90)] hover:text-[var(--primary)] transition-colors">
            {{ post.title }}
          </h2>
        </NuxtLink>

        <div class="flex flex-wrap items-center text-[var(--txt-30)] text-sm mb-3">
          <span>{{ formatDate(post.date) }}</span>
          <span class="mx-1.5">·</span>
          <div class="flex flex-wrap gap-1.5">
            <NuxtLink
              v-for="tag in post.tags"
              :key="tag"
              :to="`/tags/${tag}`"
              class="chip px-2.5 py-0.5 text-xs rounded-full"
            >
              {{ tag }}
            </NuxtLink>
          </div>
        </div>

        <p class="text-[var(--txt-50)] text-sm leading-relaxed line-clamp-2">
          {{ post.description || post.title }}
        </p>
      </div>
    </article>

    <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 pt-6">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--txt-30)] hover:text-[var(--txt-90)]"
      >
        ← 上一页
      </button>

      <template v-for="page in totalPages" :key="page">
        <button
          v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
          @click="goToPage(page)"
          :class="[
            'w-8 h-8 rounded-lg text-sm transition-all',
            currentPage === page
              ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
              : 'text-[var(--txt-30)] hover:text-[var(--txt-90)] hover:bg-[var(--panel-bg-hover)]',
          ]"
        >
          {{ page }}
        </button>
        <span
          v-else-if="Math.abs(page - currentPage) === 2"
          class="text-[var(--txt-25)]"
        >
          …
        </span>
      </template>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[var(--txt-30)] hover:text-[var(--txt-90)]"
      >
        下一页 →
      </button>
    </div>
  </div>
</template>
