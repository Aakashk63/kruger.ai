/* ════════════════════════════════════════════════════════════
   KRUGER.AI — Main JavaScript
   Search-Centric Interactions
   ════════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────── PAGE LOADER ──────────────────────── */
(function initLoader() {
  const loader   = document.getElementById('page-loader');
  const bar      = document.getElementById('loader-bar');
  const status   = document.getElementById('loader-status');
  if (!loader) return;

  const steps = [
    { pct: 20,  label: 'Initialising engine...' },
    { pct: 45,  label: 'Loading design system...' },
    { pct: 70,  label: 'Preparing workspace...' },
    { pct: 90,  label: 'Almost ready...' },
    { pct: 100, label: 'Welcome to Kruger.ai' },
  ];

  let step = 0;

  // Start after CSS animations have played the wordmark (~1.9s)
  const kick = setTimeout(() => {
    const interval = setInterval(() => {
      if (step >= steps.length) {
        clearInterval(interval);
        // Dismiss loader
        setTimeout(() => {
          loader.classList.add('hidden');
          // Remove from DOM after transition
          setTimeout(() => loader.remove(), 800);
        }, 400);
        return;
      }
      const { pct, label } = steps[step];
      bar.style.width = pct + '%';
      status.textContent = label;
      step++;
    }, 600); // adjusted for ~5 s total animation

  }, 1900);

  // Safety net — always hide within 5s even if something goes wrong
  window.addEventListener('load', () => {
    clearTimeout(kick);
    bar.style.width = '100%';
    if (status) status.textContent = 'Welcome to Kruger.ai';
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 800);
    }, 600);
  });
})();

/* ──────────────────────── UTILS ──────────────────────── */
const qs = (sel, ctx = document) => ctx.querySelector(sel);

/* ──────────────────────── NAV SCROLL EFFECT ──────────────────────── */
(function initNav() {
  const nav = qs('#main-nav');
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        if (window.scrollY > 40) nav.classList.add('scrolled');
        else nav.classList.remove('scrolled');
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
})();

/* ──────────────────────── INTERSECTION OBSERVER REVEALS ──────────────────────── */
(function initReveal() {
  const els = document.querySelectorAll('.reveal, .testimonial-card, .pricing-card');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));

  // Feature blocks staggered
  const featureBlocks = document.querySelectorAll('.feature-block');
  const fio = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const idx = parseInt(e.target.dataset.index || '0');
        setTimeout(() => {
          e.target.classList.add('visible');
        }, idx * 100);
        fio.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  featureBlocks.forEach(el => fio.observe(el));
})();

/* ══════════════════════════════════════════════════════════════════
   PROMPT TERMINAL ANIMATION
   ══════════════════════════════════════════════════════════════════ */
