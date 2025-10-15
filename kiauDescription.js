window.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);

  // Respect reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set([".box_a", ".box_b", ".box_c", ".box_d", ".box_e"], { opacity: 1, x: 0, scale: 1 });
    return;
  }

  // Animate hero words together with stagger, easing, and slight scale for a softer entrance
  const heroSelector = ".hero-overlay .box_a, .hero-overlay .box_b, .hero-overlay .box_c, .hero-overlay .box_d, .hero-overlay .box_e";
  const heroEls = gsap.utils.toArray(heroSelector);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".hero-overlay",
      start: "top 80%",
      toggleActions: "play none none none",
    }
  });

  tl.fromTo(heroEls, {
    opacity: 0,
    x: (i, el) => {
      // left-side elements start off to the left, right-side off to the right
      if (el.classList.contains('box_a') || el.classList.contains('box_c')) return '-120vw';
      if (el.classList.contains('box_b') || el.classList.contains('box_d')) return '120vw';
      return '0';
    },
    scale: 0.96
  }, {
    opacity: 1,
    x: 0,
    scale: 1,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.18
  });

  // Gentle floating animation for the small "Kiau" word (box_e)
  gsap.to('.box_e', {
    y: -8,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    delay: 0.6
  });

  // Fade-up containers on scroll for nicer flow
  gsap.from('.container', {
    opacity: 0,
    y: 24,
    duration: 0.8,
    ease: 'power2.out',
    stagger: 0.18,
    scrollTrigger: {
      trigger: '#content',
      start: 'top 85%'
    }
  });

});
