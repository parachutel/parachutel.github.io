const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
const progressBar = document.querySelector(".scroll-progress span");
const navLinks = [...document.querySelectorAll(".primary-nav a[href^='#']")];
const sections = [...document.querySelectorAll("main section[id]")];

function closeMenu() {
  menuToggle?.setAttribute("aria-expanded", "false");
  primaryNav?.classList.remove("open");
  document.body.classList.remove("menu-open");
}

menuToggle?.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  primaryNav?.classList.toggle("open", !open);
  document.body.classList.toggle("menu-open", !open);
});

navLinks.forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

function updatePageState() {
  const scrollTop = window.scrollY;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? scrollTop / scrollable : 0;

  header?.classList.toggle("scrolled", scrollTop > 24);
  if (progressBar) progressBar.style.transform = `scaleX(${progress})`;

  const checkpoint = scrollTop + window.innerHeight * 0.34;
  let current = "top";
  sections.forEach((section) => {
    if (section.offsetTop <= checkpoint) current = section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${current}`);
  });
}

let pageTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (pageTicking) return;
    pageTicking = true;
    requestAnimationFrame(() => {
      updatePageState();
      pageTicking = false;
    });
  },
  { passive: true }
);
updatePageState();

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
);

document.querySelectorAll(".reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min((index % 4) * 55, 165)}ms`;
  revealObserver.observe(element);
});

const initialReveals = document.querySelectorAll(".hero .reveal");
requestAnimationFrame(() => {
  initialReveals.forEach((element, index) => {
    window.setTimeout(() => element.classList.add("is-visible"), 90 + index * 95);
  });
});

document.querySelector("[data-year]").textContent = new Date().getFullYear();

if (window.matchMedia("(pointer: fine)").matches && !reducedMotion) {
  window.addEventListener(
    "pointermove",
    (event) => {
      document.body.style.setProperty("--mouse-x", event.clientX);
      document.body.style.setProperty("--mouse-y", event.clientY);
    },
    { passive: true }
  );

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--tilt-x", `${-y * 2.4}deg`);
      card.style.setProperty("--tilt-y", `${x * 2.4}deg`);
    });

    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });
}

const canvas = document.getElementById("agent-canvas");
const context = canvas?.getContext("2d");

if (canvas && context) {
  const pointer = { x: -1000, y: -1000, active: false };
  const colors = ["#9ef7d2", "#85d9ff", "#ff5c45"];
  let width = 0;
  let height = 0;
  let nodes = [];
  let animationFrame = 0;

  class Agent {
    constructor(index) {
      this.index = index;
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 30;
      this.radius = this.index % 5 === 0 ? 2.2 : 1.35;
      this.velocityX = (Math.random() - 0.5) * 0.22;
      this.velocityY = (Math.random() - 0.5) * 0.22;
      this.color = colors[this.index % colors.length];
      this.phase = Math.random() * Math.PI * 2;
    }

    update(time) {
      const drift = Math.sin(time * 0.00035 + this.phase) * 0.045;
      this.x += this.velocityX + drift;
      this.y += this.velocityY + Math.cos(time * 0.0003 + this.phase) * 0.035;

      if (pointer.active) {
        const dx = this.x - pointer.x;
        const dy = this.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 145 && distance > 0) {
          const force = (145 - distance) / 145;
          this.x += (dx / distance) * force * 0.75;
          this.y += (dy / distance) * force * 0.75;
        }
      }

      if (this.x < -30) this.x = width + 30;
      if (this.x > width + 30) this.x = -30;
      if (this.y < -30) this.y = height + 30;
      if (this.y > height + 30) this.y = -30;
    }

    draw() {
      context.beginPath();
      context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      context.fillStyle = this.color;
      context.globalAlpha = this.index % 5 === 0 ? 0.75 : 0.4;
      context.fill();

      if (this.index % 5 === 0) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
        context.strokeStyle = this.color;
        context.globalAlpha = 0.12;
        context.stroke();
      }
    }
  }

  function resizeCanvas() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    nodes = Array.from({ length: width < 700 ? 18 : 32 }, (_, index) => new Agent(index));
  }

  function drawConnections() {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.hypot(dx, dy);
        const maxDistance = width < 700 ? 125 : 185;

        if (distance < maxDistance) {
          context.beginPath();
          context.moveTo(nodes[i].x, nodes[i].y);
          context.lineTo(nodes[j].x, nodes[j].y);
          context.strokeStyle = "#85d9ff";
          context.globalAlpha = (1 - distance / maxDistance) * 0.105;
          context.lineWidth = 0.7;
          context.stroke();
        }
      }
    }
  }

  function drawFrame(time = 0) {
    context.clearRect(0, 0, width, height);
    nodes.forEach((node) => node.update(time));
    drawConnections();
    nodes.forEach((node) => node.draw());
    context.globalAlpha = 1;
    animationFrame = requestAnimationFrame(drawFrame);
  }

  const hero = document.querySelector(".hero");
  hero?.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  });

  hero?.addEventListener("pointerleave", () => {
    pointer.active = false;
  });

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });

  if (reducedMotion) {
    nodes.forEach((node) => node.draw());
    drawConnections();
  } else {
    animationFrame = requestAnimationFrame(drawFrame);
  }

  document.addEventListener("visibilitychange", () => {
    if (reducedMotion) return;
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
    } else {
      animationFrame = requestAnimationFrame(drawFrame);
    }
  });
}
