const state = {
  catalog: null,
  activeCategory: "all"
};

const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const tabsEl = document.querySelector("[data-category-tabs]");
const gridEl = document.querySelector("[data-product-grid]");
const galleryEl = document.querySelector("[data-gallery-grid]");
const productInput = document.querySelector("[data-product-input]");
const inquiryForm = document.querySelector("[data-inquiry-form]");
const formStatus = document.querySelector("[data-form-status]");

const revealObserver = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach(el => revealObserver.observe(el));

window.addEventListener("scroll", () => {
  header.classList.toggle("is-scrolled", window.scrollY > 18);
});

menuButton?.addEventListener("click", () => {
  const isOpen = mobileNav.classList.toggle("is-open");
  document.body.classList.toggle("menu-open", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

mobileNav?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    mobileNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

document.querySelector("[data-year]").textContent = new Date().getFullYear();

async function initCatalog() {
  try {
    const response = await fetch("./data/catalog.json");
    if (!response.ok) throw new Error("Catalog could not be loaded");
    state.catalog = await response.json();
    renderCategoryTabs();
    renderProducts();
    renderGallery();
  } catch (error) {
    gridEl.innerHTML = `<p class="catalog-error">Product catalog is unavailable right now.</p>`;
    console.error(error);
  }
}

function getAllProducts() {
  return state.catalog.categories.flatMap(category =>
    category.products.map(product => ({ ...product, categoryName: category.name, categoryId: category.id }))
  );
}

function renderCategoryTabs() {
  const categories = [{ id: "all", name: "All Products" }, ...state.catalog.categories];
  tabsEl.innerHTML = "";

  categories.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-tab${state.activeCategory === category.id ? " is-active" : ""}`;
    button.textContent = category.name;
    button.addEventListener("click", () => {
      state.activeCategory = category.id;
      renderCategoryTabs();
      renderProducts();
    });
    tabsEl.appendChild(button);
  });
}

function renderProducts() {
  const products =
    state.activeCategory === "all"
      ? getAllProducts()
      : getAllProducts().filter(product => product.categoryId === state.activeCategory);

  gridEl.innerHTML = "";

  products.forEach((product, index) => {
    const card = document.createElement("article");
    card.className = "product-card reveal";
    card.style.transitionDelay = `${Math.min(index * 35, 180)}ms`;

    const specs = product.specs.map(spec => `<li>${escapeHtml(spec)}</li>`).join("");
    card.innerHTML = `
      <div class="product-media">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" width="1040" height="780" loading="lazy">
      </div>
      <div class="product-body">
        <span class="product-kicker">${escapeHtml(product.categoryName)}</span>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.description)}</p>
        <ul class="spec-list">${specs}</ul>
        <button class="product-enquiry" type="button" data-product-name="${escapeHtml(product.name)}">Enquire Now</button>
      </div>
    `;

    card.querySelector(".product-enquiry").addEventListener("click", event => {
      const productName = event.currentTarget.dataset.productName;
      productInput.value = productName;
      document.querySelector("#contact").scrollIntoView({ behavior: "smooth", block: "start" });
      productInput.focus({ preventScroll: true });
    });

    gridEl.appendChild(card);
    revealObserver.observe(card);
  });
}

function renderGallery() {
  galleryEl.innerHTML = "";

  state.catalog.gallery.forEach(item => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item reveal";
    figure.innerHTML = `
      <img src="${item.image}" alt="${escapeHtml(item.title)}" width="1040" height="780" loading="lazy">
      <figcaption class="gallery-caption">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.category)}</span>
      </figcaption>
    `;
    galleryEl.appendChild(figure);
    revealObserver.observe(figure);
  });
}

inquiryForm?.addEventListener("submit", event => {
  event.preventDefault();
  const formData = new FormData(inquiryForm);
  const inquiry = Object.fromEntries(formData.entries());
  const existing = JSON.parse(localStorage.getItem("awc-inquiries") || "[]");
  existing.push({ ...inquiry, createdAt: new Date().toISOString() });
  localStorage.setItem("awc-inquiries", JSON.stringify(existing));
  formStatus.textContent = "Inquiry saved. Add contact details to connect this form to email or WhatsApp.";
  inquiryForm.reset();
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

initCatalog();
