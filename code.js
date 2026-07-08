

document.addEventListener("DOMContentLoaded", () => {
  initDropdowns();
  initScrollHint();
  initPostImageButtonVisibility();
  initCategoryFilters();
  initForumActions();
  initModals();
  initAuthForms();
  initGuestLink();
});

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
   Scroll hint - fades out after first scroll
   ----------------------------------------------------------- */
function initScrollHint() {
  const hint = document.querySelector(".scroll-hint");
  if (!hint) return;
  window.addEventListener(
    "scroll",
    () => hint.classList.add("faded"),
    { once: true }
  );
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
   upvote / comment / share
   ----------------------------------------------------------- */
function initForumActions() {
  document.querySelectorAll(".upvote-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const countEl = btn.querySelector(".upvote-count");
      const upvoted = btn.classList.toggle("upvoted");
      let count = parseInt(countEl.textContent, 10) || 0;
      count += upvoted ? 1 : -1;
      countEl.textContent = count;
    });
  });

  document.querySelectorAll(".comment-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.closest(".post-card").querySelector(".comment-box");
      if (box) box.classList.toggle("open");
    });
  });

  document.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const original = btn.innerHTML;
      btn.textContent = "Link copied";
      setTimeout(() => (btn.innerHTML = original), 1400);
    });
  });

  document.querySelectorAll(".comment-submit").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.previousElementSibling;
      if (input && input.value.trim()) {
        input.value = "";
        input.placeholder = "Comment posted";
      }
    });
  });
}

/* -----------------------------------------------------------
   Modals: Post your image
   ----------------------------------------------------------- */
function initModals() {
  document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
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

  // Submitting "Post your image" creates a new card to the forum feed
  const postForm = document.getElementById("post-image-form");
  if (postForm) {
    postForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const list = document.getElementById("forum-card-list");
      const title = document.getElementById("post-title-input").value || "Untitled capture";
      const objectField = document.getElementById("post-object-input").value || "—";
      const previewImg = previewBox?.querySelector("img");
      const imgHTML = previewImg
        ? previewImg.outerHTML
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`;

      const card = document.createElement("article");
      card.className = "card post-card";
      card.innerHTML = `
        <div class="post-meta-row">
          <span>Posted by: you</span>
          <span>Date: ${new Date().toLocaleDateString()}</span>
        </div>
        <h3>${title}</h3>
        <div class="post-body">
          <div class="image-box">${imgHTML}</div>
          <div class="info-div">
            <div class="info-title">Info Div</div>
            <dl>
              <dt>Object</dt><dd>${objectField}</dd>
              <dt>Telescope</dt><dd>—</dd>
              <dt>Mirror</dt><dd>—</dd>
              <dt>Eyepiece</dt><dd>—</dd>
              <dt>Image Processing</dt><dd>—</dd>
            </dl>
          </div>
        </div>
        <div class="post-actions">
          <button class="action-btn upvote-btn" type="button">▲ <span class="upvote-count">0</span></button>
          <button class="action-btn comment-btn" type="button">💬 Comment</button>
          <button class="action-btn share-btn" type="button">↗ Share</button>
        </div>
        <div class="comment-box">
          <input type="text" placeholder="Add a comment…">
          <button class="action-btn comment-submit" type="button">Post</button>
        </div>
      `;
      list.prepend(card);
      postForm.reset();
      previewBox.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`;
      document.getElementById(postForm.dataset.modalId)?.classList.remove("open");
      initForumActions();
    });
  }

}

/* -----------------------------------------------------------
   Sign in / Sign up form validation
   ----------------------------------------------------------- */
function initAuthForms() {
  const form = document.getElementById("auth-form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;

    form.querySelectorAll("input[required]").forEach((input) => {
      const errorEl = document.getElementById(`${input.id}-error`);
      if (!input.value.trim()) {
        valid = false;
        if (errorEl) errorEl.textContent = "This field is required.";
      } else if (errorEl) {
        errorEl.textContent = "";
      }
    });

    const pw = document.getElementById("password");
    const confirm = document.getElementById("confirm-password");
    if (pw && confirm) {
      const errorEl = document.getElementById("confirm-password-error");
      if (confirm.value !== pw.value) {
        valid = false;
        if (errorEl) errorEl.textContent = "Passwords do not match.";
      } else if (errorEl) {
        errorEl.textContent = "";
      }
    }

    // Valid credentials 
    if (valid) {
      window.location.href = "feed.html";
    }
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
      window.location.href = "feed.html";
    });
  }
}
