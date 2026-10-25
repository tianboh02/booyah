import { describe, it, expect } from 'vitest'
import {
    extendIdeas,
    nextLanguages,
    readCodeUrl,
    reposToExtend,
    starterProjects,
    suggestLanguages,
} from '@/utils/learnPath'
import { MIN_STARS, hardCheckFailures, passesHardChecks } from '@/utils/top5Categories'

describe('test case 1', () => {
    it.todo('testing only')

    //it.todo
    //it.skip
    //it
})

describe('learnPath', () => {
    const category = {
        projects: [
            { name: 'big', language: 'Python', stars: 900, ghUrl: 'https://github.com/a/big' },
            { name: 'small', language: 'Python', stars: 60, ghUrl: 'https://github.com/a/small' },
            { name: 'mid', language: 'Python', stars: 300, ghUrl: 'https://github.com/a/mid' },
            { name: 'fast', language: 'Rust', stars: 120, ghUrl: 'https://github.com/a/fast' },
            { name: 'none', language: null, stars: 80, ghUrl: 'https://github.com/a/none' },
        ],
    }

    it('suggests the most used language in a category first', () => {
        const [first, second] = suggestLanguages(category, { Rust: 2 })
        expect(first).toEqual({ lang: 'Python', why: '3 of 5 projects' })
        expect(second).toEqual({ lang: 'Rust', why: '1 of 5 projects · 2 trending repos this week' })
    })

    it('lists starter projects smallest first', () => {
        expect(starterProjects(category, 'Python').map((p) => p.name)).toEqual(['small', 'mid', 'big'])
    })

    it('never suggests a language the user already uses', () => {
        const next = nextLanguages(['JavaScript', 'TypeScript'], { TypeScript: 3, Go: 1 }, { Python: 40 })
        const langs = next.map((n) => n.lang)
        expect(langs).not.toContain('JavaScript')
        expect(langs).not.toContain('TypeScript')
        expect(langs).toContain('Go')
    })

    it('ignores job tech that is not a language', () => {
        const langs = nextLanguages([], {}, { React: 90, AWS: 80, Rust: 10 }).map((n) => n.lang)
        expect(langs).toEqual(['Rust'])
    })

    it('opens the code in github.dev', () => {
        expect(readCodeUrl('https://github.com/a/big')).toBe('https://github.dev/a/big')
    })
})

describe('your repos vs Discovery', () => {
    const repo = (over) => ({
        id: over.name,
        description: '',
        topics: [],
        language: 'JavaScript',
        stargazers_count: 0,
        fork: false,
        archived: false,
        pushed_at: '2026-01-01T00:00:00Z',
        ...over,
    })
    const parser = repo({ name: 'tiny-parser', description: 'A parser toolkit', stargazers_count: 12 })
    const album = repo({ name: 'photo-album', description: 'Share photos with friends', pushed_at: '2026-06-01T00:00:00Z' })
    const forked = repo({ name: 'forked-parser', description: 'A parser toolkit', fork: true })
    const devtools = {
        id: 'devtools',
        projects: [{ name: 'fastparse', description: 'A blazing parser toolkit', language: 'Rust', ghUrl: 'https://github.com/x/fastparse' }],
    }

    it('picks your repos in the category and skips forks', () => {
        const { matched, repos } = reposToExtend([parser, album, forked], 'devtools')
        expect(matched).toBe(true)
        expect(repos.map((r) => r.name)).toEqual(['tiny-parser'])
    })

    it('falls back to your most recent repos when none fit', () => {
        const { matched, repos } = reposToExtend([parser, album], 'hardware')
        expect(matched).toBe(false)
        expect(repos.map((r) => r.name)).toEqual(['photo-album', 'tiny-parser'])
    })

    it('suggests porting, a similar project and the stars still to go', () => {
        const texts = extendIdeas(parser, devtools, 'Rust').map((i) => i.text)
        expect(texts[0]).toContain('in Rust')
        expect(texts[1]).toContain('fastparse')
        expect(texts).toContain(`${MIN_STARS - 12} more stars and Discovery would list it`)
    })

    it('flags archived repos and missing descriptions', () => {
        const texts = extendIdeas(repo({ name: 'old', archived: true }), devtools, 'JavaScript').map((i) => i.text)
        expect(texts).toContain('Archived. Unarchive it to keep building')
        expect(texts).toContain('Add a description so people (and Discovery) know what it does')
    })

    it('explains why a repo fails the Discovery checks', () => {
        const ok = repo({ name: 'popular', description: 'A parser toolkit', stargazers_count: MIN_STARS })
        expect(hardCheckFailures(ok)).toEqual([])
        expect(passesHardChecks(ok)).toBe(true)
        expect(hardCheckFailures(forked)).toEqual(['fork', 'stars'])
        expect(passesHardChecks(forked)).toBe(false)
    })
})