(function initPromptAnimation() {
  const promptInput = qs('#user-prompt-input');
  const generateBtn = qs('#generate-btn');
  const termProcessing = qs('#terminal-processing');
  const processingFill = qs('#processing-fill');
  const processingLabel = qs('#processing-label');
  const outputGrid = qs('#output-grid');
  const outputCards = document.querySelectorAll('.output-card');
  const heroContent = qs('.hero-content-center');

  if (!promptInput || !generateBtn) return;

  const PROCESSING_STEPS = [
    { label: 'Analyzing prompt brief...', pct: 20 },
    { label: 'Preparing AI generation pipeline...', pct: 45 },
    { label: 'Rendering high-resolution photo output...', pct: 75 },
    { label: 'Finalizing visual details...', pct: 100 },
  ];

  let started = false;

  function runProcessingAnimation(onDone) {
    termProcessing.classList.add('active');
    let step = 0;

    function nextStep() {
      if (step >= PROCESSING_STEPS.length) {
        if (onDone) onDone();
        return;
      }
      const s = PROCESSING_STEPS[step];
      processingLabel.textContent = s.label;
      processingFill.style.width = s.pct + '%';
      step++;
      setTimeout(nextStep, 250);
    }
    nextStep();
  }

  function revealOutputs() {
    outputGrid.style.display = 'flex';
    outputGrid.style.justifyContent = 'center';
    // Trigger reflow
    void outputGrid.offsetHeight;
    outputGrid.classList.add('visible');
    const singleCard = document.getElementById('single-output-card');
    if (singleCard) {
      singleCard.classList.add('revealed');
    }
    
    // Slight scroll down to show the output frame
    if (window.scrollY < 100) {
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }
  }

  const WEBHOOK_URL = 'https://api.agents.snsihub.ai/webhook/5dd7036e-6868-4743-92a5-bb8a3269e96d';
  let latestDecodedImage = null;

  /**
   * Helper function to extract base64 image data URL from any response or string format
   */
  function extractImageDataUrl(data) {
    if (!data) return null;

    // Handle strings
    if (typeof data === 'string') {
      let str = data.trim();

      // Direct Data URL
      if (str.startsWith('data:image/')) {
        return str;
      }

      // Check if JSON formatted string
      if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
        try {
          const parsed = JSON.parse(str);
          const res = extractImageDataUrl(parsed);
          if (res) return res;
        } catch (e) {}
      }

      // Raw base64 header signatures
      if (str.startsWith('/9j/')) return 'data:image/jpeg;base64,' + str;
      if (str.startsWith('iVBORw0KG')) return 'data:image/png;base64,' + str;
      if (str.startsWith('UklGR')) return 'data:image/webp;base64,' + str;
      if (str.startsWith('R0lGOD')) return 'data:image/gif;base64,' + str;
      if (str.startsWith('PHN2Zw')) return 'data:image/svg+xml;base64,' + str;

      // Extract base64 substring inside string like image : "/9j/4AAQ..." or {"image":"/9j/..."}
      const b64Match = str.match(/\/9j\/[A-Za-z0-9+/=]{50,}/) || 
                       str.match(/iVBORw0KG[A-Za-z0-9+/=]{50,}/) || 
                       str.match(/(?:image64|image|img|base64)\s*[:=]\s*"?([A-Za-z0-9+/=]{50,})"?/i);

      if (b64Match) {
        const matchedStr = b64Match[1] || b64Match[0];
        if (matchedStr.startsWith('/9j/')) return 'data:image/jpeg;base64,' + matchedStr;
        if (matchedStr.startsWith('iVBORw0KG')) return 'data:image/png;base64,' + matchedStr;
        return 'data:image/jpeg;base64,' + matchedStr;
      }

      // Raw base64 string fallback check
      const cleanStr = str.replace(/\s+/g, '');
      if (cleanStr.length > 200 && /^[A-Za-z0-9+/=]+$/.test(cleanStr)) {
        return 'data:image/jpeg;base64,' + cleanStr;
      }

      return null;
    }

    // Handle Arrays
    if (Array.isArray(data)) {
      for (const item of data) {
        const res = extractImageDataUrl(item);
        if (res) return res;
      }
      return null;
    }

    // Handle Objects
    if (typeof data === 'object') {
      const priorityKeys = ['image', 'image64', 'img', 'imageData', 'base64', '_RESPONSEDATA', 'items', 'json', 'data', 'url', 'result', 'body'];
      for (const key of priorityKeys) {
        if (data[key] !== undefined && data[key] !== null) {
          const res = extractImageDataUrl(data[key]);
          if (res) return res;
        }
      }

      for (const key of Object.keys(data)) {
        const val = data[key];
        if (val) {
          const res = extractImageDataUrl(val);
          if (res) return res;
        }
      }
    }

    return null;
  }

  /**
   * Render decoded base64 image into single photo output frame
   */
  function renderDecodedImage(imageUrl, promptText) {
    if (!imageUrl) return;

    latestDecodedImage = imageUrl;

    const singleImg = document.getElementById('single-frame-img');
    const placeholder = document.getElementById('single-frame-placeholder');
    const promptTag = document.getElementById('single-frame-prompt');
    const dlBtn = document.getElementById('single-frame-download-btn');
    const subtitle = document.getElementById('single-frame-subtitle');

    if (singleImg) {
      singleImg.src = imageUrl;
      singleImg.style.display = 'block';
    }
    if (placeholder) {
      placeholder.style.display = 'none';
    }
    if (promptTag) {
      promptTag.textContent = `"${promptText || 'Generated AI Photo'}"`;
    }
    if (subtitle) {
      subtitle.textContent = 'High quality decoded photo output';
    }
    const INSTAGRAM_WEBHOOK_URL = 'https://api.agents.snsihub.ai/webhook/ce05c98a-a70e-4c0f-963f-82aed2cb5b8e';
    const igBtn = document.getElementById('single-frame-ig-btn');
    if (igBtn) {
      igBtn.disabled = false;
      igBtn.onclick = async () => {
        const publicUrlInput = document.getElementById('public-url-input');
        const finalUrl = (publicUrlInput && publicUrlInput.value && publicUrlInput.value.startsWith('http')) ? publicUrlInput.value : imageUrl;
        
        const payload = {
          prompt: promptText || 'Generated AI Photo',
          text: promptText || 'Generated AI Photo',
          message: promptText || 'Generated AI Photo',
          publicUrl: finalUrl,
          imageUrl: finalUrl,
          image_url: finalUrl,
          image: finalUrl,
          url: finalUrl,
          platform: 'Instagram',
          action: 'post_to_instagram',
          timestamp: new Date().toISOString()
        };

        const origText = igBtn.innerHTML;
        igBtn.innerHTML = '🚀 Sending to Webhook...';

        try {
          console.log('[Instagram Webhook POST] Sending payload:', payload);
          await fetch(INSTAGRAM_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (e) {
          console.error('[Instagram Webhook POST Error]:', e);
        }

        igBtn.innerHTML = '✅ Sent to Webhook!';
        setTimeout(() => {
          igBtn.innerHTML = origText;
        }, 2500);
      };
    }

    if (dlBtn) {
      dlBtn.disabled = false;
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = 'generated_photo.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    }

    console.log('[Kruger.ai] Decoded base64 image rendered to single frame.');

    // Save image directly into MongoDB Atlas and display Public URL
    saveImageToMongoDBAtlas(imageUrl, promptText);
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise((resolve, reject) => {
        try {
          const successful = document.execCommand('copy');
          textArea.remove();
          if (successful) resolve(); else reject(new Error('copy command failed'));
        } catch (err) {
          textArea.remove();
          reject(err);
        }
      });
    }
  }

  async function saveImageToMongoDBAtlas(imageUrl, promptText) {
    const dbBox = document.getElementById('db-public-url-box');
    const urlInput = document.getElementById('public-url-input');
    const statusLabel = document.getElementById('db-save-status');
    const copyBtn = document.getElementById('copy-public-url-btn');

    if (dbBox) {
      dbBox.style.display = 'block';
    }
    if (statusLabel) {
      statusLabel.textContent = 'Saving to MongoDB Atlas... ⏳';
      statusLabel.style.color = '#fbbf24';
    }
    if (urlInput) {
      urlInput.value = 'Connecting & saving image to Atlas...';
    }

    try {
      // If imageUrl is relative or DOM image, convert to data URL if needed
      let finalImageData = imageUrl;
      if (!finalImageData || (!finalImageData.startsWith('data:') && !finalImageData.startsWith('http'))) {
        const singleImg = document.getElementById('single-frame-img');
        if (singleImg && singleImg.src && singleImg.src.startsWith('data:')) {
          finalImageData = singleImg.src;
        }
      }

      const res = await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: finalImageData,
          prompt: promptText || 'Generated AI Photo',
          title: promptText ? promptText.substring(0, 40) : 'Generated Content'
        })
      });

      const resp = await res.json();
      const itemData = resp.data || resp;
      if (res.ok && itemData && (itemData.publicUrl || itemData._id)) {
        let rawUrl = itemData.publicUrl || `${window.location.origin}/api/images/${itemData._id}/file`;
        
        // Convert any localhost / backend URL to current shareable domain (e.g. Vercel)
        let fullPublicUrl = rawUrl;
        if (rawUrl.startsWith('/')) {
          fullPublicUrl = `${window.location.origin}${rawUrl}`;
        } else if (rawUrl.includes('localhost:') && !window.location.host.includes('localhost')) {
          const path = rawUrl.substring(rawUrl.indexOf('/api/'));
          fullPublicUrl = `${window.location.origin}${path}`;
        }

        if (urlInput) urlInput.value = fullPublicUrl;
        if (statusLabel) {
          statusLabel.textContent = 'Stored in Atlas ✓';
          statusLabel.style.color = '#34d399';
        }

        if (copyBtn) {
          copyBtn.onclick = () => {
            copyTextToClipboard(fullPublicUrl).then(() => {
              const origText = copyBtn.innerHTML;
              copyBtn.innerHTML = '✅ Copied!';
              setTimeout(() => { copyBtn.innerHTML = origText; }, 2000);
            }).catch(err => {
              if (urlInput) {
                urlInput.select();
                document.execCommand('copy');
                const origText = copyBtn.innerHTML;
                copyBtn.innerHTML = '✅ Copied!';
                setTimeout(() => { copyBtn.innerHTML = origText; }, 2000);
              }
            });
          };
        }
      } else {
        if (statusLabel) {
          statusLabel.textContent = 'Atlas Error: ' + (resp.error || 'Failed');
          statusLabel.style.color = '#f87171';
        }
      }
    } catch (err) {
      console.error('[MongoDB Atlas] Error saving image:', err);
      if (statusLabel) {
        statusLabel.textContent = 'Offline / Save Failed';
        statusLabel.style.color = '#cbd5e1';
      }
    }
  }

  async function sendPromptToWebhook(promptText, attachments = []) {
    const payload = {
      prompt: promptText,
      text: promptText,
      message: promptText,
      attachments: attachments,
      timestamp: new Date().toISOString(),
      source: 'Kruger.ai UI'
    };

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Try parsing JSON or text response
        const rawText = await response.text().catch(() => '');
        let data = null;
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          data = rawText;
        }

        console.log('[SNS Agent Webhook] Delivered prompt to SNS Agent Workbench:', { status: response.status, data });
        
        let imageUrl = extractImageDataUrl(data);
        if (!imageUrl && rawText) {
          imageUrl = extractImageDataUrl(rawText);
        }

        if (imageUrl) {
          renderDecodedImage(imageUrl, promptText);
        } else {
          console.log('[SNS Agent Webhook] Response received. Waiting for image payload or parsing object:', data);
        }
        return { success: true, status: response.status, data, imageUrl };
      } else {
        console.warn('[SNS Agent Webhook] Webhook status:', response.status, response.statusText);
        return { success: false, status: response.status };
      }
    } catch (error) {
      console.error('[SNS Agent Webhook] Network/CORS error:', error);
      return { success: false, error: error.message };
    }
  }

  async function runSequence() {
    if (started) return;
    const userPrompt = promptInput.value.trim();
    if (!userPrompt) return;

    started = true;

    // Check if the input prompt itself contains base64 image code
    const directImage = extractImageDataUrl(userPrompt);
    if (directImage) {
      renderDecodedImage(directImage, 'Decoded Input Base64 Image Code');
    }

    // Collect any attached reference files
    const attachmentEls = document.querySelectorAll('#attachments-area .attachment-chip span');
    const attachments = Array.from(attachmentEls).map(el => el.textContent.replace(/^📄\s*/, '').trim());

    // Hide previous outputs & show terminal loader
    outputGrid.classList.remove('visible');
    outputGrid.style.display = 'none';
    const singleCard = document.getElementById('single-output-card');
    if (singleCard) singleCard.classList.remove('revealed');
    termProcessing.classList.add('active');
    processingFill.style.width = '15%';
    processingLabel.textContent = 'Sending prompt to SNS Agent Workbench...';
    
    promptInput.disabled = true;
    generateBtn.disabled = true;
    promptInput.style.opacity = '0.5';
    
    if (heroContent) {
      heroContent.style.transition = 'transform 0.5s ease-out';
      heroContent.style.transform = 'translateY(-40px)';
    }

    // Send HTTP POST request to SNS Agent Workbench webhook and await response
    processingFill.style.width = '45%';
    const webhookResult = await sendPromptToWebhook(userPrompt, attachments);

    processingFill.style.width = '85%';
    if (webhookResult.imageUrl) {
      processingLabel.textContent = '✓ Base64 image code successfully decoded into JPG/PNG image!';
    } else {
      processingLabel.textContent = 'Processing AI generation & campaign assets...';
    }

    processingFill.style.width = '100%';
    setTimeout(() => {
      termProcessing.classList.remove('active');
      revealOutputs();
      promptInput.disabled = false;
      generateBtn.disabled = false;
      promptInput.style.opacity = '1';
      started = false;
    }, 400);
  }
  
  generateBtn.addEventListener('click', () => {
    if (promptInput.value.trim() !== '') {
      runSequence();
    }
  });

  promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && promptInput.value.trim() !== '') {
      runSequence();
    }
  });

  // Working Emoji Popover
  const emojiBtn = qs('#emoji-btn');
  const emojiPopover = qs('#emoji-popover');
  
  if (emojiBtn && emojiPopover) {
    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      emojiPopover.classList.toggle('active');
    });

    emojiPopover.querySelectorAll('.emoji-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const emoji = btn.textContent.trim();
        const start = promptInput.selectionStart || 0;
        const end = promptInput.selectionEnd || 0;
        const text = promptInput.value;
        promptInput.value = text.substring(0, start) + emoji + text.substring(end);
        promptInput.focus();
        const newPos = start + emoji.length;
        promptInput.setSelectionRange(newPos, newPos);
        emojiPopover.classList.remove('active');
      });
    });

    document.addEventListener('click', (e) => {
      if (!emojiPopover.contains(e.target) && e.target !== emojiBtn) {
        emojiPopover.classList.remove('active');
      }
    });
  }

  // Templates Popover and Cards
  const templateBtn = qs('#template-btn');
  const templatesPopover = qs('#templates-popover');
  
  function applyTemplate(promptText) {
    if (!promptInput) return;
    promptInput.value = promptText;
    promptInput.focus();
    if (templatesPopover) templatesPopover.classList.remove('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (templateBtn && templatesPopover) {
    templateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      templatesPopover.classList.toggle('active');
      if (emojiPopover) emojiPopover.classList.remove('active');
    });

    templatesPopover.querySelectorAll('.template-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyTemplate(btn.dataset.prompt || btn.textContent);
      });
    });

    document.addEventListener('click', (e) => {
      if (!templatesPopover.contains(e.target) && e.target !== templateBtn) {
        templatesPopover.classList.remove('active');
      }
    });
  }

  const templateCards = document.querySelectorAll('.template-card');

  // Template detail data
  const templateData = {
    'Product Launch': {
      desc: 'A high-energy, conversion-focused campaign template designed to make your product launch unforgettable across every platform.',
      category: 'Launch Campaign',
      platforms: 'Instagram · YouTube · OOH',
      gradClass: 'template-grad-1'
    },
    'Real Estate': {
      desc: 'An elegant, trust-building real estate campaign to showcase listings and drive open house attendance across social channels.',
      category: 'Real Estate',
      platforms: 'Facebook · Instagram · LinkedIn',
      gradClass: 'template-grad-2'
    },
    'Fashion Lookbook': {
      desc: 'A minimalist, editorial-style template for fashion brands to showcase seasonal collections with premium aesthetic appeal.',
      category: 'Fashion & Lifestyle',
      platforms: 'Instagram · Pinterest · TikTok',
      gradClass: 'template-grad-3'
    },
    'Tech Startup': {
      desc: 'A sleek, forward-thinking template for announcing your new AI feature or product update to tech-savvy audiences.',
      category: 'Tech & Startup',
      platforms: 'LinkedIn · Twitter · YouTube',
      gradClass: 'template-grad-4'
    },
    'Restaurant Menu': {
      desc: 'A mouth-watering, vibrant campaign to showcase your signature dishes and drive foot traffic and online orders.',
      category: 'Food & Beverage',
      platforms: 'Instagram · Facebook · Google',
      gradClass: 'template-grad-5'
    },
    'Winter Travel': {
      desc: 'A cozy, aspirational travel campaign template to inspire bookings and wanderlust across social media channels.',
      category: 'Travel & Tourism',
      platforms: 'Instagram · Pinterest · YouTube',
      gradClass: 'template-grad-6'
    },
    'Fitness Challenge': {
      desc: 'A high-energy motivational template to build community around a fitness challenge, driving signups and engagement.',
      category: 'Health & Fitness',
      platforms: 'Instagram · TikTok · YouTube',
      gradClass: 'template-grad-7'
    },
    'B2B Webinar': {
      desc: 'A professional, authoritative template for inviting B2B audiences to your next webinar, conference, or live event.',
      category: 'B2B Marketing',
      platforms: 'LinkedIn · Email · Twitter',
      gradClass: 'template-grad-1'
    },
    'Skincare Routine': {
      desc: 'An aesthetic, clean-beauty template to showcase your skincare line through relatable routines and expert tips.',
      category: 'Beauty & Wellness',
      platforms: 'Instagram · TikTok · Pinterest',
      gradClass: 'template-grad-2'
    },
    'Music Festival': {
      desc: 'A vibrant, high-impact festival lineup poster template to create buzz, sell tickets, and dominate social feeds.',
      category: 'Entertainment & Events',
      platforms: 'Instagram · Facebook · OOH',
      gradClass: 'template-grad-3'
    }
  };

  // Template Detail Modal Elements
  const tplModal = document.getElementById('tpl-modal');
  const tplOverlay = document.getElementById('tpl-modal-overlay');
  const tplClose = document.getElementById('tpl-modal-close');
  const tplTitle = document.getElementById('tpl-modal-title');
  const tplDescEl = document.getElementById('tpl-modal-desc');
  const tplThumb = document.getElementById('tpl-thumb');
  const tplCategory = document.getElementById('tpl-category');
  const tplPlatforms = document.getElementById('tpl-platforms');
  const tplPromptText = document.getElementById('tpl-prompt-text');
  const tplUseBtn = document.getElementById('tpl-use-btn');
  let activeTplPrompt = '';

  function openTplModal(title, prompt) {
    const data = templateData[title] || {};
    activeTplPrompt = prompt;

    tplTitle.textContent = title;
    tplDescEl.textContent = data.desc || 'A ready-made campaign template. Click "Use This Template" to load it into the search bar.';
    tplCategory.textContent = data.category || 'Campaign';
    tplPlatforms.textContent = data.platforms || 'Multi-Platform';
    tplPromptText.textContent = '"' + prompt + '"';

    // Apply gradient to thumb
    tplThumb.className = 'tpl-preview-thumb ' + (data.gradClass || 'template-grad-1');

    tplOverlay.classList.add('open');
    // Use rAF to trigger CSS transition after display:flex kicks in
    tplModal.style.display = 'flex';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tplModal.classList.add('open');
      });
    });
    tplModal.setAttribute('aria-hidden', 'false');
    tplOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeTplModal() {
    tplModal.classList.remove('open');
    tplOverlay.classList.remove('open');
    tplModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    setTimeout(() => { tplModal.style.display = 'none'; }, 350);
  }

  if (tplClose) tplClose.addEventListener('click', closeTplModal);
  if (tplOverlay) tplOverlay.addEventListener('click', closeTplModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tplModal && tplModal.classList.contains('open')) closeTplModal();
  });

  if (tplUseBtn) {
    tplUseBtn.addEventListener('click', () => {
      applyTemplate(activeTplPrompt);
      closeTplModal();
    });
  }

  // Wire up template cards to open detail modal (not direct apply)
  templateCards.forEach(card => {
    card.addEventListener('click', () => {
      const h4 = card.querySelector('h4');
      const title = h4 ? h4.textContent.trim() : 'Template';
      const prompt = card.dataset.prompt || title;
      openTplModal(title, prompt);
    });
  });


  // Working File Attachment
  const attachBtn = qs('#attach-btn');
  const fileInput = qs('#reference-file-input');
  const attachmentsArea = qs('#attachments-area');

  if (attachBtn && fileInput && attachmentsArea) {
    attachBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      files.forEach(file => {
        const chip = document.createElement('div');
        chip.className = 'attachment-chip';
        chip.innerHTML = `
          <span>📄 ${file.name}</span>
          <button type="button" class="remove-file" aria-label="Remove file">✕</button>
        `;
        
        chip.querySelector('.remove-file').addEventListener('click', () => {
          chip.remove();
        });

        attachmentsArea.appendChild(chip);
      });
      // Reset input value so same file can be uploaded again
      fileInput.value = '';
    });
  }
})();

