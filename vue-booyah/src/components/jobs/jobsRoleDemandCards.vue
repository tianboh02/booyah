<script setup>
defineProps({
    roles: { type: Array, default: () => [] },
    postsPerMonth: { type: Array, default: () => [] }
})
</script>

<template>
    <section class="mb-4">
        <div class="mb-3">
            <h2 class="h5 fw-bold text-white mb-1">Role demand</h2>
            <p class="text-muted-github small mb-0">Share of job posts mentioning each role, last 3 months</p>
        </div>

        <div class="row g-3">
            <!-- Left Card: Roles -->
            <div class="col-md-6">
                <div class="card p-4 h-100 rounded-3 shadow-sm">
                    <div
                        class="chart-placeholder text-muted-github small p-4 mb-3 text-center border border-secondary border-dashed rounded-3">
                        Role demand chart coming soon
                    </div>
                    <ul class="list-group list-group-flush">
                        <li v-for="r in roles" :key="r.name"
                            class="list-group-item bg-transparent text-white border-bottom-github d-flex justify-content-between px-0 py-2 small">
                            <span>{{ r.name }}</span>
                            <span class="font-monospace text-muted-github">{{ r.share }}%</span>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Right Card: Posts Per Month -->
            <div class="col-md-6">
                <div class="card p-4 h-100 rounded-3 shadow-sm">
                    <h3 class="h6 fw-bold text-white mb-3">Posts per month</h3>
                    <div
                        class="chart-placeholder text-muted-github small p-4 mb-3 text-center border border-secondary border-dashed rounded-3">
                        Posts per month chart coming soon
                    </div>
                    <ul class="list-group list-group-flush">
                        <li v-for="p in postsPerMonth" :key="p.month"
                            class="list-group-item bg-transparent text-white border-bottom-github d-flex justify-content-between px-0 py-2 small">
                            <span>{{ p.month }}</span>
                            <span class="font-monospace text-muted-github">{{ p.count }}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.border-dashed {
    border-style: dashed !important;
}

.border-bottom-github {
    border-bottom: 1px solid #30363d !important;
}
</style>