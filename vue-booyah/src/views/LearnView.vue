<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import axios from 'axios'
import { fetchDiscoveryData } from '@/utils/hackernewsDiscovery'
import { fetchTopRepos } from '@/utils/trending/github/githubTrending'
import { fetchHNJobsData } from '@/utils/hackernewsJobs'
import { useUserSettings } from '@/utils/userSettings'
import { categoryColor } from '@/utils/savedLibrary'
import { getLangColor, topLangColors } from '@/utils/langColors'
import { prefersReducedMotion } from '@/utils/motion'
import {
    extendIdeas,
    jobDemand,
    languageCounts,
    nextLanguages,
    recommendedProjects,
    reposToExtend,
    starterProjects,
    suggestLanguages,
} from '@/utils/learnPath'

import PageHeader from '@/components/shared/PageHeader.vue'
import AlertBanners from '@/components/shared/AlertBanners.vue'
import SignalLoader from '@/components/shared/SignalLoader.vue'
import DiscoveryLangPill from '@/components/discovery/discoveryLangPill.vue'
import LearnStep from '@/components/learn/learnStep.vue'
import LearnChoiceCard from '@/components/learn/learnChoiceCard.vue'
import LearnProjectList from '@/components/learn/learnProjectList.vue'
import LearnExtendCard from '@/components/learn/learnExtendCard.vue'
import LearnResourceList from '@/components/learn/learnResourceList.vue'

const SOURCES = 4 // Discovery, Trending, Jobs, your repos

const LOADER_LEGEND = [
    { label: 'GitHub', colour: [63, 185, 80] },
    { label: 'Hacker News', colour: [255, 138, 61] },
]

const loading = ref(true)
const error = ref('')
const warning = ref('')
const progress = ref({ done: 0, total: SOURCES })

const categories = ref([])
const trendingCounts = ref({})
const demand = ref({})
const repos = ref([])

// The path follows the experience set in the profile (setup page / Settings).
const { experience } = useUserSettings()
const isPractitioner = computed(() => experience.value.toLowerCase() === 'practitioner')

// Choices along the path; picking an earlier one clears the ones after it.
const categoryId = ref(null)
const lang = ref(null) // newcomer: language to start with
const nextLang = ref(null) // practitioner: language to learn next

function resetChoices() {
    categoryId.value = null
    lang.value = null
    nextLang.value = null
}

// Bring the step a choice just unlocked into view.
async function reveal(id) {
    await nextTick()
    document.getElementById(id)?.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
    })
}

function pickCategory(id) {
    categoryId.value = id
    lang.value = null
    reveal(isPractitioner.value ? 'learn-recommended' : 'learn-language')
}

function pickLang(l) {
    lang.value = l
    reveal('learn-projects')
}

function pickNext(l) {
    nextLang.value = l
    categoryId.value = null
    reveal('learn-category')
}

const category = computed(() => categories.value.find((c) => c.id === categoryId.value) ?? null)
const languageOptions = computed(() => (category.value ? suggestLanguages(category.value, trendingCounts.value) : []))
const starters = computed(() => (category.value && lang.value ? starterProjects(category.value, lang.value) : []))

const userLangs = computed(() =>
    Object.entries(languageCounts(repos.value.map((r) => r.language)))
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name),
)
const nextOptions = computed(() => nextLanguages(userLangs.value, trendingCounts.value, demand.value))
const recommended = computed(() =>
    category.value && nextLang.value ? recommendedProjects(category.value, nextLang.value) : [],
)

// Your repos checked against the chosen category, each with ways to extend it.
const toExtend = computed(() => (category.value ? reposToExtend(repos.value, category.value.id) : null))
const extendCards = computed(() =>
    (toExtend.value?.repos ?? []).map((repo) => ({ repo, ideas: extendIdeas(repo, category.value, nextLang.value) })),
)
const extendHint = computed(() =>
    toExtend.value?.matched
        ? `Your repos that fall in ${category.value.name}, checked against Discovery's rules.`
        : `None of your repos fall in ${category.value?.name} yet, so here are your most recent ones.`,
)