/* ══════════════════════════════════════════════════════════════════
   SIGN IN MODAL LOGIC
   ══════════════════════════════════════════════════════════════════ */
(function initSignIn() {
  const signinBtn = qs('#nav-signin');
  const loginBtn  = qs('#nav-login');
  const signinModal = qs('#signin-modal');
  const loginModal = qs('#login-modal');
  const signinCloseBtn = qs('#modal-close');
  const loginCloseBtn = qs('#login-modal-close');
  const signinForm = qs('#signin-form');
  const loginForm = qs('#login-form');
  const nameInput = qs('#signin-name');
  const loginEmailInput = qs('#login-email');
  const headline = qs('#main-headline');

  // Ensure elements exist
  if (!signinBtn || !signinModal) return;

  let isSignedIn = false;

  function openSigninModal(e) {
    e.preventDefault();
    signinModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (nameInput) nameInput.focus();
  }

  function openLoginModal(e) {
    e.preventDefault();
    if (!loginModal) return;
    loginModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (loginEmailInput) loginEmailInput.focus();
  }

  function closeModals() {
    if (signinModal) signinModal.setAttribute('aria-hidden', 'true');
    if (loginModal) loginModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function signOut() {
    isSignedIn = false;
    // Restore original headline
    if (headline) {
      headline.innerHTML = `What do you want to<br /><span class="text-gradient">create today?</span>`;
    }
    // Restore buttons to initial state
    signinBtn.textContent = 'Sign In';
    signinBtn.style.display = 'inline-flex';
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    
    // Clear the form fields
    if (nameInput) nameInput.value = '';
    const emailInput = qs('#signin-email');
    const passInput  = qs('#signin-password');
    if (emailInput) emailInput.value = '';
    if (passInput)  passInput.value  = '';
    
    if (loginEmailInput) loginEmailInput.value = '';
    const loginPassInput = qs('#login-password');
    if (loginPassInput) loginPassInput.value = '';

    // Brief visual flash confirmation
    signinBtn.textContent = 'Signed out ✓';
    signinBtn.style.color = 'rgba(255,255,255,0.5)';
    setTimeout(() => {
      signinBtn.textContent = 'Sign In';
      signinBtn.style.color = '';
    }, 1500);
  }

  // Toggle: Sign In opens modal, Sign Out resets state
  signinBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (isSignedIn) {
      signOut();
    } else {
      openSigninModal(e);
    }
  });

  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isSignedIn) {
        signOut();
      } else {
        openLoginModal(e);
      }
    });
  }

  if (signinCloseBtn) signinCloseBtn.addEventListener('click', closeModals);
  if (loginCloseBtn) loginCloseBtn.addEventListener('click', closeModals);

  signinModal.addEventListener('click', (e) => {
    if (e.target === signinModal) closeModals();
  });

  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeModals();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const sOpen = signinModal.getAttribute('aria-hidden') === 'false';
      const lOpen = loginModal && loginModal.getAttribute('aria-hidden') === 'false';
      if (sOpen || lOpen) {
        closeModals();
      }
    }
  });

  if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput ? nameInput.value.trim() : 'User';
      if (name) {
        isSignedIn = true;
        if (headline) {
          headline.innerHTML = `Hello ${name},<br />what do you want to<br /><span class="text-gradient">create today?</span>`;
        }
        signinBtn.textContent = 'Sign Out';
        if (loginBtn) loginBtn.style.display = 'none';
        closeModals();
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginEmailInput ? loginEmailInput.value.trim() : '';
      if (email) {
        isSignedIn = true;
        const name = email.split('@')[0];
        if (headline) {
          headline.innerHTML = `Welcome back ${name},<br />what do you want to<br /><span class="text-gradient">create today?</span>`;
        }
        signinBtn.textContent = 'Sign Out';
        if (loginBtn) loginBtn.style.display = 'none';
        closeModals();
      }
    });
  }


  // ──────────────────────── SIDE PANEL LOGIC ────────────────────────
  const sidePanel = document.getElementById('side-panel');
  const sidePanelOverlay = document.getElementById('side-panel-overlay');
  const spClose = document.getElementById('sp-close');
  const spPreview = document.getElementById('sp-preview');
  const spName = document.getElementById('sp-name');
  const spDesc = document.getElementById('sp-desc');
  const spDownloadBtn = document.getElementById('sp-download-btn');

  function openSidePanel(title, platform, customImg) {
    if (!sidePanel) return;
    spName.textContent = title || 'Generated Asset';
    spDesc.textContent = 'Platform: ' + (platform || 'Digital');
    
    const imgSrc = customImg || latestDecodedImage;
    if (imgSrc) {
      spPreview.innerHTML = `
        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:16px;">
          <img id="sp-img" src="${imgSrc}" alt="${title}" style="max-width:100%; max-height:420px; border-radius:12px; object-fit:contain; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15);" />
        </div>
      `;
    } else {
      // Create fallback canvas preview
      spPreview.innerHTML = '<canvas id="sp-canvas"></canvas>';
      const canvas = document.getElementById('sp-canvas');
      canvas.width = 800;
      canvas.height = 450;
      const ctx = canvas.getContext('2d');
      
      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, '#2a2a35');
      grad.addColorStop(1, '#111');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title || 'Kruger.ai', canvas.width/2, canvas.height/2);
    }
    
    sidePanel.classList.add('open');
    sidePanelOverlay.classList.add('open');
    document.body.classList.add('modal-open');
  }

  function closeSidePanel() {
    if (!sidePanel) return;
    sidePanel.classList.remove('open');
    sidePanelOverlay.classList.remove('open');
    document.body.classList.remove('modal-open');
  }

  if (spClose) spClose.addEventListener('click', closeSidePanel);
  if (sidePanelOverlay) sidePanelOverlay.addEventListener('click', closeSidePanel);

  if (spDownloadBtn) {
    spDownloadBtn.addEventListener('click', () => {
      const img = document.getElementById('sp-img');
      if (img && img.src) {
        const a = document.createElement('a');
        a.href = img.src;
        const safeName = (spName.textContent || 'sns_agent_generated_image').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = safeName + '.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const canvas = document.getElementById('sp-canvas');
        if (canvas) {
          const url = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = url;
          const safeName = (spName.textContent || 'asset').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          a.download = safeName + '.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    });
  }

  // Make cards clickable
  const cards = document.querySelectorAll('.output-card');
  cards.forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const titleEl = card.querySelector('h3, .card-brand, .card-title, .video-title');
      const tagEl = card.querySelector('.card-tag');
      const title = titleEl ? titleEl.textContent : 'Generated Asset';
      const tag = tagEl ? tagEl.textContent : 'Social Media';
      openSidePanel(title, tag);
    });
  });

})();

