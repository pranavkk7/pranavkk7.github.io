import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import './styles.css'

gsap.registerPlugin(ScrollTrigger, SplitText)

const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

/* ---------- Things that work with or without motion ---------- */

// The nav gains a frosted bar once the page moves, and turns light over the dark bands.
const nav = $('[data-nav]')
const darkBands = $$('.feature, .contact, .footer')
function updateNav() {
  nav.classList.toggle('is-scrolled', window.scrollY > 24)
  const probe = nav.getBoundingClientRect().bottom - 8
  nav.classList.toggle(
    'on-dark',
    darkBands.some((band) => {
      const r = band.getBoundingClientRect()
      return r.top <= probe && r.bottom >= probe
    }),
  )
}
window.addEventListener('scroll', updateNav, { passive: true })
updateNav()

// The live app dialog: the real Flutter build, loaded only when someone asks for it.
const dialog = $('[data-app-dialog]')
const frame = $('iframe', dialog)
$$('[data-run-app]').forEach((button) =>
  button.addEventListener('click', () => {
    // On a phone the app is better full screen than inside a drawn phone.
    if (window.matchMedia('(max-width: 600px)').matches) {
      window.open(frame.dataset.src, '_blank', 'noopener')
      return
    }
    if (!frame.src) frame.src = frame.dataset.src
    dialog.showModal()
  }),
)
$('[data-close]', dialog).addEventListener('click', () => dialog.close())
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close()
})

// Copy the email address, with a short confirmation on the button.
$$('[data-copy]').forEach((button) =>
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy)
      button.textContent = 'Copied'
    } catch {
      button.textContent = 'Press Ctrl+C'
    }
    setTimeout(() => (button.textContent = 'Copy'), 1800)
  }),
)

// The PolySub sample: a real Japanese clip with PolySub's English subtitles, played with sound only
// when someone asks. It takes the place of the screenshot and pauses if scrolled away.
$$('[data-sample]').forEach((button) => {
  const slot = button.closest('.project-media').querySelector('[data-sample-slot]')
  let video = null
  button.addEventListener('click', () => {
    if (!video) {
      video = document.createElement('video')
      video.src = button.dataset.sample
      video.controls = true
      video.playsInline = true
      video.setAttribute('aria-label', 'A Japanese clip with English subtitles made by PolySub')
      const track = document.createElement('track')
      Object.assign(track, { kind: 'subtitles', src: button.dataset.track, srclang: 'en', label: 'English', default: true })
      video.append(track)
      video.addEventListener('play', () => button.classList.add('is-playing'))
      video.addEventListener('pause', () => button.classList.remove('is-playing'))
      new IntersectionObserver(([entry]) => !entry.isIntersecting && video.pause(), { threshold: 0.2 }).observe(video)
      slot.replaceChildren(video)
    }
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  })
})

// Shows one screen of a phone at a time.
function showScreen(phone, index) {
  $$('.phone-screen', phone).forEach((img, i) => img.classList.toggle('is-on', i === index))
}

/* ---------- Motion ---------- */

const mm = gsap.matchMedia()

