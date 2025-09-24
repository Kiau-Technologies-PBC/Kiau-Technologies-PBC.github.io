window.addEventListener("DOMContentLoaded", () => {
  gsap.registerPlugin(ScrollTrigger);
  
  gsap.fromTo(".box_a",
    { opacity: 0},
    {
      opacity: 1,
      x: 0,
      duration: 3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".box_a",
        start: "top+=10 30%",
        end: "+=200",
        scrub: 2,
      }
    }
  );

  gsap.fromTo(".box_b",
        { opacity: 0},
    {
      opacity: 1,
      x: 0,
      duration: 3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".box_b",
        start: "top-=140 30%",
        end: "+=200",
        scrub: 2,

      }
    }
  );
  gsap.fromTo(".box_c",
    { opacity: 0},
    {
      opacity: 1,
      x: 0,
      duration: 3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".box_c",
        start: "top center",
        end: "+=100",
        scrub: 2,

      }
    }
  );
    gsap.fromTo(".box_d",
    { opacity: 0},
    {
      opacity: 1,
      x: 0,
      duration: 3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".box_d",
        start: "top center",
        end: "+=100",
        scrub: 2,

      }
    }
  );

  gsap.fromTo(".box_e",
      { opacity: 0},
    {
      opacity: 1,
      x: 0,
      duration: 3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: ".box_d",
        start: "top 30%",
        end: "+=100",
        scrub: 2,

      }
    }
  );


});