/* ══════════════════════════════════════════════════════════════════
   SECTION LABEL & TITLE REVEALS
   ══════════════════════════════════════════════════════════════════ */
(function initSectionReveals() {
  const sectionEls = document.querySelectorAll('.section-features .section-label, .section-features .section-title, .section-features .section-sub, .cta-content .section-label, .cta-headline, .cta-sub');

  sectionEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)';
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.2 });

  sectionEls.forEach(el => io.observe(el));
})();

/* ══════════════════════════════════════════════════════════════════
   SMOOTH SCROLL FOR NAV LINKS
   ══════════════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

/* ══════════════════════════════════════════════════════════════════
   MOBILE NAV TOGGLE
   ══════════════════════════════════════════════════════════════════ */
(function initMobileNav() {
  const hamburger = qs('#nav-hamburger');
  const navLinks = qs('.nav-links');

  if (!hamburger) return;

  let open = false;

  hamburger.addEventListener('click', () => {
    open = !open;
    if (open) {
      navLinks.style.display = 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'fixed';
      navLinks.style.top = '64px';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'rgba(11,11,11,0.96)';
      navLinks.style.backdropFilter = 'blur(20px)';
      navLinks.style.padding = '24px 32px';
      navLinks.style.gap = '20px';
      navLinks.style.borderBottom = '1px solid rgba(255,255,255,0.07)';
      navLinks.style.zIndex = '999';
      hamburger.setAttribute('aria-expanded', 'true');
    } else {
      navLinks.style.display = '';
      hamburger.setAttribute('aria-expanded', 'false');
    }
  });
})();

