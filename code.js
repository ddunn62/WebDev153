

import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

/* -----------------------------------------------------------
   Supabase Setup (ADD YOUR CREDENTIALS HERE)
   ----------------------------------------------------------- */
const SUPABASE_URL = "https://fdywvhtrwaqrmslsanqe.supabase.co"; // Get from Supabase project settings
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeXd2aHRyd2Fxcm1zbHNhbnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNjQ1ODEsImV4cCI6MjA5OTc0MDU4MX0.uaqTZfF8v7yvEMo4oX3CyJ8DQo4GrHpNs6AM33XDNjw"; // Get from Supabase project settings

// Supabase helper functions
async function supabaseQuery(endpoint, options = {}) {
  // Skip if credentials not set
  if (SUPABASE_URL === "YOUR_SUPABASE_URL" || SUPABASE_KEY === "YOUR_SUPABASE_ANON_KEY") {
    console.warn("Supabase credentials not configured. Skipping database operations.");
    return null;
  }
  
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  
  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) throw new Error(`Supabase error: ${response.statusText}`);
    if (response.status === 204) return null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error("Supabase query error:", error);
    return null;
  }
}

// Get all forum posts from Supabase
async function loadForumPosts() {
  const posts = await supabaseQuery("/posts?order=id.desc");
  if (!posts || !Array.isArray(posts)) return [];
  return posts;
}

// Save a new forum post to Supabase
async function saveForumPost(title, object, imageURL, userId) {
  const post = {
    title,
    object,
    image_url: imageURL,
    user_id: userId,
    created_at: new Date().toISOString(),
    likes: 0,
    comments: []
  };
  
  const response = await supabaseQuery("/posts", {
    method: "POST",
    headers: {
      "Prefer": "return=representation"
    },
    body: JSON.stringify(post)
  });
  
  return Array.isArray(response) ? (response[0] || null) : response;
}

// Update likes for a post
async function updatePostLikes(postId, likes) {
  await supabaseQuery(`/posts?id=eq.${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ likes })
  });
}

async function updatePostComments(postId, comments) {
  await supabaseQuery(`/posts?id=eq.${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ comments })
  });
}

