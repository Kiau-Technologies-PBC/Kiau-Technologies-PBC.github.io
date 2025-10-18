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

  // Dynamic starting positions based on screen size
  const startOffset = window.innerWidth > 768 ? '120vw' : '50vw';

  // Immediate animation on page load (not scroll-based)
  gsap.fromTo(heroEls, {
    opacity: 0,
    x: (i, el) => {
      // left-side elements start off to the left, right-side off to the right
      if (el.classList.contains('box_a') || el.classList.contains('box_c')) return `-${startOffset}`;
      if (el.classList.contains('box_b') || el.classList.contains('box_d')) return startOffset;
      return '0';
    },
    scale: 0.9
  }, {
    opacity: 1,
    x: 0,
    scale: 1,
    duration: 1.2,
    ease: 'power3.out',
    stagger: 0.2,
    delay: 0.3
  });

  // Gentle floating animation for the small "Kiau" word (box_e)
  gsap.to('.box_e', {
    y: -12,
    duration: 3.5,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut',
    delay: 1.5
  });

  // Parallax effect for element containers
  gsap.to('.element_one', {
    y: -30,
    scrollTrigger: {
      trigger: '.hero-overlay',
      start: 'top top',
      end: 'bottom top',
      scrub: 2
    }
  });

  gsap.to('.element_two', {
    y: -50,
    scrollTrigger: {
      trigger: '.hero-overlay',
      start: 'top top',
      end: 'bottom top',
      scrub: 2
    }
  });

  // Fade-up containers on scroll for nicer flow - improved with individual triggers
  const containers = gsap.utils.toArray('.container');
  containers.forEach((container, index) => {
    gsap.from(container, {
      opacity: 0,
      y: 40,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: container,
        start: 'top 85%',
        end: 'top 60%',
        toggleActions: 'play none none reverse',
        scrub: 0.5
      }
    });
  });

  // Add scale animation for goal list items
  const goalItems = gsap.utils.toArray('.goal-list li');
  if (goalItems.length > 0) {
    // Set initial state to visible
    gsap.set(goalItems, { opacity: 1, x: 0 });
    
    gsap.from(goalItems, {
      opacity: 0,
      x: -30,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.goal-list',
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });
  }

});
