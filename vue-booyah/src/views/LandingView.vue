<script setup>
import Landing from '../components/landing/Landing.vue';
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()


onMounted(() => {
    if (localStorage.getItem('auth_token') && localStorage.getItem('user')) {
        router.push('/dashboard')
    }

})

</script>

<template>
    <main>
        <Landing />
    </main>
</template>