function normalizeComments(rawComments) {
  if (Array.isArray(rawComments)) return rawComments;
  if (typeof rawComments === "string") {
    try {
      const parsed = JSON.parse(rawComments);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function renderCommentList(card, comments) {
  let commentList = card.querySelector(".comment-list");
  if (!commentList) {
    commentList = document.createElement("div");
    commentList.className = "comment-list";
    const commentBox = card.querySelector(".comment-box");
    card.insertBefore(commentList, commentBox || null);
  }

  commentList.innerHTML = "";
  commentList.hidden = comments.length === 0;

  comments.forEach((comment) => {
    const item = document.createElement("div");
    item.className = "comment-item";

    const author = document.createElement("p");
    author.className = "comment-author";
    author.textContent = comment.author || "Anonymous";

    const body = document.createElement("p");
    body.className = "comment-copy";
    body.textContent = comment.text || "";

    item.append(author, body);
    commentList.appendChild(item);
  });
}

const POST_TEXT_FIELD_RULES = {
  "post-object-input": { required: true },
  "post-telescope-input": { required: false },
  "post-mirror-input": { required: false },
  "post-eyepiece-input": { required: false },
  "post-processing-input": { required: false }
};

function validatePostTextInput(input, { required }) {
  if (!input) return true;

  const value = input.value.trim();
  const errorEl = document.getElementById(`${input.id}-error`);
  const allowedChars = /^[a-zA-Z0-9\s.,'"\-–—()/:&+!?]*$/;

  if (required && !value) {
    if (errorEl) errorEl.textContent = "This field is required.";
    return false;
  }

  if (!value) {
    if (errorEl) errorEl.textContent = "";
    return true;
  }

  if (value.length > 50) {
    if (errorEl) errorEl.textContent = "Maximum 50 characters.";
    return false;
  }

  if (/<|>/.test(value)) {
    if (errorEl) errorEl.textContent = "Do not use angle brackets (< or >).";
    return false;
  }

  if (/https?:\/\/|www\./i.test(value)) {
    if (errorEl) errorEl.textContent = "Please remove URLs from this field.";
    return false;
  }

  if (!allowedChars.test(value)) {
    if (errorEl) errorEl.textContent = "Use letters, numbers, spaces, and common punctuation only.";
    return false;
  }

  if (errorEl) errorEl.textContent = "";
  return true;
}

function validateAllPostTextInputs() {
  return Object.entries(POST_TEXT_FIELD_RULES)
    .map(([id, rules]) => validatePostTextInput(document.getElementById(id), rules))
    .every(Boolean);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Clear guest status when user signs in
  const authForm = document.getElementById("auth-form");
  if (authForm) {
    sessionStorage.removeItem("isGuest");
  }

  initAuthStateListener();
  initDropdowns();
  initFeed();
  initPostImageButtonVisibility();
  initCategoryFilters();
  initAboutSlideshow();
  
  // Load forum posts from Supabase if on forum page
  const forumCardList = document.getElementById("forum-card-list");
  if (forumCardList) {
    await loadAndRenderForumPosts();
  }
  
  initForumActions();
  initModals();
  initAuthForms();
  initPostFormValidation();
  initGuestLink();
});

/* -----------------------------------------------------------
   Firebase Auth State Listener
   ----------------------------------------------------------- */
function initAuthStateListener() {
  onAuthStateChanged(auth, (user) => {
    const authButtons = document.querySelectorAll(".auth-btn");
    const logoutBtn = document.getElementById("logout-btn");

    if (user) {
      // User is logged in - hide sign in/sign up, show logout
      authButtons.forEach(btn => btn.style.display = "none");
      if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
      // User is logged out - show sign in/sign up, hide logout
      authButtons.forEach(btn => btn.style.display = "inline-block");
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  });

  // Logout button handler
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (error) {
        console.error("Logout error:", error);
      }
    });
  }
}

/* -----------------------------------------------------------
   Toolbar sort / filter icons
   ----------------------------------------------------------- */
function initDropdowns() {
  const triggers = document.querySelectorAll("[data-dropdown-trigger]");
  triggers.forEach((trigger) => {
    const panelId = trigger.getAttribute("data-dropdown-trigger");
    const panel = document.getElementById(panelId);
    if (!panel) return;

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = panel.classList.contains("open");
      document.querySelectorAll(".dropdown-panel.open").forEach((p) => p.classList.remove("open"));
      if (!isOpen) panel.classList.add("open");
    });

    panel.querySelectorAll("button[data-option]").forEach((btn) => {
      btn.addEventListener("click", () => {
        panel.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        panel.classList.remove("open");
        const label = trigger.closest(".toolbar")?.querySelector(".toolbar-label");
        if (label && trigger.dataset.labelPrefix) {
          label.textContent = `${trigger.dataset.labelPrefix}: ${btn.textContent}`;
        }
      });
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-panel.open").forEach((p) => p.classList.remove("open"));
  });
}

/* -----------------------------------------------------------
   Load Forum Posts from Supabase
   ----------------------------------------------------------- */
async function loadAndRenderForumPosts() {
  const posts = await loadForumPosts();
  const list = document.getElementById("forum-card-list");
  
  if (!posts || posts.length === 0) return; // No posts to render
  
  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "card post-card";
    card.setAttribute("data-post-id", post.id);
    card._comments = normalizeComments(post.comments);
    
    const imgHTML = post.image_url
      ? `<img src="${post.image_url}" alt="${post.title}">`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`;
    
    card.innerHTML = `
      <div class="post-meta-row">
        <span>Posted by: ${post.user_id || "Anonymous"}</span>
        <span>Date: ${new Date(post.created_at).toLocaleDateString()}</span>
      </div>
      <h3>${post.title}</h3>
      <div class="post-body">
        <div class="image-box">${imgHTML}</div>
        <div class="info-div">
          <div class="info-title">Info Div</div>
          <dl>
            <dt>Object</dt><dd>${post.object || "—"}</dd>
            <dt>Telescope</dt><dd>—</dd>
            <dt>Mirror</dt><dd>—</dd>
            <dt>Eyepiece</dt><dd>—</dd>
            <dt>Image Processing</dt><dd>—</dd>
          </dl>
        </div>
      </div>
      <div class="post-actions">
        <button class="action-btn upvote-btn" type="button">▲ <span class="upvote-count">${post.likes || 0}</span></button>
        <button class="action-btn comment-btn" type="button">💬 Comment</button>
        <button class="action-btn share-btn" type="button">↗ Share</button>
      </div>
      <div class="comment-list"></div>
      <div class="comment-box">
        <input type="text" placeholder="Add a comment…">
        <button class="action-btn comment-submit" type="button">Post</button>
      </div>
    `;

    renderCommentList(card, card._comments);
    list.appendChild(card);
  });
}

/* -----------------------------------------------------------
   Feed - Populate with curated NASA/ESA & astronomy content
   ----------------------------------------------------------- */
function initFeed() {
  const container = document.getElementById("feed-container");
  if (!container) return;

  // Sample articles - mix of NASA/ESA (public domain)
  const articles = [
    {
      title: "Where is JWST right now?",
      category: "Deep sky",
      readTime: "Varied",
      summary: "Track the James Webb Space Telescope's current position and status in its orbit around the second Lagrange point (L2). This resource provides real-time updates and visualizations of JWST's journey through space.",
      source: "NASA - James Webb Space Telescope",
      link: "https://science.nasa.gov/mission/webb/what-is-webb-observing/"
    },
    {
      title: "Jupiter's Great Red Spot Continues to Shrink",
      category: "Planetary",
      readTime: "4 min",
      summary: "Jupiter's iconic storm system, larger than Earth, has been gradually reducing in size over the past century. Recent observations suggest the reduction may be stabilizing, but scientists continue monitoring this dynamic feature.",
      source: "NASA - Solar System Exploration",
      link: "https://solarsystem.nasa.gov/"
    },
    {
      title: "Making Peace with Terrible Astrophotography",
      category: "General Info",
      readTime: "6 min",
      summary: "Discover why your astrophotography might not match famous Hubble images and learn to appreciate what your equipment can actually achieve. This article resets expectations and helps you enjoy astrophotography as it really is.",
      source: "Sky and Telescope",
      link: "https://skyandtelescope.org/astronomy-blogs/making-peace-with-terrible-astrophotography/"
    },
    {
      title: "Perseid Meteor Shower Peak Dates This August",
      category: "Planetary",
      readTime: "3 min",
      summary: "The Perseids will reach their peak with up to 100 meteors per hour under ideal dark-sky conditions. Find the best viewing times and locations in your region.",
      source: "NASA - Meteor Watch",
      link: "https://www.nasa.gov/news/watch-the-perseids-meteor-shower/"
    },
    {
      title: "Andromeda Galaxy Structure Revealed by New Survey",
      category: "Deep sky",
      readTime: "6 min",
      summary: "Using advanced imaging techniques, astronomers have mapped the outer regions of our nearest major galaxy neighbor. The findings suggest a more complex structure than previously thought.",
      source: "ESA - Space Science",
      link: "https://www.esa.int/"
    },
    {
      title: "Sky at Night Magazine - Astrophotography & Astronomy Resources",
      category: "General Info",
      readTime: "Variable",
      summary: "BBC's premier astronomy resource offering complete astrophotography guides, in-depth equipment reviews and buyers' guides, DIY astronomy projects, and daily astronomy advice. Browse everything from beginner stargazing tips to advanced imaging techniques.",
      source: "Sky at Night Magazine",
      link: "https://www.skyatnightmagazine.com/"
    }
  ];

  // Render articles
  articles.forEach((article) => {
    const card = document.createElement("article");
    card.className = "card";
    
    // Map category to badge class and data
    const categoryClass = article.category.toLowerCase().replace(/\s+&\s+/g, "-").replace(/\s+/g, "-");
    const categoryData = article.category.toLowerCase();
    
    card.setAttribute("data-category", categoryData);
    
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <h2>${article.title}</h2>
        </div>
        <span class="category-badge ${categoryClass}">${article.category}</span>
      </div>
      <div class="card-meta">
        <span class="read-time-badge">
          <svg class="read-time-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${article.readTime} read
        </span>
      </div>
      <p class="card-body">${article.summary}</p>
      <p style="font-size: 0.85rem; color: rgba(0, 0, 0, 0.6); margin-top: 0.8rem;">
        Source: ${article.source}
      </p>
      <a href="${article.link}" target="_blank" rel="noopener" class="btn btn-primary btn-small" style="margin-top: 0.8rem; display: inline-block;">
        Read Full Article →
      </a>
    `;
    container.appendChild(card);
  });
  
  // feed filter
  initFeedFilter();
}