const chosenLang = computed(() => (isPractitioner.value ? nextLang.value : lang.value))

const projectsIn = (c, l) => c.projects.filter((p) => p.language === l).length

// Header: the chosen language's colour, otherwise the most common languages across the categories.
const headerColors = computed(() =>
    chosenLang.value
        ? [getLangColor(chosenLang.value)]
        : topLangColors(categories.value.flatMap((c) => c.projects.map((p) => p.language))),
)
const live = computed(() => !loading.value && !error.value && categories.value.length > 0)
const status = computed(() => {
    if (loading.value) return 'Gathering signals'
    return live.value ? 'Live from Discovery, Trending and Jobs' : 'Not connected'
})
const subtitle = computed(() =>
    isPractitioner.value
        ? 'Build on what you already use: what to learn next and how to extend your own projects.'
        : 'Pick an interest and get a language, starter projects and where to learn it.',
)
const loaderStatus = computed(() => `Reading Discovery, Trending and Jobs ${progress.value.done} / ${SOURCES}`)

async function getRepos() {
    const { data } = await axios.get('https://api.github.com/user/repos', {
        params: { per_page: 100, affiliation: 'owner', sort: 'pushed' },
        headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
            'X-GitHub-Api-Version': '2022-11-28',
            Accept: 'application/vnd.github+json',
        },
    })
    return data
}

async function load() {
    loading.value = true
    error.value = ''
    warning.value = ''
    progress.value = { done: 0, total: SOURCES }
    resetChoices()

    const tick = (promise) =>
        promise.finally(() => {
            progress.value = { done: progress.value.done + 1, total: SOURCES }
        })

    const [discovery, trending, jobs, userRepos] = await Promise.allSettled([
        tick(fetchDiscoveryData()),
        tick(fetchTopRepos('weekly')),
        tick(fetchHNJobsData()),
        tick(getRepos()),
    ])

    // Every path starts from the Discovery categories, so without them there is nothing to show.
    if (discovery.status === 'rejected') {
        console.error('LearnView: could not load discovery data', discovery.reason)
        error.value = 'Could not load projects from Hacker News and GitHub. Check your connection and try again.'
        loading.value = false
        return
    }
    categories.value = discovery.value.data

    // The other sources only sharpen the suggestions; a failed one is left out with a warning.
    const missing = []
    const read = (result, name, fallback, pick) => {
        if (result.status === 'fulfilled') return pick(result.value)
        console.error(`LearnView: could not load ${name}`, result.reason)
        missing.push(name)
        return fallback
    }
    trendingCounts.value = read(trending, 'Trending', {}, (v) => languageCounts(v.repos.map((r) => r.language)))
    demand.value = read(jobs, 'Jobs', {}, (v) => jobDemand(v.data.rolesDetail))
    repos.value = read(userRepos, 'your repositories', [], (v) => v)

    warning.value = [
        discovery.value.warning,
        missing.length && `Could not load ${missing.join(', ')}, so suggestions use the rest.`,
    ]
        .filter(Boolean)
        .join(' ')
    loading.value = false
}

onMounted(load)
</script>