mm.add(
  {
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: '(min-width: 901px)',
    mouse: '(pointer: fine)',
  },
  (context) => {
    const { motion, desktop, mouse } = context.conditions

    // The main project's phone follows the story on desktop, with or without motion.
    if (desktop) storyTriggers()
    if (!motion) return // Reduced motion: everything is already in its final place.

    document.documentElement.classList.add('has-motion')

    // Smooth scrolling for mouse wheels and trackpads. Touch screens already scroll smoothly.
    let lenis = null
    let raf = null
    if (mouse) {
      lenis = new Lenis({ autoRaf: false, lerp: 0.09 })
      lenis.on('scroll', ScrollTrigger.update)
      raf = (time) => lenis.raf(time * 1000)
      gsap.ticker.add(raf)
      gsap.ticker.lagSmoothing(0)
    }

    // In-page links glide to their section.
    const onClick = (event) => {
      const link = event.target.closest('a[href^="#"]')
      if (!link) return
      const target = $(link.getAttribute('href'))
      if (!target) return
      event.preventDefault()
      if (lenis) lenis.scrollTo(target, { offset: -40, duration: 1.4 })
      else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 40, behavior: 'smooth' })
    }
    document.addEventListener('click', onClick)
    dialog.addEventListener('close', () => lenis?.start())
    $$('[data-run-app]').forEach((b) => b.addEventListener('click', () => dialog.open && lenis?.stop()))

    // 1. The one load moment, about 1.8 seconds, on a single timeline:
    //    the name's letters ripple up out of their line, the career line follows word by word, the
    //    paragraph comes into focus, the project cards step in, and the phone tilts up and settles
    //    as if set down on the desk. The nav arrives last, once the page is composed.
    // Text is split once the web font has loaded so it breaks where the reader sees it; autoSplit
    // re-measures on resize.
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, paused: true })
    const name = $('[data-split]')
    const role = $('[data-hero-role]')
    const split = SplitText.create(name, {
      type: 'lines,chars',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => {
        gsap.set(name, { visibility: 'visible' })
        if (intro.progress() === 0) {
          intro.from(self.chars, { yPercent: 118, rotate: 4, duration: 1.25, stagger: 0.035 }, 0.05)
        }
      },
    })
    const roleSplit = SplitText.create(role, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) => {
        gsap.set(role, { visibility: 'visible' })
        if (intro.progress() === 0) intro.from(self.words, { yPercent: 110, duration: 1, stagger: 0.035 }, 0.42)
      },
    })
    intro
      .fromTo('.hero-lede', { autoAlpha: 0, y: 14, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1 }, 0.7)
      .fromTo('.hero-index li', { autoAlpha: 0, y: 26, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.07 }, 0.85)
      .set('.hero-index', { opacity: 1 }, 0.85)
      .fromTo('.hero-status', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 1.05)
      .fromTo(
        '[data-hero-device]',
        { autoAlpha: 0, y: 150, rotateX: 26, rotateZ: -4, scale: 0.9, transformPerspective: 1200, transformOrigin: '50% 100%' },
        { autoAlpha: 1, y: 0, rotateX: 0, rotateZ: 0, scale: 1, duration: 1.9, ease: 'expo.out' },
        0.25,
      )
      .from(nav, { y: -18, autoAlpha: 0, duration: 0.9 }, 0.95)
      .add(() => document.documentElement.classList.add('intro-done'))
    // Start once the font is ready, but never keep the hero hidden for long on a slow connection.
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]).then(() => intro.play())

    // After it lands, the phone leans slightly toward the pointer: a small 3D response to the reader.
    if (mouse) {
      const phone = $('.hero-device .phone')
      gsap.set(phone, { transformPerspective: 1100 })
      const rx = gsap.quickTo(phone, 'rotateX', { duration: 0.9, ease: 'power3.out' })
      const ry = gsap.quickTo(phone, 'rotateY', { duration: 0.9, ease: 'power3.out' })
      const hero = $('.hero')
      hero.addEventListener('pointermove', (e) => {
        if (intro.isActive()) return
        const r = hero.getBoundingClientRect()
        ry(((e.clientX - r.left) / r.width - 0.5) * 10)
        rx(-((e.clientY - r.top) / r.height - 0.5) * 7)
      })
      hero.addEventListener('pointerleave', () => {
        rx(0)
        ry(0)
      })
    }

    // The hero phone cycles through screens while it is on screen.
    const hero = $('[data-carousel]')
    let heroIndex = 0
    const heroCount = $$('.phone-screen', hero).length
    const cycle = gsap.delayedCall(4.5, function next() {
      heroIndex = (heroIndex + 1) % heroCount
      showScreen(hero, heroIndex)
      cycle.restart(true)
    })
    ScrollTrigger.create({
      trigger: hero,
      start: 'top bottom',
      end: 'bottom top',
      onToggle: (self) => (self.isActive ? cycle.restart(true) : cycle.pause()),
    })

    // A gentle drift as the hero leaves: the copy rises faster than the phone.
    gsap.to('.hero-copy', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    gsap.to('[data-hero-device]', { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })

    // 2. Big titles assemble word by word as they arrive.
    $$('[data-split-words]').forEach((title) => {
      const words = SplitText.create(title, { type: 'words', mask: 'words' })
      gsap.from(words.words, {
        yPercent: 105,
        duration: 1.2,
        ease: 'expo.out',
        stagger: 0.06,
        scrollTrigger: { trigger: title, start: 'top 85%', once: true },
      })
    })

    // 3. The tablet settles from a slight tilt as it scrolls in.
    gsap.fromTo(
      '[data-tablet] .tablet-frame',
      { scale: 0.9, rotateX: 12, transformPerspective: 1400 },
      { scale: 1, rotateX: 0, ease: 'none', scrollTrigger: { trigger: '[data-tablet]', start: 'top 95%', end: 'top 40%', scrub: true } },
    )

    // 4. Project pictures open from a slim window, and drift inside their frame on scroll.
    $$('[data-reveal]').forEach((media) => {
      gsap.fromTo(
        media,
        { clipPath: 'inset(14% 10% 14% 10% round 24px)' },
        {
          clipPath: 'inset(0% 0% 0% 0% round 16px)',
          duration: 1.5,
          ease: 'expo.out',
          scrollTrigger: { trigger: media, start: 'top 82%', once: true },
        },
      )
      const img = $('[data-zoom]', media)
      if (img) {
        gsap.fromTo(img, { scale: 1.07 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'center center', scrub: true } })
      }
    })

    // 5. The career line draws itself as you read down it.
    gsap.fromTo('[data-path-fill]', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '[data-path]', start: 'top 75%', end: 'bottom 60%', scrub: true } })

    // 6. Solid buttons lean slightly toward the pointer.
    if (mouse) {
      $$('[data-magnetic]').forEach((el) => {
        const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'expo.out' })
        const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'expo.out' })
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect()
          x((e.clientX - r.left - r.width / 2) * 0.25)
          y((e.clientY - r.top - r.height / 2) * 0.35)
        })
        el.addEventListener('pointerleave', () => {
          x(0)
          y(0)
        })
      })
    }

    return () => {
      document.removeEventListener('click', onClick)
      if (raf) gsap.ticker.remove(raf)
      lenis?.destroy()
      split.revert()
      roleSplit.revert()
      document.documentElement.classList.remove('has-motion')
    }
  },
)

// The story: each step that reaches the middle of the screen becomes active and swaps the phone's
// screen; the last step brings in the other two designs beside it.
function storyTriggers() {
  const steps = $$('[data-step]')
  const stage = $('[data-stage]')
  const setStep = (i) => {
    steps.forEach((s, n) => s.classList.toggle('is-active', n === i))
    showScreen(stage, i)
  }
  setStep(0)
  steps.forEach((step, i) =>
    ScrollTrigger.create({
      trigger: step,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && setStep(i),
    }),
  )
}