/* --
   Filter articles by category
   -- */
function initFeedFilter() {
  const filterPanel = document.getElementById("feed-filter-panel");
  if (!filterPanel) return;
  
  const filterButtons = filterPanel.querySelectorAll("button[data-option]");
  const cards = document.querySelectorAll("[data-category]");
  const toolbarLabel = document.querySelector(".toolbar-label");
  
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Update active button
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Update toolbar label
      if (toolbarLabel) {
        toolbarLabel.textContent = btn.textContent.trim();
      }
      
      // Get filter value
      const filter = btn.textContent.trim().toLowerCase();
      
      // Filter cards
      cards.forEach((card) => {
        const shouldShow = filter === "all topics" || card.getAttribute("data-category") === filter;
        card.style.display = shouldShow ? "block" : "none";
      });
    });
  });
}

/* -----------------------------------------------------------
   Hide the forum post button while scrolling down
   ----------------------------------------------------------- */
function initPostImageButtonVisibility() {
  const button = document.querySelector(".post-image-btn");
  if (!button) return;

  let lastScrollTop = 0;

  window.addEventListener("scroll", () => {
    const currentScrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollingDown = currentScrollTop > lastScrollTop && currentScrollTop > 20;

    button.classList.toggle("is-hidden", scrollingDown);
    lastScrollTop = currentScrollTop <= 0 ? 0 : currentScrollTop;
  }, { passive: true });
}