<template>
    <div class="container my-4">
        <PageHeader title="Learn" :subtitle="subtitle" :status="status" :live="live" :colors="headerColors" />

        <SignalLoader v-if="loading" :done="progress.done" :total="progress.total" :status="loaderStatus"
            :legend="LOADER_LEGEND" />

        <template v-else>
            <AlertBanners :warning="warning" :error="error" @retry="load" />

            <template v-if="!error">
                <!-- Practitioner: your languages -> next language -> category -> extend your repos -> resources -->
                <template v-if="isPractitioner">
                    <LearnStep :number="1" title="What you already use"
                        hint="Languages across your GitHub repositories.">
                        <div v-if="userLangs.length" class="d-flex flex-wrap gap-2">
                            <DiscoveryLangPill v-for="l in userLangs" :key="l" :lang="l" outlined static />
                        </div>
                        <p v-else class="text-muted-github small mb-0">No languages found in your repositories yet.</p>
                    </LearnStep>

                    <LearnStep :number="2" title="Learn next"
                        hint="Ranked by this week's trending repos and Hacker News job posts.">
                        <div v-if="nextOptions.length" class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
                            <div v-for="(o, i) in nextOptions" :key="o.lang" class="col rise-in" :style="{ '--i': i }">
                                <LearnChoiceCard :label="o.lang" :sub="o.why" :color="getLangColor(o.lang)"
                                    :active="nextLang === o.lang" @select="pickNext(o.lang)" />
                            </div>
                        </div>
                        <p v-else class="text-muted-github small mb-0">No suggestions right now. Try again later.</p>
                    </LearnStep>

                    <LearnStep v-if="nextLang" id="learn-category" class="learn-anchor" :number="3"
                        title="Pick a category"
                        hint="Projects in your new language come first; otherwise the category's top projects.">
                        <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
                            <div v-for="(c, i) in categories" :key="c.id" class="col rise-in" :style="{ '--i': i }">
                                <LearnChoiceCard :label="c.name"
                                    :sub="`${projectsIn(c, nextLang)} of ${c.projects.length} projects in ${nextLang}`"
                                    :color="categoryColor(c.name)" :active="categoryId === c.id"
                                    @select="pickCategory(c.id)" />
                            </div>
                        </div>
                        <LearnProjectList v-if="category" id="learn-recommended" class="learn-anchor mt-3"
                            :projects="recommended" />
                    </LearnStep>

                    <template v-if="nextLang && category">
                        <LearnStep :number="4" title="Extend your projects" :hint="extendHint">
                            <div v-if="extendCards.length" class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                                <div v-for="(card, i) in extendCards" :key="card.repo.id" class="col rise-in"
                                    :style="{ '--i': i }">
                                    <LearnExtendCard :repo="card.repo" :ideas="card.ideas" />
                                </div>
                            </div>
                            <p v-else class="text-muted-github small mb-0">No repositories of your own to extend yet.</p>
                        </LearnStep>

                        <LearnStep :number="5" :title="`Learn ${nextLang}`">
                            <LearnResourceList :lang="nextLang" />
                        </LearnStep>
                    </template>
                </template>

                <!-- Newcomer: interest -> language -> starter projects -> resources -->
                <template v-else>
                    <LearnStep :number="1" title="Pick what interests you"
                        hint="The categories developers launched most on Hacker News this month.">
                        <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
                            <div v-for="(c, i) in categories" :key="c.id" class="col rise-in" :style="{ '--i': i }">
                                <LearnChoiceCard :label="c.name" :sub="`${c.projects.length} projects`"
                                    :color="categoryColor(c.name)" :active="categoryId === c.id"
                                    @select="pickCategory(c.id)" />
                            </div>
                        </div>
                    </LearnStep>

                    <LearnStep v-if="category" id="learn-language" class="learn-anchor" :number="2"
                        title="Choose a language" hint="What the projects in this category are written in.">
                        <div v-if="languageOptions.length" class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
                            <div v-for="(o, i) in languageOptions" :key="o.lang" class="col rise-in"
                                :style="{ '--i': i }">
                                <LearnChoiceCard :label="o.lang" :sub="o.why" :color="getLangColor(o.lang)"
                                    :active="lang === o.lang" @select="pickLang(o.lang)" />
                            </div>
                        </div>
                        <p v-else class="text-muted-github small mb-0">GitHub lists no language for these projects.</p>
                    </LearnStep>

                    <template v-if="lang">
                        <LearnStep id="learn-projects" class="learn-anchor" :number="3"
                            title="Start with these projects"
                            hint="Smallest first, so they are easier to read. Open one in your browser to explore the code.">
                            <LearnProjectList :projects="starters" />
                        </LearnStep>

                        <LearnStep :number="4" :title="`Learn ${lang}`">
                            <LearnResourceList :lang="lang" />
                        </LearnStep>
                    </template>
                </template>
            </template>
        </template>
    </div>
</template>

<style scoped>
/* Keep a revealed step clear of the sticky navbar when it scrolls into view */
.learn-anchor {
    scroll-margin-top: 6rem;
}
</style>
