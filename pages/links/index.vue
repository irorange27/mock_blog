<template>
  <div class="min-h-screen bg-white rounded-lg shadow-md py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-800">
    <div class="max-w-6xl mx-auto">
      <!-- <h1 class="text-3xl font-bold text-center text-gray-800 mb-8">
        友情链接
      </h1> -->
       
      <div v-if="pending" class="text-center">
        加载中...
      </div>
       
      
      <div v-else>
        <!-- 使用插槽渲染 Markdown 内容 -->
        <ContentRenderer :value="content">
          <template #default>
            <div class="prose mb-8 bg-white dark:bg-gray-800 rounded-lg">
              <ContentDoc path="/links" class="prose max-w-none dark:text-gray-100 dark:prose-invert" />
            </div>
            <!-- 友链列表 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FriendLinkItem
                v-for="(link, index) in links"
                :key="index"
                :link="link"
              />
            </div>
            
            
          </template>
        </ContentRenderer>
          
        
        
      </div>
    </div>
  </div>
</template>

<script setup>
  const theme = useColorMode()
  const { data: linksData, pending } = await useAsyncData('links', async () => {
   const allLinks = await queryContent('/links')
     .only(['links'])
     .find()

    return {
        links: allLinks.flatMap(link => link.links)
    }
  })
  const links = computed(() => linksData.value?.links || [])
  
</script>