<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
    // Extract temporary 'code' sent back by GitHub in URL query (?code=XYZ)
    const code = route.query.code

    if (!code) {
        errorMessage.value = 'No authorization code found in URL.'
        loading.value = false
        return
    }

    try {
        // Send code to your backend using Axios
        const response = await axios.post('http://localhost:8000/auth/githubOAuth', {
            code
        })

        // Store token and user info
        const { token, user, newUser } = response.data
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user', JSON.stringify(user))

        console.log("New User:", newUser)

        // Redirect to dashboard or home page
        console.log(user?.experience)
        if (user?.experience === "Practitioner") {
            router.push('/my-projects')
        }
        else {
            router.push('/discovery')
        }

    } catch (error) {
        console.error('GitHub authentication failed:', error)
        errorMessage.value = error.response?.data?.message || 'Authentication failed. Please try again.'
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <div class="callback-container">
        <div v-if="loading">
            <p>Authenticating with GitHub...</p>
        </div>
        <div v-else-if="errorMessage">
            <p style="color: red;">{{ errorMessage }}</p>
            <router-link to="/">Try Again</router-link>
        </div>
    </div>
</template>