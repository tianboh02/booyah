const DESKTOP = 0.55
const PHONE = 0.45

const MIN_LENGTH = 30

export function paced(length) {
    const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 767.98px)').matches
    return Math.max(MIN_LENGTH, Math.round(length * (isPhone ? PHONE : DESKTOP)))
}