/* -----------------------------------------------------------
   filters (Resource Aggregator)
   ----------------------------------------------------------- */
function initCategoryFilters() {
  const pills = document.querySelectorAll(".category-pill");
  if (!pills.length) return;
  const cards = document.querySelectorAll("[data-category]");

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      const filter = pill.dataset.filter;
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });
}

/* -----------------------------------------------------------
   About Slideshow 
   ----------------------------------------------------------- */
function initAboutSlideshow() {
  const slideshow = document.getElementById("about-slideshow");
  if (!slideshow) return;

  const slides = Array.from(slideshow.querySelectorAll("[data-about-slide]"));
  const prevBtn = document.getElementById("about-prev");
  const nextBtn = document.getElementById("about-next");
  const dots = Array.from(slideshow.querySelectorAll("[data-about-dot]"));
  const countEl = document.getElementById("about-slide-count");

  if (!slides.length) return;

  let currentIndex = 0;

  const render = () => {
    slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === currentIndex);
      slide.setAttribute("aria-hidden", index === currentIndex ? "false" : "true");
    });

    dots.forEach((dot, index) => {
      const isActive = index === currentIndex;
      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    if (countEl) countEl.textContent = `${currentIndex + 1} / ${slides.length}`;

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === slides.length - 1;
  };

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentIndex = Math.max(0, currentIndex - 1);
      render();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentIndex = Math.min(slides.length - 1, currentIndex + 1);
      render();
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const index = Number(dot.dataset.aboutDot);
      if (Number.isNaN(index)) return;
      currentIndex = Math.min(slides.length - 1, Math.max(0, index));
      render();
    });
  });

  render();
}

/* -----------------------------------------------------------
   upvote / comment / share
   ----------------------------------------------------------- */
function initForumActions() {
  const forumCardList = document.getElementById("forum-card-list");
  if (!forumCardList || forumCardList.dataset.bound === "true") return;

  forumCardList.dataset.bound = "true";

  document.querySelectorAll(".post-card").forEach((card) => {
    card._comments = normalizeComments(card._comments);
    renderCommentList(card, card._comments);
  });

  forumCardList.addEventListener("click", async (event) => {
    const upvoteBtn = event.target.closest(".upvote-btn");
    if (upvoteBtn) {
      const countEl = upvoteBtn.querySelector(".upvote-count");
      const upvoted = upvoteBtn.classList.toggle("upvoted");
      let count = parseInt(countEl.textContent, 10) || 0;
      count += upvoted ? 1 : -1;
      countEl.textContent = count;

      const postCard = upvoteBtn.closest(".post-card");
      const postId = postCard?.getAttribute("data-post-id");
      if (postId) {
        await updatePostLikes(postId, count);
      }
      return;
    }

    const commentBtn = event.target.closest(".comment-btn");
    if (commentBtn) {
      const box = commentBtn.closest(".post-card")?.querySelector(".comment-box");
      if (box) box.classList.toggle("open");
      return;
    }

    const shareBtn = event.target.closest(".share-btn");
    if (shareBtn) {
      const original = shareBtn.innerHTML;
      shareBtn.textContent = "Link copied";
      setTimeout(() => (shareBtn.innerHTML = original), 1400);
      return;
    }

    const submitBtn = event.target.closest(".comment-submit");
    if (!submitBtn) return;

    const postCard = submitBtn.closest(".post-card");
    const input = postCard?.querySelector(".comment-box input");
    const commentText = input?.value.trim();
    if (!postCard || !input || !commentText) return;

    const author = auth.currentUser?.email || auth.currentUser?.uid || "Anonymous";
    const comments = normalizeComments(postCard._comments);
    comments.push({
      author,
      text: commentText,
      createdAt: new Date().toISOString()
    });

    postCard._comments = comments;
    renderCommentList(postCard, comments);

    const postId = postCard.getAttribute("data-post-id");
    if (postId) {
      await updatePostComments(postId, comments);
    }

    input.value = "";
    input.placeholder = "Add a comment…";
  });
}