console.log('Kruger.ai UI Loaded');

/* ══════════════════════════════════════════════════════════════════


/* ══════════════════════════════════════════════════════════════════
   FEATURE BOOK MODAL — Smooth 3D Flip & Non-Mirrored Logic
   ══════════════════════════════════════════════════════════════════ */
(function initBookModal() {
  const overlay     = document.getElementById('book-overlay');
  const modal       = document.getElementById('book-modal');
  const closeBtn    = document.getElementById('book-close');
  const container   = document.getElementById('book-container');
  const prevBtn     = document.getElementById('bk-prev-btn');
  const nextBtn     = document.getElementById('bk-next-btn');
  const dots        = document.querySelectorAll('.bk-dot');
  const sumItems    = document.querySelectorAll('.bk-sum-item');
  const featureBlocks = document.querySelectorAll('.feature-block');
  const getStartedBtn = document.getElementById('bk-get-started');

  const leaves = [
    document.getElementById('leaf-cover'),
    document.getElementById('leaf-0'),
    document.getElementById('leaf-1'),
    document.getElementById('leaf-2'),
    document.getElementById('leaf-3'),
    document.getElementById('leaf-4'),
    document.getElementById('leaf-5')
  ].filter(Boolean);

  if (!overlay || !modal || !container || leaves.length === 0) return;

  // State: -1 = Closed Cover, 0..5 = Feature Pages Flipped
  let currentStep = -1;
  const TOTAL_STEPS = 5; // 0 to 5 features
  let openerElement = null;

  function updateBookState() {
    // Flip leaves & assign z-indexes (no shifts or alignment jumps)
    leaves.forEach((leaf, idx) => {
      const shouldFlip = (currentStep >= idx);

      if (shouldFlip) {
        leaf.classList.add('flipped');
        leaf.style.zIndex = 10 + idx; // Flipped stack: higher index on top of left side
      } else {
        leaf.classList.remove('flipped');
        leaf.style.zIndex = 20 - idx; // Unflipped stack: lower index on top of right side
      }
    });

    // Update controls
    if (prevBtn) prevBtn.disabled = (currentStep <= -1);
    if (nextBtn) {
      nextBtn.disabled = false; // Always clickable so user can finish & return!
      const nextSpan = nextBtn.querySelector('span');
      if (nextSpan) {
        nextSpan.textContent = (currentStep >= TOTAL_STEPS) ? 'Return' : 'Next';
      }
    }

    // Update dots
    dots.forEach(dot => {
      const step = parseInt(dot.dataset.step);
      dot.classList.toggle('active', step === currentStep);
    });
  }

  function setStep(targetStep) {
    if (targetStep > TOTAL_STEPS) {
      closeBookAndReturn();
      return;
    }
    targetStep = Math.max(-1, Math.min(TOTAL_STEPS, targetStep));
    currentStep = targetStep;
    updateBookState();
  }

  function openBook(initialFeatureIndex, customOpener) {
    if (customOpener !== undefined) {
      openerElement = customOpener;
    } else if (typeof initialFeatureIndex === 'number' && featureBlocks[initialFeatureIndex]) {
      openerElement = featureBlocks[initialFeatureIndex];
    } else {
      openerElement = null;
    }

    overlay.classList.add('open');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    if (typeof initialFeatureIndex === 'number' && initialFeatureIndex >= 0) {
      setStep(initialFeatureIndex); // Opens directly to the selected feature!
    } else {
      setStep(-1);
    }
  }

  function closeBook() {
    overlay.classList.remove('open');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  function closeBookAndReturn() {
    closeBook();
    if (openerElement) {
      setTimeout(() => {
        openerElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        openerElement.classList.add('highlight-return');
        setTimeout(() => openerElement.classList.remove('highlight-return'), 1400);
      }, 120);
    }
  }

  // Event Listeners for Feature Cards on page
  featureBlocks.forEach((block, idx) => {
    block.style.cursor = 'pointer';
    block.addEventListener('click', () => {
      openBook(-1); // Always open at the cover so the user can manually flip
    });
  });

  // Clicking Cover Leaf opens feature 0
  const coverLeaf = document.getElementById('leaf-cover');
  if (coverLeaf) {
    coverLeaf.addEventListener('click', (e) => {
      if (currentStep === -1) {
        e.stopPropagation();
        setStep(0);
      }
    });
  }

  // Jump to specific feature from left inside base summary
  sumItems.forEach(item => {
    item.addEventListener('click', () => {
      const jumpIdx = parseInt(item.dataset.jump);
      if (!isNaN(jumpIdx)) setStep(jumpIdx);
    });
  });

  // Prev / Next Buttons
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      setStep(currentStep - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      setStep(currentStep + 1);
    });
  }

  // Dots navigation
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const step = parseInt(dot.dataset.step);
      if (!isNaN(step)) setStep(step);
    });
  });

  // Close actions
  if (closeBtn) closeBtn.addEventListener('click', closeBook);
  if (overlay) overlay.addEventListener('click', closeBook);

  // Close when clicking empty space around the book (outside book-scene)
  if (modal) {
    modal.addEventListener('click', (e) => {
      const bookScene = modal.querySelector('.book-scene');
      if (bookScene && !bookScene.contains(e.target) && e.target !== closeBtn && !closeBtn.contains(e.target)) {
        closeBook();
      }
    });
  }

  if (getStartedBtn) {
    getStartedBtn.addEventListener('click', () => {
      closeBook();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const promptInput = document.getElementById('user-prompt-input');
      if (promptInput) promptInput.focus();
    });
  }

  // Navbar Feature link opens book at cover
  const navFeaturesBtn = document.getElementById('nav-features');
  if (navFeaturesBtn) {
    navFeaturesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openBook(-1, null); // Open at cover and stay in current scroll position
    });
  }

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeBook();
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setStep(currentStep + 1);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setStep(currentStep - 1);
    }
  });

  // ── Drag & Touch Flip Gesture Engine ──
  let isDragging = false;
  let startX = 0;
  let currentDragX = 0;
  const DRAG_THRESHOLD = 35; // minimum px drag to trigger page flip

  const scene = document.querySelector('.book-scene');

  if (scene) {
    scene.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, a, .bk-sum-item')) return;
      isDragging = true;
      startX = e.clientX;
      currentDragX = e.clientX;
      scene.style.cursor = 'grabbing';
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      currentDragX = e.clientX;
    });

    window.addEventListener('pointerup', () => {
      if (!isDragging) return;
      isDragging = false;
      scene.style.cursor = '';
      const diffX = currentDragX - startX;

      if (diffX < -DRAG_THRESHOLD) {
        setStep(currentStep + 1); // Dragged left -> Next Page
      } else if (diffX > DRAG_THRESHOLD) {
        setStep(currentStep - 1); // Dragged right -> Prev Page
      }
    });

    // Touch events for mobile/tablet swipe
    scene.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        currentDragX = e.touches[0].clientX;
        isDragging = true;
      }
    }, { passive: true });

    scene.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        currentDragX = e.touches[0].clientX;
      }
    }, { passive: true });

    scene.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      const diffX = currentDragX - startX;
      if (diffX < -DRAG_THRESHOLD) {
        setStep(currentStep + 1);
      } else if (diffX > DRAG_THRESHOLD) {
        setStep(currentStep - 1);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════
     GALLERY & LIGHTBOX MODAL LOGIC
     ══════════════════════════════════════════════════════════════════ */
  (function initGalleryModal() {
    const navGallery = document.getElementById('nav-gallery');
    const overlay = document.getElementById('gallery-modal-overlay');
    const closeBtn = document.getElementById('gallery-close-btn');
    const grid = document.getElementById('gallery-grid');
    const searchInput = document.getElementById('gallery-search');

    const lightboxOverlay = document.getElementById('lightbox-modal-overlay');
    const lightboxClose = document.getElementById('lightbox-close-btn');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxPrompt = document.getElementById('lightbox-prompt');
    const lightboxUrlDisplay = document.getElementById('lightbox-url-display');
    const lightboxCopyBtn = document.getElementById('lightbox-copy-btn');
    const lightboxDlBtn = document.getElementById('lightbox-dl-btn');

    let allGalleryItems = [];

    function openLightbox(item) {
      if (!lightboxOverlay) return;
      lightboxImg.src = item.publicUrl || item.url;
      lightboxPrompt.textContent = `"${item.prompt || 'Generated AI Photo'}"`;
      lightboxUrlDisplay.textContent = item.publicUrl || `${window.location.origin}${item.url}`;
      lightboxDlBtn.href = item.publicUrl || item.url;

      lightboxCopyBtn.onclick = () => {
        navigator.clipboard.writeText(item.publicUrl || `${window.location.origin}${item.url}`);
        lightboxCopyBtn.textContent = '✅ Copied!';
        setTimeout(() => { lightboxCopyBtn.textContent = '📋 Copy Public URL'; }, 2000);
      };

      lightboxOverlay.style.display = 'flex';
    }

    function closeLightbox() {
      if (lightboxOverlay) lightboxOverlay.style.display = 'none';
    }

    if (lightboxClose) lightboxClose.onclick = closeLightbox;
    if (lightboxOverlay) lightboxOverlay.onclick = (e) => {
      if (e.target === lightboxOverlay) closeLightbox();
    };

    // Make the single photo frame clickable for full lightbox view!
    const singleFrameImg = document.getElementById('single-frame-img');
    if (singleFrameImg) {
      singleFrameImg.style.cursor = 'pointer';
      singleFrameImg.title = 'Click to view full image';
      singleFrameImg.onclick = () => {
        const publicUrlInput = document.getElementById('public-url-input');
        const promptTag = document.getElementById('single-frame-prompt');
        openLightbox({
          publicUrl: publicUrlInput ? publicUrlInput.value : singleFrameImg.src,
          url: singleFrameImg.src,
          prompt: promptTag ? promptTag.textContent.replace(/^"|"$/g, '') : 'Generated AI Photo'
        });
      };
    }

    async function loadGalleryItems() {
      if (!grid) return;
      grid.innerHTML = '<div style="color:#94a3b8; font-size:0.9rem; grid-column: 1/-1; text-align:center; padding: 40px 0;">Loading images from MongoDB Atlas...</div>';

      try {
        const res = await fetch('/api/images');
        const data = await res.json();

        if (Array.isArray(data)) {
          allGalleryItems = data;
          renderGrid(allGalleryItems);
        } else {
          grid.innerHTML = '<div style="color:#f87171; grid-column: 1/-1; text-align:center; padding: 40px 0;">Failed to load gallery items.</div>';
        }
      } catch (err) {
        console.error('Gallery Fetch Error:', err);
        grid.innerHTML = '<div style="color:#f87171; grid-column: 1/-1; text-align:center; padding: 40px 0;">Error connecting to Atlas database.</div>';
      }
    }

    function renderGrid(items) {
      if (!grid) return;
      if (items.length === 0) {
        grid.innerHTML = '<div style="color:#94a3b8; grid-column: 1/-1; text-align:center; padding: 40px 0;">No generated images found in MongoDB Atlas. Generate your first image to populate the gallery!</div>';
        return;
      }

      grid.innerHTML = items.map(item => {
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '';
        return `
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='none'">
            <div style="height: 160px; background: rgba(0,0,0,0.5); position: relative; overflow: hidden; cursor: pointer;" onclick="window.krugerOpenLightbox('${item._id}')">
              <img src="${item.publicUrl}" alt="${item.prompt}" style="width: 100%; height: 100%; object-fit: cover;">
              <span style="position: absolute; top: 8px; right: 8px; background: rgba(16, 185, 129, 0.85); color: #fff; font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; backdrop-filter: blur(4px);">${item.platform || 'Instagram'}</span>
            </div>
            <div style="padding: 14px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <p style="margin: 0; font-size: 0.85rem; font-weight: 600; color: #f8fafc; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.3;">"${item.prompt}"</p>
                <p style="margin: 6px 0 0 0; font-size: 0.75rem; color: #38bdf8; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.publicUrl}</p>
              </div>
              <div style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center; pt-2; border-top: 1px solid rgba(255,255,255,0.08);">
                <span style="font-size: 0.7rem; color: #64748b;">${dateStr}</span>
                <div style="display: flex; gap: 6px;">
                  <button type="button" onclick="window.krugerCopyUrl('${item.publicUrl}', this)" style="background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.4); color: #a5b4fc; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">📋 Copy</button>
                  <button type="button" onclick="window.krugerDelete('${item._id}')" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    window.krugerOpenLightbox = function(id) {
      const item = allGalleryItems.find(i => i._id === id);
      if (item) openLightbox(item);
    };

    window.krugerCopyUrl = function(url, btn) {
      navigator.clipboard.writeText(url);
      const orig = btn.innerHTML;
      btn.innerHTML = '✓ Copied';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    };

    window.krugerDelete = async function(id) {
      if (!confirm('Are you sure you want to delete this image from MongoDB Atlas?')) return;
      try {
        const res = await fetch(`/api/images/${id}`, { method: 'DELETE' });
        if (res.ok) {
          allGalleryItems = allGalleryItems.filter(i => i._id !== id);
          renderGrid(allGalleryItems);
        }
      } catch (err) {
        console.error('Delete error:', err);
      }
    };

    if (searchInput) {
      searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase();
        const filtered = allGalleryItems.filter(item => 
          (item.prompt && item.prompt.toLowerCase().includes(query)) ||
          (item.title && item.title.toLowerCase().includes(query))
        );
        renderGrid(filtered);
      };
    }

    if (navGallery && overlay) {
      navGallery.onclick = (e) => {
        e.preventDefault();
        overlay.style.display = 'flex';
        loadGalleryItems();
      };
    }

    if (closeBtn && overlay) {
      closeBtn.onclick = () => {
        overlay.style.display = 'none';
      };
    }

    if (overlay) {
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      };
    }
  })();

})();

