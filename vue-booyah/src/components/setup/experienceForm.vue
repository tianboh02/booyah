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

        // 2. Axios PUT request sending currentUser.id to match backend req.body.userID
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
    <div class="container py-5 d-flex justify-content-center align-items-center min-vh-100">
        <div class="setup-card p-4 p-md-5 rounded-4 border shadow-sm w-100" style="max-width: 520px;">
            <h2 class="fw-bold mb-2 text-center header-title">Select Experience Level</h2>
            <p class="text-muted-github text-center small mb-4">
                Tailor your Booyah workspace experience to match your developer background.
            </p>

            <!-- Error Alert -->
            <div v-if="errorMessage" class="alert alert-danger py-2 small mb-4" role="alert">
                {{ errorMessage }}
            </div>

            <form @submit.prevent="handleSubmit">
                <div class="d-flex flex-column gap-3 mb-4">

                    <!-- Option 1: New -->
                    <label class="option-card p-3 rounded-3 border d-flex align-items-start gap-3 cursor-pointer"
                        :class="{ 'selected': selectedExperience === 'New' }">
                        <input class="form-check-input mt-1 flex-shrink-0" type="radio" name="experience" id="expNew"
                            value="New" v-model="selectedExperience">
                        <div>
                            <div class="fw-semibold option-title">New Developer / Student</div>
                            <div class="text-muted-github small mt-1">
                                I am new to building and looking to discover trending skills and beginner-friendly
                                projects.
                            </div>
                        </div>
                    </label>

                    <!-- Option 2: Practitioner -->
                    <label class="option-card p-3 rounded-3 border d-flex align-items-start gap-3 cursor-pointer"
                        :class="{ 'selected': selectedExperience === 'Practitioner' }">
                        <input class="form-check-input mt-1 flex-shrink-0" type="radio" name="experience"
                            id="expPractitioner" value="Practitioner" v-model="selectedExperience">
                        <div>
                            <div class="fw-semibold option-title">Practitioner / Experienced</div>
                            <div class="text-muted-github small mt-1">
                                I am an experienced developer managing active projects and tracking stack demand.
                            </div>
                        </div>
                    </label>

                </div>

                <!-- Submit Button -->
                <button type="submit" class="btn btn-primary w-100 py-2 fw-semibold"
                    :disabled="!selectedExperience || isLoading">
                    <span v-if="isLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                    <span>{{ isLoading ? 'Saving...' : 'Continue' }}</span>
                </button>
            </form>
        </div>
    </div>
</template>

<style scoped>
.setup-card {
    background-color: var(--card-bg);
    border-color: var(--card-border) !important;
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

.header-title,
.option-title {
    color: var(--app-text);
}

.option-card {
    background-color: var(--github-control-bg);
    border-color: var(--card-border) !important;
    transition: all 0.2s ease;
}

.option-card:hover {
    border-color: #3b82f6 !important;
}

.option-card.selected {
    border-color: #3b82f6 !important;
    background-color: rgba(59, 130, 246, 0.06);
}

.cursor-pointer {
    cursor: pointer;
}
</style>