/* -----------------------------------------------------------
   Modals: Post your image
   ----------------------------------------------------------- */
function initModals() {
  document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
    trigger.addEventListener("click", (e) => {
      // Check if user is a guest trying to post an image
      if (trigger.classList.contains("post-image-btn") && sessionStorage.getItem("isGuest") === "true") {
        e.preventDefault();
        window.location.href = "signup.html";
        return;
      }
      const modal = document.getElementById(trigger.dataset.modalOpen);
      if (modal) modal.classList.add("open");
    });
  });

  document.querySelectorAll("[data-modal-close]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const modal = trigger.closest(".modal-overlay");
      if (modal) modal.classList.remove("open");
    });
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // preview for the "Post your image" form
  const fileInput = document.getElementById("image-upload-input");
  const previewBox = document.getElementById("image-upload-preview");
  if (fileInput && previewBox) {
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        previewBox.innerHTML = `<img src="${e.target.result}" alt="Preview of uploaded image">`;
      };
      reader.readAsDataURL(file);
    });
  }

  // Submit using "Post your image"
  const postForm = document.getElementById("post-image-form");
  if (postForm) {
    postForm.addEventListener("submit", async (e) => {
      if (!postForm.checkValidity() || !validateAllPostTextInputs()) {
        postForm.querySelectorAll("input[required]").forEach((input) => {
          const errorEl = document.getElementById(`${input.id}-error`);
          if (!errorEl) return;
          if (!input.validity.valid) {
            if (input.validity.valueMissing) {
              errorEl.textContent = "This field is required.";
            } else {
              errorEl.textContent = "Please enter a valid value.";
            }
          } else {
            errorEl.textContent = "";
          }
        });
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const list = document.getElementById("forum-card-list");
      const objectField = document.getElementById("post-object-input").value || "—";
      const title = `${objectField} capture`.trim().slice(0, 50) || "Untitled capture";
      const telescopeField = document.getElementById("post-telescope-input")?.value || "—";
      const mirrorField = document.getElementById("post-mirror-input")?.value || "—";
      const eyepieceField = document.getElementById("post-eyepiece-input")?.value || "—";
      const processingField = document.getElementById("post-processing-input")?.value || "—";
      const previewImg = previewBox?.querySelector("img");
      
      // Get current user ID from Firebase
      let currentUserId = "Anonymous";
      if (auth.currentUser) {
        currentUserId = auth.currentUser.email || auth.currentUser.uid;
      }
      
      // If image is uploaded, convert to data URL; otherwise use relative path placeholder
      let imageData = null;
      if (previewImg && previewImg.src.startsWith("data:")) {
        imageData = previewImg.src;
      }
      
      // Save post to Supabase
      const newPost = await saveForumPost(title, objectField, imageData, currentUserId);
      
      // Use image HTML for display
      const imgHTML = previewImg
        ? previewImg.outerHTML
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`;

      const card = document.createElement("article");
      card.className = "card post-card";
      card._comments = [];
      if (newPost && newPost.id) {
        card.setAttribute("data-post-id", newPost.id);
      }
      card.innerHTML = `
        <div class="post-meta-row">
          <span>Posted by: ${currentUserId}</span>
          <span>Date: ${new Date().toLocaleDateString()}</span>
        </div>
        <h3>${title}</h3>
        <div class="post-body">
          <div class="image-box">${imgHTML}</div>
          <div class="info-div">
            <div class="info-title">Info Div</div>
            <dl>
              <dt>Object</dt><dd>${objectField}</dd>
              <dt>Telescope</dt><dd>${telescopeField}</dd>
              <dt>Mirror</dt><dd>${mirrorField}</dd>
              <dt>Eyepiece</dt><dd>${eyepieceField}</dd>
              <dt>Image Processing</dt><dd>${processingField}</dd>
            </dl>
          </div>
        </div>
        <div class="post-actions">
          <button class="action-btn upvote-btn" type="button">▲ <span class="upvote-count">0</span></button>
          <button class="action-btn comment-btn" type="button">💬 Comment</button>
          <button class="action-btn share-btn" type="button">↗ Share</button>
        </div>
        <div class="comment-list"></div>
        <div class="comment-box">
          <input type="text" placeholder="Add a comment…">
          <button class="action-btn comment-submit" type="button">Post</button>
        </div>
      `;
      renderCommentList(card, []);
      list.prepend(card);
      postForm.reset();
      previewBox.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`;
      document.getElementById(postForm.dataset.modalId)?.classList.remove("open");
    });

    Object.entries(POST_TEXT_FIELD_RULES).forEach(([id, rules]) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.addEventListener("input", () => validatePostTextInput(input, rules));
      input.addEventListener("blur", () => validatePostTextInput(input, rules));
    });
  }

}

