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

    // 1. The one load moment: the headline rises line by line, the copy settles, and the phone
    //    lifts into place with a slight turn, as if set down on the desk.
    // Lines are measured once the web font has loaded, so they break where the reader sees them.
    // autoSplit re-measures if the window is resized mid-animation.
    const intro = gsap.timeline({ defaults: { ease: 'expo.out' }, paused: true })
    const split = SplitText.create('[data-split]', {
      type: 'lines',
      mask: 'lines',
      linesClass: 'line',
      autoSplit: true,
      onSplit: (self) => {
        if (intro.progress() === 0) intro.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.09 }, 0.15)
      },
    })
    intro
      .from(nav, { y: -24, opacity: 0, duration: 1 }, 0)
      .to('[data-hero-fade]', { opacity: 1, duration: 1.1, stagger: 0.08 }, 0.55)
      .from('[data-hero-fade]', { y: 18, duration: 1.1, stagger: 0.08 }, 0.55)
      .fromTo(
        '[data-hero-device]',
        { opacity: 0, y: 90, rotate: -5, scale: 0.94 },
        { opacity: 1, y: 0, rotate: 0, scale: 1, duration: 1.8 },
        0.35,
      )
    document.fonts.ready.then(() => intro.play())

    // The hero phone cycles through screens while it is on screen.
    const hero = $('[data-carousel]')
    let heroIndex = 0
    const heroCount = $$('.phone-screen', hero).length
    const cycle = gsap.delayedCall(3, function next() {
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
      { scale: 0.88, rotateX: 14, transformPerspective: 1400, opacity: 0.4 },
      { scale: 1, rotateX: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: '[data-tablet]', start: 'top 95%', end: 'top 35%', scrub: true } },
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
      const img = $('[data-parallax]', media)
      if (img) {
        gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } })
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
      document.documentElement.classList.remove('has-motion')
    }
  },
)

// The story: each step that reaches the middle of the screen becomes active and swaps the phone's
// screen; the last step brings in the other two designs beside it.
function storyTriggers() {
  const steps = $$('[data-step]')
  const stage = $('[data-stage]')
  const device = $('.story-device')
  const setStep = (i) => {
    steps.forEach((s, n) => s.classList.toggle('is-active', n === i))
    showScreen(stage, i)
    device.classList.toggle('is-trio', i === steps.length - 1)
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
