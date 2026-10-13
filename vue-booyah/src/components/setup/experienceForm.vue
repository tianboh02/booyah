<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import API from '@/api'

const route = useRoute()
const router = useRouter()

const selectedExperience = ref('New')
const isLoading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
    if (!selectedExperience.value || isLoading.value) return

    isLoading.value = true
    errorMessage.value = ''

    try {
        // 1. Retrieve user object from localStorage
        const userStr = localStorage.getItem('user')
        const currentUser = userStr ? JSON.parse(userStr) : {}

        // 2. Axios POST request sending currentUser.id to match backend req.body.userID
        const response = await API.put('/auth/updateExperience', {
            userID: currentUser.id,
            experience: selectedExperience.value
        })

        console.log('Update success:', response.data)

        // 3. Sync local storage user object
        currentUser.experience = selectedExperience.value
        localStorage.setItem('user', JSON.stringify(currentUser))

        // 4. Route based on selection
        if (selectedExperience.value.toLowerCase() === 'new') {
            router.push('/discovery')
        } else {
            router.push('/my-projects')
        }

    } catch (error) {
        console.error('API Error:', error)
        errorMessage.value = error.response?.data?.message || 'An error occurred while saving.'
    } finally {
        isLoading.value = false
    }
}
</script>

<template>
    <div class="container py-5" style="max-width: 480px;">
        <h2 class="fw-bold mb-3 text-center">Select Experience Level</h2>

        <!-- Error Alert -->
        <div v-if="errorMessage" class="alert alert-danger py-2" role="alert">
            {{ errorMessage }}
        </div>

        <form @submit.prevent="handleSubmit">
            <!-- Option 1: New -->
            <div class="form-check mb-3">
                <input class="form-check-input" type="radio" name="experience" id="expNew" value="New"
                    v-model="selectedExperience">
                <label class="form-check-label" for="expNew">
                    <div class="fw-bold">New</div>
                    <div class="text-secondary small">I am new to building and looking to discover projects.</div>
                </label>
            </div>

            <!-- Option 2: Practitioner -->
            <div class="form-check mb-4">
                <input class="form-check-input" type="radio" name="experience" id="expPractitioner" value="Practitioner"
                    v-model="selectedExperience">
                <label class="form-check-label" for="expPractitioner">
                    <div class="fw-bold">Practitioner</div>
                    <div class="text-secondary small">I am an experienced developer managing my own projects.</div>
                </label>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold"
                :disabled="!selectedExperience || isLoading">
                <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                <span>{{ isLoading ? 'Saving...' : 'Submit' }}</span>
            </button>
        </form>
    </div>
</template>