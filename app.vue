<script setup lang="ts">
// Global app setup
const colorMode = useColorMode()

// Set default to dark mode
onMounted(() => {
  if (!colorMode.preference || colorMode.preference === 'system') {
    colorMode.preference = 'dark'
  }
})

// Page title
useHead({
  titleTemplate: (titleChunk) => {
    return titleChunk ? `${titleChunk} | Read Water` : 'Read Water'
  },
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* Ensure dark mode is properly applied */
html.dark {
  color-scheme: dark;
}
</style>