/* -----------------------------------------------------------
   Sign in / Sign up form validation with Firebase
   ----------------------------------------------------------- */
function initAuthForms() {
  const form = document.getElementById("auth-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let valid = true;
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirmPassword = document.getElementById("confirm-password")?.value;
    const isSignUp = confirmPassword !== undefined;

    // Validation
    form.querySelectorAll("input[required]").forEach((input) => {
      const errorEl = document.getElementById(`${input.id}-error`);
      if (!input.value.trim()) {
        valid = false;
        if (errorEl) errorEl.textContent = "This field is required.";
      } else if (errorEl) {
        errorEl.textContent = "";
      }
    });

    // Check password match for sign up
    if (isSignUp && password !== confirmPassword) {
      valid = false;
      const errorEl = document.getElementById("confirm-password-error");
      if (errorEl) errorEl.textContent = "Passwords do not match.";
    }

    if (!valid) return;

    try {
      if (isSignUp) {
        // Sign up with Firebase
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        // Sign in with Firebase
        await signInWithEmailAndPassword(auth, email, password);
      }

      // Clear guest status and redirect to feed
      sessionStorage.removeItem("isGuest");
      window.location.href = "feed.html";
    } catch (error) {
      // Handle Firebase errors
      const errorEl = form.querySelector("[id$='-error']:last-of-type") || 
                     document.getElementById("password-error") ||
                     document.getElementById("email-error");
      
      if (error.code === "auth/email-already-in-use") {
        if (errorEl) errorEl.textContent = "Email already in use.";
      } else if (error.code === "auth/weak-password") {
        if (errorEl) errorEl.textContent = "Password should be at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        if (errorEl) errorEl.textContent = "Invalid email address.";
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        if (errorEl) errorEl.textContent = "Invalid email or password.";
      } else {
        if (errorEl) errorEl.textContent = error.message;
      }
    }
  });
}

function attachSimpleFieldValidation(form) {
  form.querySelectorAll("input[required]").forEach((input) => {
    const errorEl = document.getElementById(`${input.id}-error`);
    const showError = () => {
      if (!errorEl) return;
      if (!input.validity.valid) {
        if (input.validity.valueMissing) {
          errorEl.textContent = "This field is required.";
        } else {
          errorEl.textContent = "Please enter a valid value.";
        }
      } else {
        errorEl.textContent = "";
      }
    };

    input.addEventListener("input", showError);
    input.addEventListener("blur", showError);
  });
}

/* -----------------------------------------------------------
   "Continue as Guest"
   ----------------------------------------------------------- */
function initGuestLink() {
  const guestLink = document.getElementById("guest-link");
  if (guestLink) {
    guestLink.addEventListener("click", (e) => {
      e.preventDefault();
      sessionStorage.setItem("isGuest", "true");
      window.location.href = "feed.html";
    });
  }
}

function initPostFormValidation() {
  const postForm = document.getElementById("post-image-form");
  if (!postForm) return;

  attachSimpleFieldValidation(postForm);

  postForm.addEventListener("submit", (e) => {
    let valid = true;
    postForm.querySelectorAll("input[required]").forEach((input) => {
      const errorEl = document.getElementById(`${input.id}-error`);
      if (!input.validity.valid) {
        valid = false;
        if (input.validity.valueMissing) {
          errorEl.textContent = "This field is required.";
        } else {
          errorEl.textContent = "Please enter a valid value.";
        }
      } else if (errorEl) {
        errorEl.textContent = "";
      }
    });
    if (!validateAllPostTextInputs()) {
      valid = false;
    }
    if (!valid) {
      e.preventDefault();
    }
  });
}
