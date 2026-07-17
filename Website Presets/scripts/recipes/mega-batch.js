'use strict';
const { M, pad2, slug, getPalette } = require('../lib/factory-helpers');
const { RECIPES: batch0437 } = require('./batch-0437-0477');
const { RECIPES: navRecipes } = require('./navigation');
const { RECIPES: embedRecipes } = require('./embed-components');
const { RECIPES: ctaRecipes } = require('./cta');
const { RECIPES: borderRecipes } = require('./borders');
const { RECIPES: bgRecipes } = require('./backgrounds');
const { RECIPES: tipRecipes } = require('./tooltips');
const { RECIPES: countdownRecipes } = require('./countdown');
const { RECIPES: tagRecipes } = require('./tags');

const VARIANTS_14 = new Set(["heroes","buttons","cards","backgrounds","scroll-animations","mouse-effects","cursor-trails","brutalist","split-screens","galleries","carousels","experimental"]);

const CATEGORIES = ["cursor-trails","mouse-effects","ease-in","scroll-animations","image-scroll","rotate-scroll","effects","split-screens","brutalist","heroes","features","footers","hooks","sections","scroll-areas","docks","sidebars","folder-dropdown","menus","navigation","accordions","checkboxes","radio-groups","inputs","textareas","selects","sliders","date-pickers","file-uploads","forms","tooltips","popovers","dialogs","modals","toasts","alerts","notifications","badges","avatars","tags","pagination","tables","empty-states","errors","loaders","icons","links","announcements","auth","cta","clients","testimonials","comparisons","pricing","bios","profiles","ai-chat","calendars","maps","numbers","timers","countdown","images","videos","galleries","carousels","card-shuffles","puzzles","borders","backgrounds","buttons","tabs","dropdowns","toggles","cards","experimental"];

const DESCRIPTORS = {
  "cursor-trails": [
    "paint-trail",
    "particle-follow",
    "text-trail",
    "gradient-comet",
    "ribbon-trail",
    "spark-trail",
    "dot-chain",
    "neon-streak",
    "echo-trail",
    "smoke-trail",
    "star-trail",
    "wave-trail",
    "ink-trail",
    "fire-trail"
  ],
  "mouse-effects": [
    "parallax-image",
    "video-spotlight",
    "button-glow-follow",
    "background-warp",
    "tilt-card",
    "magnetic-cursor",
    "lens-distort",
    "ripple-click",
    "cursor-blend",
    "hover-reveal",
    "spotlight-text",
    "depth-layers",
    "orbit-icons",
    "fluid-bg"
  ],
  "ease-in": [
    "fade-up-stagger",
    "scale-in-grid",
    "blur-in-headline",
    "slide-in-cards",
    "rotate-in",
    "bounce-in",
    "clip-reveal-in",
    "typewriter-in",
    "flip-in",
    "elastic-in",
    "stagger-icons",
    "mask-wipe-in",
    "cascade-list",
    "zoom-blur-in"
  ],
  "scroll-animations": [
    "reveal-on-scroll",
    "pin-fade-section",
    "horizontal-scrub",
    "stacked-cards-unroll",
    "parallax-blocks",
    "scale-on-scroll",
    "text-split-reveal",
    "sticky-counter",
    "image-zoom-scroll",
    "progress-fill",
    "skew-scroll",
    "color-shift",
    "line-draw",
    "clip-path-scroll"
  ],
  "image-scroll": [
    "vertical-stack",
    "horizontal-strip",
    "parallax-layers",
    "fade-sequence",
    "zoom-pan",
    "sticky-gallery",
    "split-reveal",
    "mask-scroll",
    "blur-focus",
    "ken-burns",
    "card-flip-scroll",
    "diagonal-drift",
    "grid-unfold",
    "panorama-scroll"
  ],
  "rotate-scroll": [
    "spin-wheel",
    "flip-cards",
    "orbit-gallery",
    "text-helix",
    "cube-rotate",
    "spiral-path",
    "3d-carousel",
    "rotate-text",
    "pin-wheel",
    "orbit-cards",
    "twist-columns",
    "revolve-badge",
    "helix-images",
    "gyro-scope"
  ],
  "effects": [
    "glass-card",
    "neon-glow",
    "grain-overlay",
    "clip-reveal",
    "holographic",
    "chromatic",
    "liquid-bg",
    "scanlines",
    "aurora",
    "noise-gradient",
    "mesh-blob",
    "prism-light",
    "frosted-panel",
    "glow-border"
  ],
  "split-screens": [
    "vertical-half",
    "diagonal-cut",
    "hover-reveal",
    "sticky-split",
    "asymmetric-grid",
    "curtain-split",
    "color-block",
    "video-text",
    "offset-panels",
    "zigzag-split",
    "glass-divider",
    "animated-split",
    "triple-column",
    "morph-split"
  ],
  "brutalist": [
    "raw-border",
    "offset-stack",
    "mono-grid",
    "marquee-brutal",
    "harsh-type",
    "neon-brutal",
    "checker-block",
    "stamp-card",
    "wire-frame",
    "concrete-slab",
    "tape-label",
    "grid-smash",
    "bold-stack",
    "alert-brutal"
  ],
  "heroes": [
    "centered-cta",
    "split-image",
    "video-bg",
    "gradient-mesh",
    "stats-hero",
    "badge-launch",
    "serif-elegant",
    "saas-nav",
    "dark-corporate",
    "portfolio-intro",
    "trust-grid",
    "collage-hero",
    "type-mask"
  ],
  "features": [
    "icon-grid",
    "alternating",
    "bento-grid",
    "numbered-list",
    "timeline-feat",
    "comparison-feat",
    "video-feat",
    "tabbed-feat",
    "hover-cards",
    "metric-feat",
    "quote-feat",
    "stacked-feat",
    "mosaic-feat"
  ],
  "footers": [
    "minimal-links",
    "newsletter",
    "multi-column",
    "social-bar",
    "sitemap-footer",
    "cta-footer",
    "dark-minimal",
    "gradient-footer",
    "logo-footer",
    "compact-bar",
    "mega-footer",
    "split-footer",
    "badge-footer"
  ],
  "hooks": [
    "stat-counter",
    "quote-pull",
    "logo-strip",
    "badge-row",
    "countdown-hook",
    "video-hook",
    "cta-banner",
    "social-proof",
    "feature-hook",
    "email-hook",
    "gradient-hook",
    "split-hook",
    "icon-hook"
  ],
  "sections": [
    "full-bleed",
    "contained",
    "two-column",
    "band-accent",
    "asymmetric",
    "overlap-section",
    "card-section",
    "grid-section",
    "video-section",
    "timeline-section",
    "faq-section",
    "stats-section",
    "gallery-section"
  ],
  "scroll-areas": [
    "snap-sections",
    "smooth-anchor",
    "progress-bar",
    "parallax-text",
    "horizontal-scroll",
    "fade-sections",
    "sticky-nav-scroll",
    "zoom-sections",
    "reveal-sections",
    "card-stack-scroll",
    "pin-gallery",
    "split-scroll",
    "timeline-scroll"
  ],
  "docks": [
    "mac-dock",
    "bottom-nav",
    "floating-dock",
    "vertical-dock",
    "glass-dock",
    "minimal-dock",
    "labeled-dock",
    "expand-dock",
    "dark-dock",
    "gradient-dock",
    "icon-badge-dock",
    "compact-dock",
    "animated-dock"
  ],
  "sidebars": [
    "collapsible",
    "icon-rail",
    "overlay-drawer",
    "dual-sidebar",
    "gradient-sidebar",
    "floating-sidebar",
    "tabbed-sidebar",
    "mini-sidebar",
    "search-sidebar",
    "nested-sidebar",
    "dark-sidebar",
    "card-sidebar",
    "timeline-sidebar"
  ],
  "folder-dropdown": [
    "tree-folders",
    "accordion-folders",
    "breadcrumb-path",
    "nested-menu",
    "file-list",
    "tag-folders",
    "grid-folders",
    "search-tree",
    "pinned-folders",
    "recent-folders",
    "color-folders",
    "compact-tree",
    "sidebar-tree"
  ],
  "menus": [
    "horizontal-nav",
    "context-menu",
    "hamburger-menu",
    "tab-menu",
    "mega-menu",
    "dropdown-menu",
    "icon-menu",
    "vertical-menu",
    "pill-menu",
    "glass-menu",
    "dark-menu",
    "minimal-menu",
    "footer-menu"
  ],
  "navigation": [
    "sticky-nav",
    "pill-nav",
    "sidebar-nav",
    "breadcrumb-nav",
    "centered-nav",
    "transparent-nav",
    "split-nav",
    "search-nav",
    "mega-nav",
    "mobile-nav",
    "underline-nav",
    "floating-nav",
    "gradient-nav"
  ],
  "accordions": [
    "single-open",
    "icon-accordion",
    "bordered-stack",
    "animated-plus",
    "faq-accordion",
    "card-accordion",
    "minimal-accordion",
    "dark-accordion",
    "nested-accordion",
    "image-accordion",
    "timeline-accordion",
    "compact-accordion",
    "gradient-accordion"
  ],
  "checkboxes": [
    "basic-checkboxes",
    "custom-check",
    "card-checkboxes",
    "indeterminate",
    "toggle-check",
    "switch-check",
    "list-check",
    "inline-check",
    "dark-check",
    "pill-check",
    "icon-check",
    "group-check",
    "animated-check"
  ],
  "radio-groups": [
    "vertical-radios",
    "card-radios",
    "segmented-radio",
    "custom-dot-radio",
    "pill-radio",
    "image-radio",
    "list-radio",
    "inline-radio",
    "dark-radio",
    "toggle-radio",
    "star-radio",
    "price-radio",
    "animated-radio"
  ],
  "inputs": [
    "floating-label",
    "icon-input",
    "inline-validation",
    "password-toggle",
    "search-input",
    "tag-input",
    "currency-input",
    "phone-input",
    "otp-input",
    "dark-input",
    "glass-input",
    "bordered-input",
    "animated-input"
  ],
  "textareas": [
    "auto-grow",
    "char-counter",
    "bordered-minimal",
    "toolbar-textarea",
    "markdown-area",
    "code-area",
    "card-textarea",
    "dark-textarea",
    "lined-textarea",
    "resize-handle",
    "emoji-area",
    "split-area",
    "minimal-area"
  ],
  "selects": [
    "native-select",
    "custom-dropdown",
    "multi-select",
    "searchable-select",
    "icon-select",
    "dark-select",
    "pill-select",
    "grouped-select",
    "image-select",
    "tag-select",
    "inline-select",
    "card-select",
    "animated-select"
  ],
  "sliders": [
    "range-slider",
    "dual-thumb",
    "step-slider",
    "vertical-slider",
    "color-slider",
    "price-slider",
    "volume-slider",
    "timeline-slider",
    "dark-slider",
    "gradient-slider",
    "tick-slider",
    "compare-slider",
    "animated-slider"
  ],
  "date-pickers": [
    "native-date",
    "calendar-grid",
    "date-range",
    "inline-datepicker",
    "month-picker",
    "week-picker",
    "dark-calendar",
    "minimal-date",
    "card-calendar",
    "time-date",
    "year-picker",
    "event-picker",
    "compact-date"
  ],
  "file-uploads": [
    "drag-drop",
    "button-upload",
    "preview-upload",
    "progress-upload",
    "multi-upload",
    "avatar-upload",
    "list-upload",
    "dark-upload",
    "card-upload",
    "cloud-upload",
    "compact-upload",
    "image-grid-upload",
    "status-upload"
  ],
  "forms": [
    "login-form",
    "multi-step",
    "inline-form",
    "fieldset-form",
    "signup-form",
    "contact-form",
    "payment-form",
    "survey-form",
    "dark-form",
    "card-form",
    "split-form",
    "minimal-form",
    "wizard-form"
  ],
  "tooltips": [
    "hover-tip",
    "click-tip",
    "arrow-tip",
    "multi-line-tip",
    "dark-tip",
    "icon-tip",
    "card-tip",
    "animated-tip",
    "position-tip",
    "rich-tip",
    "minimal-tip",
    "glass-tip",
    "badge-tip"
  ],
  "popovers": [
    "click-popover",
    "info-popover",
    "menu-popover",
    "rich-popover",
    "card-popover",
    "dark-popover",
    "form-popover",
    "image-popover",
    "list-popover",
    "confirm-popover",
    "tooltip-popover",
    "animated-popover",
    "minimal-popover"
  ],
  "dialogs": [
    "confirm-dialog",
    "form-dialog",
    "alert-dialog",
    "fullscreen-dialog",
    "image-dialog",
    "dark-dialog",
    "card-dialog",
    "stacked-dialog",
    "drawer-dialog",
    "minimal-dialog",
    "warning-dialog",
    "success-dialog",
    "info-dialog"
  ],
  "modals": [
    "fade-modal",
    "slide-modal",
    "image-modal",
    "nested-modal",
    "video-modal",
    "card-modal",
    "dark-modal",
    "minimal-modal",
    "form-modal",
    "alert-modal",
    "fullscreen-modal",
    "sheet-modal",
    "blur-modal"
  ],
  "toasts": [
    "bottom-toast",
    "top-toast",
    "icon-toast",
    "action-toast",
    "stack-toast",
    "dark-toast",
    "progress-toast",
    "card-toast",
    "minimal-toast",
    "gradient-toast",
    "error-toast",
    "success-toast",
    "info-toast"
  ],
  "alerts": [
    "info-alert",
    "warning-alert",
    "error-alert",
    "success-banner",
    "dismiss-alert",
    "inline-alert",
    "card-alert",
    "dark-alert",
    "bordered-alert",
    "icon-alert",
    "compact-alert",
    "gradient-alert",
    "toast-alert"
  ],
  "notifications": [
    "bell-badge",
    "list-notifications",
    "toast-notification",
    "dropdown-notif",
    "card-notif",
    "dark-notif",
    "minimal-notif",
    "grouped-notif",
    "live-notif",
    "action-notif",
    "avatar-notif",
    "timeline-notif",
    "compact-notif"
  ],
  "badges": [
    "status-badge",
    "count-badge",
    "pill-badge",
    "dot-badge",
    "icon-badge",
    "gradient-badge",
    "outline-badge",
    "animated-badge",
    "stack-badge",
    "dark-badge",
    "minimal-badge",
    "tag-badge",
    "notification-badge"
  ],
  "avatars": [
    "circle-avatar",
    "square-avatar",
    "avatar-group",
    "avatar-status",
    "initials-avatar",
    "image-avatar",
    "stacked-avatars",
    "badge-avatar",
    "ring-avatar",
    "gradient-avatar",
    "large-avatar",
    "compact-avatar",
    "hover-avatar"
  ],
  "tags": [
    "basic-tags",
    "removable-tags",
    "color-tags",
    "icon-tags",
    "pill-tags",
    "grouped-tags",
    "input-tags",
    "dark-tags",
    "minimal-tags",
    "gradient-tags",
    "badge-tags",
    "filter-tags",
    "animated-tags"
  ],
  "pagination": [
    "numbered-pages",
    "prev-next",
    "dot-pagination",
    "load-more",
    "infinite-scroll",
    "compact-pages",
    "dark-pagination",
    "card-pagination",
    "minimal-pagination",
    "jump-pagination",
    "table-pagination",
    "rounded-pagination",
    "gradient-pagination"
  ],
  "tables": [
    "basic-table",
    "striped-table",
    "card-table",
    "sortable-table",
    "compact-table",
    "dark-table",
    "bordered-table",
    "hover-table",
    "responsive-table",
    "sticky-header",
    "minimal-table",
    "zebra-table",
    "action-table"
  ],
  "empty-states": [
    "illustration-empty",
    "icon-empty",
    "search-empty",
    "error-empty",
    "minimal-empty",
    "card-empty",
    "dark-empty",
    "cta-empty",
    "inbox-empty",
    "folder-empty",
    "404-empty",
    "no-results",
    "loading-empty"
  ],
  "errors": [
    "404-page",
    "500-page",
    "inline-error",
    "form-error",
    "network-error",
    "minimal-error",
    "illustrated-error",
    "dark-error",
    "card-error",
    "retry-error",
    "boundary-error",
    "toast-error",
    "full-error"
  ],
  "loaders": [
    "spinner",
    "dots-loader",
    "bar-loader",
    "skeleton",
    "pulse-loader",
    "ring-loader",
    "progress-loader",
    "text-loader",
    "card-skeleton",
    "dark-loader",
    "gradient-loader",
    "orbit-loader",
    "wave-loader"
  ],
  "icons": [
    "icon-grid",
    "animated-icons",
    "stroke-icons",
    "filled-icons",
    "duotone-icons",
    "icon-buttons",
    "icon-list",
    "spin-icons",
    "bounce-icons",
    "gradient-icons",
    "dark-icons",
    "minimal-icons",
    "badge-icons"
  ],
  "links": [
    "underline-link",
    "arrow-link",
    "button-link",
    "icon-link",
    "external-link",
    "nav-link",
    "breadcrumb-link",
    "card-link",
    "gradient-link",
    "minimal-link",
    "dark-link",
    "animated-link",
    "pill-link"
  ],
  "announcements": [
    "top-banner",
    "dismiss-banner",
    "gradient-banner",
    "icon-banner",
    "sticky-banner",
    "minimal-banner",
    "dark-banner",
    "cta-banner",
    "countdown-banner",
    "split-banner",
    "card-banner",
    "compact-banner",
    "alert-banner"
  ],
  "auth": [
    "login-card",
    "signup-card",
    "social-auth",
    "split-auth",
    "minimal-auth",
    "dark-auth",
    "glass-auth",
    "otp-auth",
    "magic-link",
    "password-reset",
    "two-factor",
    "brand-auth",
    "illustrated-auth"
  ],
  "cta": [
    "centered-cta",
    "split-cta",
    "banner-cta",
    "card-cta",
    "gradient-cta",
    "minimal-cta",
    "dark-cta",
    "image-cta",
    "stats-cta",
    "inline-cta",
    "sticky-cta",
    "video-cta",
    "floating-cta"
  ],
  "clients": [
    "logo-row",
    "logo-grid",
    "marquee-logos",
    "card-logos",
    "dark-logos",
    "minimal-logos",
    "gradient-logos",
    "testimonial-logos",
    "badge-logos",
    "stacked-logos",
    "hover-logos",
    "compact-logos",
    "animated-logos"
  ],
  "testimonials": [
    "quote-card",
    "avatar-quote",
    "carousel-quote",
    "grid-quotes",
    "video-quote",
    "minimal-quote",
    "dark-quote",
    "star-quote",
    "stacked-quotes",
    "featured-quote",
    "sidebar-quote",
    "card-quotes",
    "gradient-quote"
  ],
  "comparisons": [
    "feature-table",
    "side-by-side",
    "toggle-compare",
    "card-compare",
    "minimal-compare",
    "dark-compare",
    "highlight-compare",
    "pricing-compare",
    "icon-compare",
    "slider-compare",
    "stack-compare",
    "badge-compare",
    "gradient-compare"
  ],
  "pricing": [
    "three-tier",
    "two-tier",
    "toggle-pricing",
    "card-pricing",
    "minimal-pricing",
    "dark-pricing",
    "featured-tier",
    "table-pricing",
    "slider-pricing",
    "compact-pricing",
    "gradient-pricing",
    "comparison-pricing",
    "enterprise-pricing"
  ],
  "bios": [
    "short-bio",
    "card-bio",
    "timeline-bio",
    "minimal-bio",
    "dark-bio",
    "image-bio",
    "social-bio",
    "quote-bio",
    "skills-bio",
    "compact-bio",
    "gradient-bio",
    "sidebar-bio",
    "team-bio"
  ],
  "profiles": [
    "stats-profile",
    "tabbed-profile",
    "badge-profile",
    "card-profile",
    "minimal-profile",
    "dark-profile",
    "cover-profile",
    "social-profile",
    "compact-profile",
    "gradient-profile",
    "sidebar-profile",
    "avatar-profile",
    "timeline-profile"
  ],
  "ai-chat": [
    "chat-bubbles",
    "chat-input",
    "typing-indicator",
    "sidebar-chat",
    "minimal-chat",
    "dark-chat",
    "card-chat",
    "voice-chat",
    "suggestion-chat",
    "thread-chat",
    "avatar-chat",
    "gradient-chat",
    "compact-chat"
  ],
  "calendars": [
    "month-grid",
    "event-calendar",
    "mini-calendar",
    "week-view",
    "day-view",
    "dark-calendar",
    "minimal-calendar",
    "card-calendar",
    "timeline-calendar",
    "agenda-view",
    "compact-calendar",
    "gradient-calendar",
    "sidebar-calendar"
  ],
  "maps": [
    "static-map",
    "marker-card",
    "location-list",
    "interactive-map",
    "dark-map",
    "minimal-map",
    "card-map",
    "split-map",
    "pin-cluster",
    "route-map",
    "compact-map",
    "gradient-map",
    "sidebar-map"
  ],
  "numbers": [
    "stat-counter",
    "big-number",
    "number-grid",
    "odometer",
    "animated-counter",
    "dark-stats",
    "card-stats",
    "minimal-stats",
    "gradient-stats",
    "ring-stats",
    "timeline-stats",
    "compact-stats",
    "hero-stats"
  ],
  "timers": [
    "stopwatch",
    "pomodoro",
    "circular-timer",
    "interval-timer",
    "count-up",
    "dark-timer",
    "minimal-timer",
    "card-timer",
    "gradient-timer",
    "lap-timer",
    "compact-timer",
    "ring-timer",
    "animated-timer"
  ],
  "countdown": [
    "flip-countdown",
    "simple-countdown",
    "event-countdown",
    "ring-countdown",
    "card-countdown",
    "dark-countdown",
    "minimal-countdown",
    "gradient-countdown",
    "block-countdown",
    "inline-countdown",
    "hero-countdown",
    "compact-countdown",
    "animated-countdown"
  ],
  "images": [
    "rounded-image",
    "polaroid",
    "aspect-ratio",
    "hover-zoom",
    "bordered-image",
    "dark-frame",
    "card-image",
    "gallery-thumb",
    "gradient-frame",
    "minimal-image",
    "stacked-images",
    "mask-image",
    "hero-image"
  ],
  "videos": [
    "autoplay-loop",
    "video-controls",
    "vertical-video",
    "video-poster",
    "card-video",
    "dark-video",
    "minimal-video",
    "hero-video",
    "pip-video",
    "gallery-video",
    "muted-video",
    "overlay-video",
    "compact-video"
  ],
  "galleries": [
    "masonry-grid",
    "lightbox-gallery",
    "horizontal-scroll",
    "caption-gallery",
    "grid-gallery",
    "dark-gallery",
    "minimal-gallery",
    "card-gallery",
    "hover-gallery",
    "filter-gallery",
    "stack-gallery",
    "carousel-gallery",
    "masonry-mix",
    "fullscreen-gallery"
  ],
  "carousels": [
    "slide-carousel",
    "3d-carousel",
    "thumb-carousel",
    "dark-carousel",
    "minimal-carousel",
    "auto-carousel",
    "dot-carousel",
    "vertical-carousel",
    "stack-carousel",
    "infinite-carousel",
    "peek-carousel",
    "gradient-carousel"
  ],
  "card-shuffles": [
    "stack-shuffle",
    "fan-spread",
    "flip-shuffle",
    "rotate-stack",
    "slide-shuffle",
    "grid-shuffle",
    "hover-shuffle",
    "dark-shuffle",
    "minimal-shuffle",
    "3d-shuffle",
    "spread-shuffle",
    "compact-shuffle"
  ],
  "puzzles": [
    "sliding-puzzle",
    "jigsaw-piece",
    "word-scramble",
    "memory-match",
    "tile-flip",
    "number-puzzle",
    "dark-puzzle",
    "minimal-puzzle",
    "card-puzzle",
    "grid-puzzle",
    "drag-puzzle",
    "hint-puzzle",
    "timer-puzzle"
  ],
  "borders": [
    "gradient-border",
    "dashed-border",
    "double-border",
    "animated-border",
    "glow-border",
    "corner-border",
    "dotted-border",
    "thick-border",
    "neon-border",
    "minimal-border",
    "card-border",
    "wave-border",
    "offset-border"
  ],
  "backgrounds": [
    "mesh-gradient",
    "dot-pattern",
    "noise-bg",
    "grid-lines",
    "aurora-bg",
    "wave-bg",
    "blob-bg",
    "stripe-bg",
    "radial-bg",
    "dark-mesh",
    "minimal-bg",
    "animated-bg",
    "glass-bg",
    "gradient-mesh-bg"
  ],
  "buttons": [
    "glow-outline",
    "gradient-fill",
    "icon-arrow",
    "loading-button",
    "press-3d",
    "magnetic-btn",
    "glass-btn",
    "neon-btn",
    "pill-btn",
    "split-btn",
    "ghost-btn",
    "shimmer-btn",
    "icon-only",
    "ripple-btn"
  ],
  "tabs": [
    "vertical-tabs",
    "pill-tabs",
    "card-tabs",
    "underline-tabs",
    "segment-tabs",
    "dark-tabs",
    "minimal-tabs",
    "icon-tabs",
    "animated-tabs",
    "gradient-tabs",
    "bordered-tabs",
    "stack-tabs",
    "floating-tabs"
  ],
  "dropdowns": [
    "basic-dropdown",
    "mega-menu",
    "nested-submenu",
    "animated-chevron",
    "icon-dropdown",
    "dark-dropdown",
    "pill-dropdown",
    "search-dropdown",
    "card-dropdown",
    "minimal-dropdown",
    "split-dropdown",
    "glass-dropdown",
    "multi-dropdown"
  ],
  "toggles": [
    "ios-switch",
    "pill-toggle",
    "checkbox-toggle",
    "slide-toggle",
    "dark-toggle",
    "minimal-toggle",
    "icon-toggle",
    "card-toggle",
    "group-toggle",
    "animated-toggle",
    "gradient-toggle",
    "labeled-toggle",
    "compact-toggle"
  ],
  "cards": [
    "basic-card",
    "image-card",
    "hover-lift",
    "bordered-card",
    "glass-card-ui",
    "dark-card",
    "minimal-card",
    "gradient-card",
    "stat-card",
    "profile-card",
    "pricing-card",
    "overlay-card",
    "stack-card",
    "animated-card"
  ],
  "experimental": [
    "cursor-magnetic",
    "text-scramble",
    "blob-morph",
    "glitch-text",
    "noise-cursor",
    "liquid-text",
    "3d-tilt",
    "particle-bg",
    "kinetic-type",
    "scroll-distort",
    "rgb-split",
    "warp-grid",
    "hologram-card",
    "matrix-rain"
  ]
};

function titleCase(s) {
  return s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function buildVariant(cat, desc, series) {
  const p = getPalette(series);
  const n = series;
  const accent = p.accent;
  const bg = p.bg;
  const surface = p.surface;
  const text = p.text;
  const muted = p.muted;
  return _variant(cat, desc, n, p, accent, bg, surface, text, muted);
}

function _variant(cat, desc, n, p, accent, bg, surface, text, muted) {

  // Category-specific rich presets
  // Media-heavy categories
  if (cat === 'heroes') {
    const heroes = {
      'centered-cta': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text};text-align:center;padding:2rem}h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:800;margin-bottom:1rem}.btn{padding:14px 36px;border:none;border-radius:8px;background:${accent};color:${bg};font-weight:600}`,
        body: `<h1>Build Faster ${n}</h1><p style="color:${muted};margin-bottom:2rem">Ship polished interfaces in minutes</p><button class="btn">Get Started</button>`,
      }),
      'split-image': () => ({
        style: `body{margin:0;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center;background:${bg};color:${text}}.copy{padding:4rem}h1{font-size:3rem;font-weight:800;margin-bottom:1rem}img{width:100%;height:100vh;object-fit:cover}`,
        body: `<div class="copy"><h1>Design Beyond ${n}</h1><p style="color:${muted}">Create stunning experiences</p></div><img src="${M.IMG169}" alt="">`,
      }),
      'video-bg': () => ({
        style: `body{margin:0;min-height:100vh;position:relative;color:#fff;display:grid;place-items:center;text-align:center}video{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:-1}h1{font-size:clamp(2.5rem,6vw,4rem);font-weight:900;position:relative;z-index:1}`,
        body: `<video src="${M.VID169}" autoplay muted loop playsinline></video><div class="overlay"></div><h1>Immersive ${n}</h1>`,
      }),
      'gradient-mesh': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text};text-align:center}h1{font-size:clamp(3rem,8vw,5rem);font-weight:900;background:linear-gradient(135deg,${accent},${muted});-webkit-background-clip:text;-webkit-text-fill-color:transparent}`,
        body: `<div><h1>Gradient ${n}</h1><p style="margin-top:1rem;color:${muted}">Mesh of color and type</p></div>`,
      }),
    };
    if (heroes[desc]) return heroes[desc]();
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text};padding:2rem;text-align:center}h1{font-size:2.5rem;font-weight:800;margin-bottom:1rem}.tag{display:inline-block;padding:6px 14px;border-radius:99px;background:${surface};color:${accent};font-size:.75rem;margin-bottom:1rem;border:1px solid ${accent}}`,
      body: `<span class="tag">Hero ${n}</span><h1>${titleCase(desc)}</h1><p style="color:${muted};max-width:40ch">Variant ${n} — ${desc.replace(/-/g,' ')}</p>`,
    };
  }

  if (cat === 'cursor-trails') {
    const trails = {
      'paint-trail': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};cursor:crosshair}canvas{position:fixed;inset:0;pointer-events:none}`,
        body: '<canvas id="c"></canvas>',
        script: `const c=document.getElementById('c'),x=c.getContext('2d');function r(){c.width=innerWidth;c.height=innerHeight;}r();addEventListener('resize',r);const pts=[];addEventListener('mousemove',e=>{pts.push({x:e.clientX,y:e.clientY});if(pts.length>40)pts.shift();});function d(){x.clearRect(0,0,c.width,c.height);pts.forEach((p,i)=>{x.beginPath();x.arc(p.x,p.y,8-i*.15,0,Math.PI*2);x.fillStyle='hsla('+(i*8+${n*10})+',80%,60%,'+(i/pts.length)+')';x.fill();});requestAnimationFrame(d);}d();`,
      }),
      'particle-follow': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}#d{position:fixed;width:12px;height:12px;background:${accent};border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 20px ${accent}`,
        body: '<div id="d"></div>',
        script: `const d=document.getElementById('d');let mx=innerWidth/2,my=innerHeight/2,x=mx,y=my;addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;});function a(){x+=(mx-x)*.${10+n};y+=(my-y)*.${10+n};d.style.left=x+'px';d.style.top=y+'px';requestAnimationFrame(a);}a();`,
      }),
      'gradient-comet': () => ({
        style: `body{background:${bg};margin:0}canvas{position:fixed;inset:0}`,
        body: '<canvas id="c"></canvas>',
        script: `const c=document.getElementById('c'),g=c.getContext('2d');function r(){c.width=innerWidth;c.height=innerHeight;}r();addEventListener('resize',r);let mx=0,my=0,tx=0,ty=0;addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;});function l(){mx+=(tx-mx)*.15;my+=(ty-my)*.15;g.fillStyle='rgba(0,0,0,.12)';g.fillRect(0,0,c.width,c.height);const gr=g.createRadialGradient(mx,my,0,mx,my,60);gr.addColorStop(0,'${accent}');gr.addColorStop(1,'transparent');g.fillStyle=gr;g.fillRect(mx-60,my-60,120,120);requestAnimationFrame(l);}l();`,
      }),
      'text-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};overflow:hidden;cursor:crosshair}.trail{position:fixed;pointer-events:none;font-family:monospace;font-weight:700;font-size:14px;color:${accent};animation:trail .85s cubic-bezier(.22,.61,.36,1) forwards}@keyframes trail{0%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-90%) scale(.75)}}`,
        body: '<p style="position:fixed;inset:0;display:grid;place-items:center;color:'+accent+';font-family:monospace;opacity:.45;pointer-events:none">Move your cursor</p>',
        script: `const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ';let last=0;addEventListener('mousemove',e=>{const now=Date.now();if(now-last<45)return;last=now;const el=document.createElement('span');el.className='trail';el.textContent=chars[Math.floor(Math.random()*chars.length)];el.style.left=e.clientX+'px';el.style.top=e.clientY+'px';document.body.appendChild(el);setTimeout(()=>el.remove(),900);});`,
      }),
      'spark-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),sparks=[];let mx=innerWidth/2,my=innerHeight/2,pmx=mx,pmy=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);function spawn(x,y,vx,vy){const speed=Math.hypot(vx,vy),count=Math.min(18,Math.max(4,Math.floor(speed/4)));for(let i=0;i<count;i+=1){const a=Math.random()*Math.PI*2,s=(.6+Math.random()*1.4)*(speed*.08+1.2);sparks.push({x,y,vx:vx*.12+Math.cos(a)*s,vy:vy*.12+Math.sin(a)*s,life:1,r:1.2+Math.random()*1.6});}if(sparks.length>420)sparks.splice(0,sparks.length-420);}addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}const vx=mx-pmx,vy=my-pmy;pmx=mx;pmy=my;spawn(mx,my,vx,vy);},{passive:true});function frame(){ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=sparks.length-1;i>=0;i-=1){const s=sparks[i];s.x+=s.vx;s.y+=s.vy;s.vx*=.92;s.vy*=.92;s.life-=.028+(1-s.life)*.008;if(s.life<=.02){sparks.splice(i,1);continue;}const a=Math.max(0,Math.min(1,s.life)),g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,18);g.addColorStop(0,'${accent}8c');g.addColorStop(.25,'${accent}2a');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(s.x-18,s.y-18,36,36);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(.6*a)+')';ctx.fill();}ctx.restore();requestAnimationFrame(frame);}frame();`,
      }),
      'ribbon-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),points=[];let mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}});function ribbonPath(pts){if(pts.length<2)return;const left=[],right=[];for(let i=0;i<pts.length;i+=1){const p=pts[i],prev=pts[i-1]||p,next=pts[i+1]||p,angle=Math.atan2(next.y-prev.y,next.x-prev.x),t=i/(pts.length-1),width=3+t*18,sin=Math.sin(angle),cos=Math.cos(angle);left.push({x:p.x+sin*width,y:p.y-cos*width});right.push({x:p.x-sin*width,y:p.y+cos*width});}ctx.beginPath();ctx.moveTo(left[0].x,left[0].y);for(let i=1;i<left.length;i+=1)ctx.lineTo(left[i].x,left[i].y);for(let i=right.length-1;i>=0;i-=1)ctx.lineTo(right[i].x,right[i].y);ctx.closePath();const head=pts[pts.length-1],tail=pts[0],grad=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);grad.addColorStop(0,'${accent}0a');grad.addColorStop(.55,'${accent}47');grad.addColorStop(1,'${accent}d1');ctx.fillStyle=grad;ctx.fill();}function frame(){cx+=(mx-cx)*.22;cy+=(my-cy)*.22;points.push({x:cx,y:cy});if(points.length>36)points.shift();ctx.fillStyle='rgba(244,244,245,.28)';ctx.fillRect(0,0,canvas.width,canvas.height);ribbonPath(points);requestAnimationFrame(frame);}frame();`,
      }),
      'dot-chain': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),COUNT=28,dots=[];let mx=innerWidth/2,my=innerHeight/2,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);for(let i=0;i<COUNT;i+=1)dots.push({x:mx,y:my});addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}},{passive:true});function frame(){dots[0].x+=(mx-dots[0].x)*.38;dots[0].y+=(my-dots[0].y)*.38;for(let i=1;i<dots.length;i+=1){const prev=dots[i-1],curr=dots[i],ease=.32-i*.004;curr.x+=(prev.x-curr.x)*ease;curr.y+=(prev.y-curr.y)*ease;}ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=dots.length-1;i>=0;i-=1){const p=dots[i],t=i/(dots.length-1),r=3+(1-t)*9,alpha=.18+(1-t)*.72;if(i>0){const next=dots[i-1];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(next.x,next.y);ctx.strokeStyle='${accent}'+Math.round(alpha*35).toString(16).padStart(2,'0');ctx.lineWidth=r*.55;ctx.lineCap='round';ctx.stroke();}const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.4);glow.addColorStop(0,'rgba(255,255,255,'+(alpha*.55)+')');glow.addColorStop(.45,'${accent}'+Math.round(alpha*35).toString(16).padStart(2,'0'));glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*2.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle='${accent}'+Math.round(alpha*255).toString(16).padStart(2,'0');ctx.fill();}requestAnimationFrame(frame);}frame();`,
      }),
      'echo-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),TAPS=10,history=[];let mx=innerWidth/2,my=innerHeight/2,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);for(let i=0;i<80;i+=1)history.push({x:mx,y:my});addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}},{passive:true});function frame(){ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(0,0,canvas.width,canvas.height);history.push({x:mx,y:my});if(history.length>260)history.splice(0,history.length-260);ctx.save();ctx.globalCompositeOperation='multiply';for(let i=0;i<TAPS;i+=1){const idx=history.length-1-i*12,p=history[Math.max(0,idx)],t=i/(TAPS-1),r=18-t*10,a=.38*(1-t);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.globalAlpha=a;ctx.strokeStyle='${accent}';ctx.lineWidth=2.2-t*1.1;ctx.stroke();const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*1.6);g.addColorStop(0,'${accent}');g.addColorStop(1,'transparent');ctx.globalAlpha=a*.35;ctx.fillStyle=g;ctx.fillRect(p.x-r*1.6,p.y-r*1.6,r*3.2,r*3.2);}ctx.restore();ctx.globalAlpha=1;requestAnimationFrame(frame);}frame();`,
      }),
      'smoke-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),puffs=[];let mx=innerWidth/2,my=innerHeight/2,pmx=mx,pmy=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);function spawn(x,y,vx,vy){const speed=Math.min(50,Math.hypot(vx,vy)),count=Math.min(6,Math.max(1,Math.floor(speed/10)));for(let i=0;i<count;i+=1){const a=Math.random()*Math.PI*2,s=(.5+Math.random()*1.1)*(speed*.06+.6);puffs.push({x,y,vx:vx*.02+Math.cos(a)*s,vy:vy*.02+Math.sin(a)*s-(.25+Math.random()*.35),r:14+Math.random()*22,life:1,rot:Math.random()*Math.PI*2,spin:(Math.random()-.5)*.12});}if(puffs.length>220)puffs.splice(0,puffs.length-220);}addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}const vx=mx-pmx,vy=my-pmy;pmx=mx;pmy=my;spawn(mx,my,vx,vy);},{passive:true});function frame(){ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=puffs.length-1;i>=0;i-=1){const p=puffs[i];p.x+=p.vx;p.y+=p.vy;p.vx*=.97;p.vy*=.975;p.rot+=p.spin;p.life-=.015+(1-p.life)*.01;p.r*=1.008;if(p.life<=.02){puffs.splice(i,1);continue;}const a=Math.max(0,Math.min(1,p.life)),rx=p.r*(1.05+Math.sin(p.rot)*.12),ry=p.r*(.92+Math.cos(p.rot)*.16),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(rx,ry));g.addColorStop(0,'rgba(255,255,255,'+(.04*a)+')');g.addColorStop(.35,'${accent}'+Math.round(a*18).toString(16).padStart(2,'0'));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(p.x,p.y,rx,ry,p.rot,0,Math.PI*2);ctx.fill();}ctx.restore();requestAnimationFrame(frame);}frame();`,
      }),
      'star-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),stars=[];let mx=innerWidth/2,my=innerHeight/2,pmx=mx,pmy=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);function spawn(x,y,vx,vy){const speed=Math.min(80,Math.hypot(vx,vy)),count=Math.min(10,Math.max(2,Math.floor(speed/10)));for(let i=0;i<count;i+=1){const ang=Math.atan2(vy,vx)+(Math.random()-.5)*.9,s=(.9+Math.random()*1.6)*(speed*.09+1.4);stars.push({x,y,vx:Math.cos(ang)*s*.55,vy:Math.sin(ang)*s*.55,r:1.2+Math.random()*1.9,life:1,spin:(Math.random()-.5)*.25,a:Math.random()*Math.PI*2});}if(stars.length>420)stars.splice(0,stars.length-420);}function starPath(x,y,r,rot){const spikes=5,step=Math.PI/spikes;ctx.beginPath();for(let i=0;i<spikes*2;i+=1){const rad=i%2===0?r:r*.45,a=rot+i*step,px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();}addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}const vx=mx-pmx,vy=my-pmy;pmx=mx;pmy=my;spawn(mx,my,vx,vy);},{passive:true});function frame(){ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=stars.length-1;i>=0;i-=1){const s=stars[i];s.x+=s.vx;s.y+=s.vy;s.vx*=.92;s.vy*=.92;s.life-=.03+(1-s.life)*.01;s.a+=s.spin;if(s.life<=.02){stars.splice(i,1);continue;}const a=Math.max(0,Math.min(1,s.life)),g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,18);g.addColorStop(0,'${accent}47');g.addColorStop(.35,'rgba(255,255,255,'+(.08*a)+')');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(s.x-18,s.y-18,36,36);ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*2.2,s.y-s.vy*2.2);ctx.strokeStyle='${accent}'+Math.round(a*40).toString(16).padStart(2,'0');ctx.lineWidth=2.2;ctx.lineCap='round';ctx.stroke();starPath(s.x,s.y,3.5+s.r*1.2,s.a);ctx.fillStyle='rgba(255,255,255,'+(.55*a)+')';ctx.fill();starPath(s.x,s.y,3.2+s.r,s.a);ctx.strokeStyle='rgba(255,255,255,'+(.45*a)+')';ctx.lineWidth=1;ctx.stroke();}ctx.restore();requestAnimationFrame(frame);}frame();`,
      }),
      'wave-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),POINTS=60,pts=[];let mx=innerWidth/2,my=innerHeight/2,moved=false,time=0;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);for(let i=0;i<POINTS;i+=1)pts.push({x:mx,y:my});addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}},{passive:true});function frame(){time+=.14;pts[0].x+=(mx-pts[0].x)*.4;pts[0].y+=(my-pts[0].y)*.4;for(let i=1;i<pts.length;i+=1){const prev=pts[i-1],curr=pts[i];curr.x+=(prev.x-curr.x)*.34;curr.y+=(prev.y-curr.y)*.34;}ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='lighter';for(let layer=0;layer<3;layer+=1){ctx.beginPath();for(let i=0;i<pts.length;i+=1){const p=pts[i],t=i/(pts.length-1),next=pts[Math.min(i+1,pts.length-1)],ang=Math.atan2(next.y-p.y,next.x-p.x)+Math.PI/2,amp=Math.sin(time-i*.5+layer*1.7)*(14-t*12),wx=p.x+Math.cos(ang)*amp,wy=p.y+Math.sin(ang)*amp;if(i===0)ctx.moveTo(wx,wy);else ctx.lineTo(wx,wy);}const alpha=.5-layer*.14;ctx.strokeStyle='${accent}'+Math.round(alpha*255).toString(16).padStart(2,'0');ctx.lineWidth=3-layer*.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowBlur=16;ctx.shadowColor='${accent}';ctx.stroke();}ctx.restore();requestAnimationFrame(frame);}frame();`,
      }),
      'ink-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),blobs=[];let mx=innerWidth/2,my=innerHeight/2,pmx=mx,pmy=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);function spawn(x,y,vx,vy){const speed=Math.hypot(vx,vy),count=Math.min(4,Math.max(1,Math.floor(speed/14)+1));for(let i=0;i<count;i+=1){const jitter=(Math.random()-.5)*8;blobs.push({x:x+jitter,y:y+jitter,vx:vx*.05+(Math.random()-.5)*.6,vy:vy*.05+(Math.random()-.5)*.6,r:4+Math.random()*10+Math.min(14,speed*.2),grow:.985+Math.random()*.01,life:1});}if(blobs.length>340)blobs.splice(0,blobs.length-340);}addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}const vx=mx-pmx,vy=my-pmy;pmx=mx;pmy=my;spawn(mx,my,vx,vy);},{passive:true});function frame(){ctx.fillStyle='rgba(0,0,0,.05)';ctx.fillRect(0,0,canvas.width,canvas.height);for(let i=blobs.length-1;i>=0;i-=1){const b=blobs[i];b.x+=b.vx;b.y+=b.vy;b.vx*=.9;b.vy*=.9;b.r*=b.grow;b.life-=.006;if(b.life<=.02||b.r<.4){blobs.splice(i,1);continue;}const a=Math.max(0,Math.min(1,b.life)),g=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);g.addColorStop(0,'${accent}'+Math.round(a*153).toString(16).padStart(2,'0'));g.addColorStop(.7,'${accent}'+Math.round(a*70).toString(16).padStart(2,'0'));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();}requestAnimationFrame(frame);}frame();`,
      }),
      'fire-trail': () => ({
        style: `body{margin:0;min-height:100vh;background:#0b0605;cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:#ff9b42;font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),embers=[];let mx=innerWidth/2,my=innerHeight/2,pmx=mx,pmy=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);function spawn(x,y,vx,vy){const speed=Math.min(60,Math.hypot(vx,vy)),count=Math.min(12,Math.max(4,Math.floor(speed/5)+4));for(let i=0;i<count;i+=1){const a=Math.random()*Math.PI*2,s=Math.random()*1.2;embers.push({x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*8,vx:vx*.06+Math.cos(a)*s,vy:vy*.06+Math.sin(a)*s-(.6+Math.random()*1.1),r:3+Math.random()*7,life:1,decay:.02+Math.random()*.02});}if(embers.length>500)embers.splice(0,embers.length-500);}function fireColor(t,a){if(t>.75)return'rgba(255,246,214,'+a+')';if(t>.5)return'rgba(255,196,84,'+a+')';if(t>.28)return'rgba(255,120,36,'+a+')';return'rgba(180,40,20,'+a+')';}addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}const vx=mx-pmx,vy=my-pmy;pmx=mx;pmy=my;spawn(mx,my,vx,vy);},{passive:true});function frame(){ctx.fillStyle='rgba(11,6,5,.22)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='lighter';for(let i=embers.length-1;i>=0;i-=1){const p=embers[i];p.x+=p.vx;p.y+=p.vy;p.vy-=.03;p.vx*=.96;p.vy*=.98;p.life-=p.decay;if(p.life<=.02){embers.splice(i,1);continue;}const a=Math.max(0,Math.min(1,p.life)),r=p.r*(.6+p.life*.7),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,fireColor(p.life,.85*a));g.addColorStop(.5,fireColor(p.life*.7,.35*a));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();}ctx.restore();requestAnimationFrame(frame);}frame();`,
      }),
      'neon-streak': () => ({
        style: `body{margin:0;min-height:100vh;background:${bg};cursor:crosshair;overflow:hidden}canvas{position:fixed;inset:0;pointer-events:none}.hint{position:fixed;inset:0;display:grid;place-items:center;color:${accent};font-family:system-ui,sans-serif;font-size:.82rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.38;pointer-events:none}`,
        body: '<p class="hint" id="hint">Move your cursor</p><canvas id="c" aria-hidden="true"></canvas>',
        script: `const canvas=document.getElementById('c'),ctx=canvas.getContext('2d'),hint=document.getElementById('hint'),SEGMENTS=34,pts=[];let mx=innerWidth/2,my=innerHeight/2,px=mx,py=my,moved=false;function resize(){canvas.width=innerWidth;canvas.height=innerHeight;}resize();addEventListener('resize',resize);for(let i=0;i<SEGMENTS;i+=1)pts.push({x:mx,y:my});addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(!moved){moved=true;hint.style.opacity='0';}},{passive:true});function tick(){const vx=mx-px,vy=my-py,speed=Math.min(60,Math.hypot(vx,vy));px=mx;py=my;pts[0].x+=(mx-pts[0].x)*.46;pts[0].y+=(my-pts[0].y)*.46;for(let i=1;i<pts.length;i+=1){const prev=pts[i-1],curr=pts[i],ease=.30-i*.003;curr.x+=(prev.x-curr.x)*ease;curr.y+=(prev.y-curr.y)*ease;}ctx.fillStyle='rgba(0,0,0,.14)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.globalCompositeOperation='lighter';const head=pts[0],tail=pts[pts.length-1],g=ctx.createLinearGradient(tail.x,tail.y,head.x,head.y);g.addColorStop(0,'rgba(167,139,250,0)');g.addColorStop(.35,'rgba(167,139,250,.25)');g.addColorStop(1,'rgba(167,139,250,.95)');ctx.strokeStyle=g;ctx.lineCap='round';ctx.lineJoin='round';const base=10+speed*.12;ctx.lineWidth=base*1.6;ctx.shadowBlur=28;ctx.shadowColor='rgba(167,139,250,.9)';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i+=1)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();ctx.shadowBlur=12;ctx.shadowColor='rgba(255,255,255,.7)';ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=Math.max(2,base*.55);ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i+=1)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();ctx.restore();requestAnimationFrame(tick);}tick();`,
      }),
    };
    if (trails[desc]) return trails[desc]();
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text};cursor:crosshair}#t{position:fixed;pointer-events:none;font-size:.8rem;color:${accent};opacity:.8}`,
      body: '<div id="t"></div>',
      script: `const t=document.getElementById('t');addEventListener('mousemove',e=>{t.style.left=e.clientX+12+'px';t.style.top=e.clientY+12+'px';t.textContent='${desc} ${n}';});`,
    };
  }

  if (cat === 'mouse-effects') {
    if (desc === 'parallax-image') return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};overflow:hidden}.img{width:min(80vw,500px);aspect-ratio:16/9;border-radius:12px;overflow:hidden;transition:transform .1s;border:2px solid ${accent}}`,
      body: `<div class="img" id="i"><img src="${M.IMG169}" style="width:100%;height:100%;object-fit:cover"></div>`,
      script: `const i=document.getElementById('i');i.parentElement.addEventListener('mousemove',e=>{const r=i.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;i.style.transform='translate('+x*${n*2}+'px,'+y*${n*2}+'px)';});`,
    };
    if (desc === 'video-spotlight') return {
      style: `body{margin:0;min-height:100vh;background:#000;overflow:hidden;cursor:none}.wrap{position:fixed;inset:0}video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.spot{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle ${80+n*10}px at var(--x,50%) var(--y,50%),transparent 0%,rgba(0,0,0,.92) 100%)}`,
      body: `<div class="wrap"><video src="${M.VID169}" autoplay muted loop playsinline></video><div class="spot" id="s"></div></div>`,
      script: `const s=document.getElementById('s');let tx=innerWidth/2,ty=innerHeight/2,cx=tx,cy=ty;addEventListener('mousemove',e=>{tx=e.clientX;ty=e.clientY;},{passive:true});function tick(){cx+=(tx-cx)*.12;cy+=(ty-cy)*.12;s.style.setProperty('--x',cx+'px');s.style.setProperty('--y',cy+'px');requestAnimationFrame(tick);}s.style.setProperty('--x',cx+'px');s.style.setProperty('--y',cy+'px');tick();`,
    };
    if (desc === 'button-glow-follow') return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.btn{position:relative;padding:16px 40px;border:1px solid ${muted};border-radius:12px;background:${surface};color:${text};font-weight:600;overflow:hidden;cursor:pointer;--on:0}.btn::before{content:'';position:absolute;left:var(--x,50%);top:var(--y,50%);width:180px;height:180px;transform:translate(-50%,-50%);background:radial-gradient(circle,${accent}88 0%,transparent 70%);opacity:var(--on);transition:opacity .15s;pointer-events:none}.btn span{position:relative;z-index:1}`,
      body: `<button class="btn" id="b" type="button"><span>${titleCase(desc)} ${n}</span></button>`,
      script: `const b=document.getElementById('b');b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();b.style.setProperty('--x',(e.clientX-r.left)+'px');b.style.setProperty('--y',(e.clientY-r.top)+'px');b.style.setProperty('--on','1');});b.addEventListener('mouseleave',()=>b.style.setProperty('--on','0'));`,
    };
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text}}.zone{width:min(90vw,400px);padding:2rem;border-radius:16px;background:${surface};border:1px solid ${muted};transition:transform .15s}`,
      body: `<div class="zone" id="z"><h2 style="color:${accent}">${titleCase(desc)} ${n}</h2><p style="color:${muted};margin-top:.5rem">Move mouse to interact</p></div>`,
      script: `const z=document.getElementById('z');addEventListener('mousemove',e=>{const x=(e.clientX/innerWidth-.5)*${n*3};const y=(e.clientY/innerHeight-.5)*${n*3};z.style.transform='perspective(600px) rotateY('+x+'deg) rotateX('+(-y)+'deg)';});`,
    };
  }

  if (cat === 'buttons') {
    const styles = {
      'glow-outline': `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:14px 36px;border:2px solid ${accent};border-radius:99px;background:transparent;color:${accent};font-weight:600;box-shadow:0 0 20px ${accent}44;cursor:pointer;transition:all .3s}.btn:hover{background:${accent};color:${bg};box-shadow:0 0 40px ${accent}88`,
      'gradient-fill': `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:16px 40px;border:none;border-radius:12px;background:linear-gradient(135deg,${accent},${muted});color:#fff;font-weight:700;cursor:pointer;transition:transform .2s}.btn:hover{transform:translateY(-2px)`,
      'loading-button': `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:14px 32px;border:none;border-radius:8px;background:${accent};color:${bg};font-weight:600;cursor:pointer;min-width:140px}.spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}`,
      'press-3d': `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:16px 36px;border:none;border-radius:10px;background:${accent};color:${bg};font-weight:700;box-shadow:0 6px 0 ${muted};cursor:pointer;transition:transform .1s,box-shadow .1s}.btn:active{transform:translateY(4px);box-shadow:0 2px 0 ${muted}`,
      'ripple-btn': `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{position:relative;padding:14px 32px;border:none;border-radius:8px;background:${accent};color:${bg};font-weight:600;cursor:pointer;overflow:hidden}`,
    };
    const st = styles[desc] || `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:14px 28px;border:none;border-radius:${4+n*2}px;background:${accent};color:${bg};font-weight:600;cursor:pointer;transition:all .2s}.btn:hover{filter:brightness(1.1);transform:scale(1.02)`;
    if (desc === 'loading-button') return {
      style: st, body: `<button class="btn" id="b">Submit ${n}</button>`,
      script: `document.getElementById('b').onclick=function(){this.innerHTML='<span class="spin"></span>';setTimeout(()=>this.textContent='Done!',1500);};`,
    };
    if (desc === 'ripple-btn') return {
      style: st, body: `<button class="btn" id="b">${titleCase(desc)} ${n}</button>`,
      script: `document.getElementById('b').onclick=function(e){const r=document.createElement('span');r.style.cssText='position:absolute;border-radius:50%;background:rgba(255,255,255,.4);width:20px;height:20px;left:'+(e.offsetX-10)+'px;top:'+(e.offsetY-10)+'px;animation:rip .6s forwards';this.appendChild(r);setTimeout(()=>r.remove(),600);};const s=document.createElement('style');s.textContent='@keyframes rip{to{transform:scale(8);opacity:0}}';document.head.appendChild(s);`,
    };
    return { style: st, body: `<button class="btn">${titleCase(desc)} ${n}</button>` };
  }

  if (cat === 'cards') {
  return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.card{width:min(90vw,320px);padding:1.5rem;border-radius:${8+n*2}px;background:${surface};color:${text};border:1px solid ${muted}33;box-shadow:0 ${4+n*2}px ${20+n*4}px rgba(0,0,0,.12);transition:transform .3s,box-shadow .3s}.card:hover{transform:translateY(-${4+n}px);box-shadow:0 ${12+n*2}px ${30+n*4}px rgba(0,0,0,.18)}${desc.includes('image')?'.card img{width:100%;border-radius:8px;margin-bottom:1rem;aspect-ratio:16/9;object-fit:cover}':''}`,
      body: desc.includes('image') ? `<div class="card"><img src="${M.IMG169}" alt=""><h3 style="color:${accent}">${titleCase(desc)} ${n}</h3><p style="color:${muted};font-size:.9rem;margin-top:.5rem">Card variant with media</p></div>` : `<div class="card"><h3 style="color:${accent}">${titleCase(desc)} ${n}</h3><p style="color:${muted};font-size:.9rem;margin-top:.5rem">Interactive card preset</p></div>`,
    };
  }

  if (cat === 'galleries' || cat === 'images' || cat === 'videos') {
    if (embedRecipes[desc]) return embedRecipes[desc]();
    const isVid = cat === 'videos' || desc.includes('video');
    return {
      style: `body{margin:0;min-height:100vh;background:${bg};padding:2rem;color:${text}}.grid{display:grid;grid-template-columns:repeat(${2+(n%3)},1fr);gap:${8+n}px;max-width:900px;margin:0 auto}${isVid?'video{width:100%;border-radius:8px;aspect-ratio:16/9;object-fit:cover}':'img{width:100%;border-radius:8px;aspect-ratio:16/9;object-fit:cover;transition:transform .3s}img:hover{transform:scale(1.03)'}`,
      body: `<h2 style="text-align:center;margin-bottom:1.5rem;color:${accent}">${titleCase(desc)} ${n}</h2><div class="grid">${[0,1,2,3].map(()=>isVid?`<video src="${M.VID169}" muted loop playsinline onmouseenter="this.play()" onmouseleave="this.pause()"></video>`:`<img src="${M.IMG169}" alt="">`).join('')}</div>`,
    };
  }

  if (cat === 'carousels') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.carousel{position:relative;width:min(90vw,480px);overflow:hidden;border-radius:12px;border:2px solid ${accent}}.track{display:flex;transition:transform .4s;transform:translateX(calc(var(--i,0)*-100%))}.slide{min-width:100%}img{width:100%;aspect-ratio:16/9;object-fit:cover}.dots{display:flex;gap:8px;justify-content:center;margin-top:1rem}.dot{width:10px;height:10px;border-radius:50%;background:${muted};cursor:pointer;border:none}.dot.on{background:${accent}}`,
      body: `<div class="carousel"><div class="track" id="t">${[1,2,3].map(s=>`<div class="slide"><img src="${M.IMG169}" alt="Slide ${s}"></div>`).join('')}</div></div><div class="dots">${[0,1,2].map(j=>`<button class="dot${j===0?' on':''}" data-i="${j}"></button>`).join('')}</div>`,
      script: `let i=0;const t=document.getElementById('t');document.querySelectorAll('.dot').forEach(d=>d.onclick=()=>{i=+d.dataset.i;t.style.setProperty('--i',i);document.querySelectorAll('.dot').forEach(x=>x.classList.remove('on'));d.classList.add('on');});setInterval(()=>{i=(i+1)%3;t.style.setProperty('--i',i);document.querySelectorAll('.dot').forEach((d,j)=>d.classList.toggle('on',j===i));},${3000+n*200});`,
    };
  }

  if (cat === 'scroll-animations' || cat === 'image-scroll' || cat === 'rotate-scroll') {
    if (batch0437[desc]) return batch0437[desc]();
    return {
      style: `body{margin:0;min-height:100vh;background:${bg};color:${text}}.track{height:${200+n*20}vh}.sticky{position:sticky;top:0;height:100vh;display:grid;place-items:center;overflow:hidden}.box{width:min(80vw,400px);padding:2rem;background:${surface};border-radius:12px;border:1px solid ${accent};transform:translateY(var(--y,0)) rotate(var(--r,0deg));opacity:var(--o,1)}`,
      body: `<div class="track"><div class="sticky"><div class="box" id="b"><h2 style="color:${accent}">${titleCase(desc)} ${n}</h2><p style="color:${muted};margin-top:.5rem">Scroll to animate</p></div></div></div>`,
      script: `const tr=document.querySelector('.track'),b=document.getElementById('b');addEventListener('scroll',()=>{const r=tr.getBoundingClientRect();const p=Math.min(1,Math.max(0,-r.top/(r.height-innerHeight)));b.style.setProperty('--y',(-p*${40+n*5})+'px');b.style.setProperty('--r',(p*${n*30})+'deg');b.style.setProperty('--o',0.4+p*0.6);});`,
    };
  }

  if (cat === 'countdown') {
    if (countdownRecipes[desc]) return countdownRecipes[desc]();
  }

  if (cat === 'timers' || cat === 'countdown' || cat === 'numbers') {
    const isCountdown = cat === 'countdown';
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text}}.display{font-size:clamp(2.5rem,8vw,4rem);font-weight:900;color:${accent};font-variant-numeric:tabular-nums}.lbl{color:${muted};margin-top:.5rem;font-size:.9rem}.btn{margin-top:1.5rem;padding:10px 24px;border:none;border-radius:8px;background:${accent};color:${bg};cursor:pointer;font-weight:600}`,
      body: `<div style="text-align:center"><div class="display" id="d">${isCountdown?'00:30':'00:00'}</div><div class="lbl">${titleCase(desc)} ${n}</div><button class="btn" id="b">${isCountdown?'Start':'Run'}</button></div>`,
      script: isCountdown
        ? `let s=30,iv;document.getElementById('b').onclick=()=>{clearInterval(iv);iv=setInterval(()=>{s--;const m=String(Math.floor(s/60)).padStart(2,'0'),sec=String(s%60).padStart(2,'0');document.getElementById('d').textContent=m+':'+sec;if(s<=0)clearInterval(iv);},1000);};`
        : `let t=0,iv;document.getElementById('b').onclick=()=>{if(iv){clearInterval(iv);iv=null;document.getElementById('b').textContent='Run';return;}document.getElementById('b').textContent='Stop';iv=setInterval(()=>{t++;const m=String(Math.floor(t/60)).padStart(2,'0'),s=String(t%60).padStart(2,'0');document.getElementById('d').textContent=m+':'+s;},1000);};`,
    };
  }

  if (cat === 'toggles' || cat === 'checkboxes' || cat === 'accordions' || cat === 'tabs' || cat === 'dropdowns') {
    const interactive = cat === 'toggles' ? {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.sw{position:relative;width:52px;height:30px;background:${muted};border-radius:99px;cursor:pointer;transition:background .3s}.sw.on{background:${accent}}.knob{position:absolute;top:3px;left:3px;width:24px;height:24px;background:#fff;border-radius:50%;transition:transform .3s}.sw.on .knob{transform:translateX(22px)}label{color:${text};margin-right:1rem}`,
      body: `<label>${titleCase(desc)} ${n}</label><div class="sw" id="s"><div class="knob"></div></div>`,
      script: `document.getElementById('s').onclick=function(){this.classList.toggle('on');};`,
    } : cat === 'accordions' ? {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.acc{max-width:400px;width:100%;border:1px solid ${muted}44;border-radius:12px;overflow:hidden}.head{padding:1rem;cursor:pointer;font-weight:600;color:${text};background:${surface};display:flex;justify-content:space-between}.body{max-height:0;overflow:hidden;transition:max-height .3s}.body.open{max-height:120px}.body p{padding:0 1rem 1rem;color:${muted};font-size:.9rem}`,
      body: `<div class="acc">${[1,2].map(q=>`<div><div class="head" data-h>Question ${q}?<span>+</span></div><div class="body" data-b><p>Answer for ${titleCase(desc)} variant ${n}</p></div></div>`).join('')}</div>`,
      script: `document.querySelectorAll('[data-h]').forEach(h=>h.onclick=()=>h.nextElementSibling.classList.toggle('open'));`,
    } : cat === 'tabs' ? {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.tabs{display:flex;gap:4px;background:${surface};padding:4px;border-radius:12px}.tab{padding:10px 20px;border:none;background:transparent;color:${muted};border-radius:8px;cursor:pointer;font-size:.9rem}.tab.on{background:${accent};color:${bg};font-weight:600}.panel{margin-top:1rem;color:${text}}`,
      body: `<div><div class="tabs">${['A','B','C'].map((t,j)=>`<button class="tab${j===0?' on':''}">${t}</button>`).join('')}</div><div class="panel" id="p">Tab A — ${titleCase(desc)} ${n}</div></div>`,
      script: `document.querySelectorAll('.tab').forEach((t,i)=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on');document.getElementById('p').textContent='Tab '+t.textContent+' — ${titleCase(desc)} ${n}';});`,
    } : {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.dd{position:relative}.btn{padding:10px 20px;border:1px solid ${muted};border-radius:8px;background:${surface};color:${text};cursor:pointer}.menu{position:absolute;top:calc(100% + 4px);left:0;min-width:160px;background:${surface};border:1px solid ${muted}44;border-radius:8px;display:none;overflow:hidden;z-index:5}.menu.open{display:block}.opt{padding:10px 16px;color:${text};cursor:pointer;font-size:.9rem}.opt:hover{background:${accent}22}`,
      body: `<div class="dd"><button class="btn" id="b">${titleCase(desc)} ${n} ▾</button><div class="menu" id="m">${['One','Two','Three'].map(o=>`<div class="opt">${o}</div>`).join('')}</div></div>`,
      script: `const b=document.getElementById('b'),m=document.getElementById('m');b.onclick=e=>{e.stopPropagation();m.classList.toggle('open');};document.onclick=()=>m.classList.remove('open');`,
    };
    return interactive;
  }

  if (cat === 'tooltips') {
    if (tipRecipes[desc]) return tipRecipes[desc]();
  }

  if (cat === 'modals' || cat === 'dialogs' || cat === 'toasts' || cat === 'popovers' || cat === 'tooltips') {
    const isToast = cat === 'toasts';
    const isTip = cat === 'tooltips';
    if (isTip) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.wrap{position:relative}.btn{padding:10px 24px;background:${accent};color:${bg};border:none;border-radius:8px;cursor:pointer}.tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:${surface};color:${text};padding:8px 14px;border-radius:8px;font-size:.8rem;white-space:nowrap;opacity:0;transition:opacity .2s;border:1px solid ${accent}}.wrap:hover .tip{opacity:1}`,
      body: `<div class="wrap"><button class="btn">Hover ${n}</button><div class="tip">${titleCase(desc)} tip</div></div>`,
    };
    if (isToast) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:10px 24px;background:${accent};color:${bg};border:none;border-radius:8px;cursor:pointer}.toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(100px);background:${surface};color:${text};padding:12px 24px;border-radius:99px;border:1px solid ${accent};opacity:0;transition:all .3s;z-index:10}.toast.show{transform:translateX(-50%);opacity:1}`,
      body: `<button class="btn" id="b">Show Toast</button><div class="toast" id="t">${titleCase(desc)} ${n}</div>`,
      script: `document.getElementById('b').onclick=()=>{const t=document.getElementById('t');t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);};`,
    };
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.btn{padding:10px 24px;background:${accent};color:${bg};border:none;border-radius:8px;cursor:pointer}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;place-items:center;z-index:10}.overlay.open{display:grid}.dlg{background:${surface};color:${text};border-radius:16px;padding:2rem;width:min(90vw,360px);border:1px solid ${accent}}`,
      body: `<button class="btn" id="o">Open</button><div class="overlay" id="ov"><div class="dlg"><h3>${titleCase(desc)} ${n}</h3><p style="color:${muted};margin:1rem 0;font-size:.9rem">Dialog content here</p><button class="btn" id="c">Close</button></div></div>`,
      script: `document.getElementById('o').onclick=()=>document.getElementById('ov').classList.add('open');document.getElementById('c').onclick=()=>document.getElementById('ov').classList.remove('open');`,
    };
  }

  if (cat === 'effects' && desc === 'glass-card' && batch0437['glass-card']) {
    return batch0437['glass-card']();
  }

  if (cat === 'backgrounds') {
    if (bgRecipes[desc]) return bgRecipes[desc]();
  }

  if (cat === 'backgrounds' || cat === 'effects' || cat === 'brutalist') {
    const brutal = cat === 'brutalist';
    return {
      style: brutal
        ? `body{display:grid;place-items:center;min-height:100vh;background:${n%2?'#ff0':'#fff'}}.box{padding:3rem;border:4px solid #000;box-shadow:${8+n}px ${8+n}px 0 #000;font-family:monospace;max-width:400px;background:${n%3?'#0ff':'#f0f'}}h1{font-size:2.5rem;text-transform:uppercase;font-weight:900`
        : `body{display:grid;place-items:center;min-height:100vh;background:${bg};position:relative;overflow:hidden}.bg{position:fixed;inset:0;background:${desc.includes('mesh')||desc.includes('gradient')?`radial-gradient(circle at ${20+n*5}% ${30+n*3}%,${accent}44,transparent),radial-gradient(circle at ${70+n*2}% ${60+n*4}%,${muted}33,transparent),${bg}`:desc.includes('grid')?`linear-gradient(${accent}11 1px,transparent 1px),linear-gradient(90deg,${accent}11 1px,transparent 1px),${bg}`:`${bg}`};background-size:${desc.includes('grid')?'40px 40px':'100% 100%'}}.content{position:relative;z-index:1;color:${text};text-align:center;padding:2rem}`,
      body: brutal
        ? `<div class="box"><h1>${titleCase(desc)}</h1><p>Variant ${n}</p></div>`
        : `<div class="bg"></div><div class="content"><h1 style="font-size:2rem;font-weight:800;color:${accent}">${titleCase(desc)} ${n}</h1><p style="color:${muted};margin-top:.5rem">Background preset</p></div>`,
    };
  }

  if (cat === 'experimental') {
    const ex = {
      'text-scramble': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text}}h1{font-size:3rem;font-weight:900;letter-spacing:.05em;color:${accent}`,
        body: `<h1 id="h">${titleCase(desc)}</h1>`,
        script: `const h=document.getElementById('h'),orig='${titleCase(desc)} ${n}',chars='!@#$%^&*';let f=0;setInterval(()=>{h.textContent=orig.split('').map((c,i)=>i<f?c:chars[Math.floor(Math.random()*chars.length)]).join('');if(f++>orig.length)f=0;},80);`,
      }),
      'blob-morph': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.blob{width:200px;height:200px;background:${accent};border-radius:30% 70% 70% 30%/30% 30% 70% 70%;animation:morph ${4+n}s ease-in-out infinite}@keyframes morph{50%{border-radius:70% 30% 30% 70%/70% 70% 30% 30%}}`,
        body: '<div class="blob"></div>',
      }),
      'glitch-text': () => ({
        style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}h1{font-size:4rem;font-weight:900;color:${text};position:relative}h1::before,h1::after{content:attr(data-t);position:absolute;inset:0}h1::before{color:${accent};animation:gl1 .3s infinite}h1::after{color:#f0f;animation:gl2 .3s infinite}@keyframes gl1{0%,100%{clip-path:inset(0 0 80% 0);transform:translate(-2px)}50%{clip-path:inset(20% 0 40% 0);transform:translate(2px)}}@keyframes gl2{0%,100%{clip-path:inset(60% 0 0 0);transform:translate(2px)}50%{clip-path:inset(10% 0 50% 0);transform:translate(-2px)}}`,
        body: `<h1 data-t="GLITCH ${n}">GLITCH ${n}</h1>`,
      }),
      'matrix-rain': () => ({
        style: `body{margin:0;background:#000;overflow:hidden}canvas{display:block`,
        body: '<canvas id="c"></canvas>',
        script: `const c=document.getElementById('c'),x=c.getContext('2d');c.width=innerWidth;c.height=innerHeight;const cols=Math.floor(c.width/14),y=Array(cols).fill(0);function d(){x.fillStyle='rgba(0,0,0,.05)';x.fillRect(0,0,c.width,c.height);x.fillStyle='#0f0';x.font='14px monospace';y.forEach((v,i)=>{x.fillText(String.fromCharCode(0x30A0+Math.random()*96),i*14,v);if(v>c.height&&Math.random()>.975)y[i]=0;y[i]+=14;});requestAnimationFrame(d);}d();`,
      }),
    };
    if (ex[desc]) return ex[desc]();
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text}}.fx{font-size:2.5rem;font-weight:900;color:${accent};animation:fx ${2+n*.2}s ease-in-out infinite alternate}@keyframes fx{to{transform:scale(1.05) rotate(${n}deg);filter:hue-rotate(${n*20}deg)}}`,
      body: `<div class="fx">${titleCase(desc)} ${n}</div>`,
    };
  }

  if (cat === 'forms' || cat === 'auth' || cat === 'inputs' || cat === 'textareas' || cat === 'selects' || cat === 'sliders' || cat === 'file-uploads' || cat === 'date-pickers') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.form{background:${surface};padding:2rem;border-radius:16px;width:min(90vw,340px);border:1px solid ${muted}33;color:${text}}h2{margin-bottom:1.25rem;font-size:1.3rem;color:${accent}}.field{margin-bottom:1rem}.field input,.field textarea,.field select{width:100%;padding:12px;border:1px solid ${muted}55;border-radius:8px;background:${bg};color:${text};font-size:.95rem;box-sizing:border-box}.btn{width:100%;padding:12px;background:${accent};color:${bg};border:none;border-radius:8px;font-weight:600;cursor:pointer;margin-top:.5rem}`,
      body: `<form class="form"><h2>${titleCase(desc)} ${n}</h2><div class="field"><input placeholder="Email" type="email"></div><div class="field"><input placeholder="Password" type="password"></div><button class="btn" type="button">Submit</button></form>`,
    };
  }

  if (cat === 'tables' || cat === 'pagination') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;color:${text}}table{width:min(90vw,500px);border-collapse:collapse;background:${surface};border-radius:12px;overflow:hidden}th,td{padding:12px 16px;text-align:left;border-bottom:1px solid ${muted}33}th{background:${accent}22;color:${accent};font-size:.85rem}.pages{display:flex;gap:6px;margin-top:1rem}.pg{padding:8px 12px;border:1px solid ${muted}55;border-radius:6px;cursor:pointer;font-size:.85rem}.pg.on{background:${accent};color:${bg};border-color:${accent}}`,
      body: cat === 'pagination'
        ? `<div class="pages">${[1,2,3,4,5].map(j=>`<span class="pg${j===((n%5)+1)?' on':''}">${j}</span>`).join('')}</div>`
        : `<table><thead><tr><th>Name</th><th>Status</th><th>Value</th></tr></thead><tbody>${[1,2,3].map(r=>`<tr><td>Item ${r}</td><td style="color:${accent}">Active</td><td>${r*100}</td></tr>`).join('')}</tbody></table>`,
    };
  }

  if (cat === 'ai-chat') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.chat{width:min(90vw,380px);background:${surface};border-radius:16px;border:1px solid ${muted}33;overflow:hidden}.msgs{padding:1rem;display:flex;flex-direction:column;gap:8px;max-height:280px}.msg{max-width:80%;padding:10px 14px;border-radius:12px;font-size:.9rem}.bot{background:${accent}22;color:${text};align-self:flex-start}.user{background:${accent};color:${bg};align-self:flex-end}.input{display:flex;gap:8px;padding:12px;border-top:1px solid ${muted}33}input{flex:1;padding:10px;border:1px solid ${muted}55;border-radius:8px;background:${bg};color:${text}}button{padding:10px 16px;border:none;border-radius:8px;background:${accent};color:${bg};cursor:pointer}`,
      body: `<div class="chat"><div class="msgs"><div class="msg bot">Hello! How can I help?</div><div class="msg user">Show me ${titleCase(desc)} ${n}</div><div class="msg bot">Here is your preset variant.</div></div><div class="input"><input placeholder="Type a message…"><button>Send</button></div></div>`,
    };
  }

  if (cat === 'calendars' || cat === 'maps') {
    if (embedRecipes[desc]) return embedRecipes[desc]();
    if (cat === 'maps') return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;color:${text}}.map{width:min(90vw,480px);border-radius:12px;overflow:hidden;border:2px solid ${accent}}img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}.pin{position:absolute;width:16px;height:16px;background:${accent};border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3)}`,
      body: `<div style="position:relative" class="map"><img src="${M.IMG169}" alt="Map"><div class="pin" style="top:${20+n*3}%;left:${30+n*2}%"></div></div><p style="margin-top:1rem;color:${muted};text-align:center">${titleCase(desc)} ${n}</p>`,
    };
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;color:${text}}.cal{width:min(90vw,300px);border:1px solid ${muted}44;border-radius:12px;overflow:hidden;background:${surface}}.head{padding:12px;text-align:center;font-weight:600;background:${accent}22;color:${accent}}.grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:.8rem}.dow{padding:8px 4px;color:${muted};font-weight:600}.day{padding:8px 4px;cursor:pointer;border-radius:6px;margin:2px}.day:hover{background:${accent}22}.day.sel{background:${accent};color:${bg}}`,
      body: `<div class="cal"><div class="head">July 2026 — ${titleCase(desc)} ${n}</div><div class="grid"><div class="dow">S</div><div class="dow">M</div><div class="dow">T</div><div class="dow">W</div><div class="dow">T</div><div class="dow">F</div><div class="dow">S</div>${Array.from({length:30},(_,j)=>`<div class="day${j===5?' sel':''}">${j+1}</div>`).join('')}</div></div>`,
      script: `document.querySelectorAll('.day').forEach(d=>d.onclick=()=>{document.querySelectorAll('.day').forEach(x=>x.classList.remove('sel'));d.classList.add('sel');});`,
    };
  }

  if (cat === 'loaders') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.loader{width:48px;height:48px;border:4px solid ${muted}44;border-top-color:${accent};border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.lbl{color:${text};margin-top:1rem;font-size:.9rem}`,
      body: `<div style="text-align:center"><div class="loader"></div><div class="lbl">${titleCase(desc)} ${n}</div></div>`,
    };
  }

  if (cat === 'cta') {
    if (ctaRecipes[desc]) return ctaRecipes[desc]();
  }

  if (cat === 'pricing' || cat === 'comparisons') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;color:${text}}.grid{display:grid;grid-template-columns:repeat(${cat==='pricing'?3:2},1fr);gap:1rem;max-width:700px}.card{padding:1.5rem;border-radius:12px;background:${surface};border:1px solid ${muted}33;text-align:center}.card.feat{border-color:${accent};box-shadow:0 0 0 2px ${accent}44}.price{font-size:2rem;font-weight:900;color:${accent};margin:.75rem 0}.btn{padding:10px 20px;border:none;border-radius:8px;background:${accent};color:${bg};cursor:pointer;font-weight:600;margin-top:.75rem}`,
      body: `<div class="grid">${['Basic','Pro','Team'].slice(0,cat==='pricing'?3:2).map((t,j)=>`<div class="card${j===1?' feat':''}"><h3>${t}</h3><div class="price">$${(j+1)*9}</div><p style="color:${muted};font-size:.85rem">${titleCase(desc)} ${n}</p><button class="btn">Choose</button></div>`).join('')}</div>`,
    };
  }

  if (cat === 'testimonials' || cat === 'clients' || cat === 'bios' || cat === 'profiles') {
    const hasImg = desc.includes('avatar') || desc.includes('image') || desc.includes('video');
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;color:${text}}.card{max-width:400px;padding:1.5rem;background:${surface};border-radius:16px;border:1px solid ${muted}33;text-align:center}${hasImg?`.av{width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 1rem;border:2px solid ${accent}`:''}.quote{font-style:italic;color:${muted};line-height:1.5}.name{margin-top:1rem;font-weight:600;color:${accent}}`,
      body: `<div class="card">${hasImg?`<img class="av" src="${M.IMG45}" alt="">`:''}<p class="quote">"${titleCase(desc)} variant ${n} — great experience working together."</p><div class="name">Alex Morgan</div></div>`,
    };
  }

  if (cat === 'split-screens') {
    return {
      style: `body{margin:0;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;background:${bg}}.left{display:grid;place-items:center;padding:2rem;color:${text};background:${surface}}.right{overflow:hidden}img,video{width:100%;height:100vh;object-fit:cover}h1{font-size:2.5rem;font-weight:800;color:${accent}}`,
      body: `<div class="left"><h1>${titleCase(desc)} ${n}</h1></div><div class="right">${n%3===0?`<video src="${M.VID169}" autoplay muted loop playsinline></video>`:`<img src="${M.IMG169}" alt="">`}</div>`,
    };
  }

  if (cat === 'card-shuffles' || cat === 'puzzles') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.stack{position:relative;width:200px;height:140px}.card{position:absolute;inset:0;border-radius:12px;background:${surface};border:2px solid ${accent};display:grid;place-items:center;color:${text};font-weight:700;cursor:pointer;transition:transform .3s}.card:nth-child(1){transform:translate(0,0) rotate(-2deg)}.card:nth-child(2){transform:translate(${6+n}px,${6+n}px) rotate(1deg)}.card:nth-child(3){transform:translate(${12+n*2}px,${12+n*2}px) rotate(3deg)}`,
      body: `<div class="stack" id="s">${[1,2,3].map(c=>`<div class="card">${c}</div>`).join('')}</div><p style="color:${muted};margin-top:1.5rem;font-size:.85rem">${titleCase(desc)} ${n} — click to shuffle</p>`,
      script: `document.getElementById('s').onclick=()=>{document.querySelectorAll('.card').forEach(c=>{const x=(Math.random()-.5)*40,y=(Math.random()-.5)*20,r=(Math.random()-.5)*20;c.style.transform='translate('+x+'px,'+y+'px) rotate('+r+'deg)';});};`,
    };
  }

  if (cat === 'navigation') {
    if (navRecipes[desc]) return navRecipes[desc]();
    return {
      style: `body{margin:0;min-height:100vh;background:#fff;color:#111;font-family:system-ui,-apple-system,sans-serif}nav{display:flex;gap:1.5rem;padding:1rem 2rem;background:#fff;border-bottom:1px solid #e8e8e8;align-items:center}.logo{font-weight:800;color:#000}nav a{color:#666;text-decoration:none;font-size:.9rem}nav a:hover{color:#000}.cta{margin-left:auto;padding:8px 18px;background:#000;color:#fff;border-radius:8px;text-decoration:none;font-size:.85rem;font-weight:600}`,
      body: `<nav><span class="logo">Brand</span><a href="#">Home</a><a href="#">Products</a><a href="#">About</a><a class="cta" href="#">${titleCase(desc)}</a></nav><main style="padding:3rem 2rem;color:#444"><h1>${titleCase(desc)}</h1></main>`,
    };
  }

  if (cat === 'menus' || cat === 'docks' || cat === 'sidebars' || cat === 'scroll-areas' || cat === 'announcements') {
    const isDock = cat === 'docks';
    const isSidebar = cat === 'sidebars';
    if (isSidebar) return {
      style: `body{margin:0;min-height:100vh;display:flex;background:${bg}}.sb{width:200px;background:${surface};color:${text};padding:1.5rem 1rem;border-right:1px solid ${muted}33}.sb a{display:block;padding:10px;color:${muted};text-decoration:none;font-size:.9rem;border-radius:6px}.sb a:hover,.sb a.on{background:${accent}22;color:${accent}}.main{flex:1;padding:2rem;color:${text}}`,
      body: `<aside class="sb">${['Dashboard','Projects','Settings','Help'].map((l,j)=>`<a href="#" class="${j===0?'on':''}">${l}</a>`).join('')}</aside><main class="main"><h2 style="color:${accent}">${titleCase(desc)} ${n}</h2></main>`,
      script: `document.querySelectorAll('.sb a').forEach(a=>a.onclick=e=>{e.preventDefault();document.querySelectorAll('.sb a').forEach(x=>x.classList.remove('on'));a.classList.add('on');});`,
    };
    if (isDock) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};align-items:flex-end;padding-bottom:2rem}.dock{display:flex;gap:${6+n}px;padding:8px 16px;background:${surface};border-radius:16px;border:1px solid ${muted}44}.icon{width:${40+n}px;height:${40+n}px;border-radius:10px;background:linear-gradient(135deg,${accent},${muted});transition:transform .2s;cursor:pointer}.icon:hover{transform:scale(1.2) translateY(-6px)}`,
      body: `<div class="dock">${Array(5).fill('<div class="icon"></div>').join('')}</div>`,
    };
    return {
      style: `body{margin:0;min-height:100vh;background:${bg}}nav{display:flex;gap:1.5rem;padding:1rem 2rem;background:${surface};border-bottom:1px solid ${muted}33;align-items:center;color:${text}}.logo{font-weight:800;color:${accent}}nav a{color:${muted};text-decoration:none;font-size:.9rem}nav a:hover{color:${accent}}.cta{margin-left:auto;padding:8px 18px;background:${accent};color:${bg};border-radius:8px;text-decoration:none;font-size:.85rem;font-weight:600}`,
      body: `<nav><span class="logo">Brand</span><a href="#">Home</a><a href="#">Products</a><a href="#">About</a><a class="cta" href="#">${titleCase(desc)} ${n}</a></nav><main style="padding:3rem 2rem;color:${text}"><h1 style="color:${accent}">Page Content</h1></main>`,
    };
  }

  if (cat === 'borders') {
    if (borderRecipes[desc]) return borderRecipes[desc]();
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem}.box{width:240px;height:160px;display:grid;place-items:center;color:${text};font-weight:600;border-radius:8px;background:${surface};${desc.includes('gradient')?`border:3px solid transparent;background-clip:padding-box;border-image:linear-gradient(135deg,${accent},${muted}) 1`:desc.includes('dashed')?`border:3px dashed ${accent}`:desc.includes('double')?`border:6px double ${accent}`:desc.includes('animated')?`border:3px solid ${accent};animation:borderPulse 2s infinite`:desc.includes('glow')?`border:2px solid ${accent};box-shadow:0 0 20px ${accent},inset 0 0 20px ${accent}44`:`border:${2+n}px solid ${accent}`}}${desc.includes('animated')?'@keyframes borderPulse{50%{border-color:'+muted+'}}':''}`,
      body: `<div class="box">${titleCase(desc)} ${n}</div>`,
    };
  }

  if (cat === 'tags') {
    const key = desc === 'colored-tags' ? 'color-tags' : desc;
    if (tagRecipes[key]) return tagRecipes[key]();
  }

  if (cat === 'badges' || cat === 'avatars' || cat === 'tags' || cat === 'icons' || cat === 'links' || cat === 'notifications' || cat === 'alerts' || cat === 'errors' || cat === 'empty-states' || cat === 'hooks' || cat === 'features' || cat === 'footers' || cat === 'sections' || cat === 'folder-dropdown' || cat === 'radio-groups' || cat === 'checkboxes') {
    const isBadge = cat === 'badges' || cat === 'tags';
    const isAvatar = cat === 'avatars';
    const isEmpty = cat === 'empty-states';
    const isError = cat === 'errors';
    const isFooter = cat === 'footers';
    if (isFooter) return {
      style: `body{margin:0;min-height:100vh;display:flex;align-items:flex-end;background:${bg}}footer{width:100%;padding:2rem;background:${surface};color:${text};display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${muted}33;font-size:.85rem}footer a{color:${muted};text-decoration:none;margin-left:1rem}footer a:hover{color:${accent}}`,
      body: `<footer><span>© 2026 Brand — ${titleCase(desc)} ${n}</span><div><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div></footer>`,
    };
    if (isEmpty) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;text-align:center;color:${text}}.ico{font-size:3rem;margin-bottom:1rem;opacity:.5}h2{font-size:1.5rem;margin-bottom:.5rem;color:${accent}}p{color:${muted};font-size:.9rem;max-width:32ch}.btn{margin-top:1.5rem;padding:10px 24px;background:${accent};color:${bg};border:none;border-radius:8px;cursor:pointer;font-weight:600}`,
      body: `<div><div class="ico">📭</div><h2>Nothing here</h2><p>${titleCase(desc)} empty state variant ${n}</p><button class="btn">Add item</button></div>`,
    };
    if (isError) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;text-align:center;color:${text}}.code{font-size:6rem;font-weight:900;color:${accent};line-height:1}h1{margin:1rem 0 .5rem}p{color:${muted}}.btn{margin-top:1.5rem;padding:10px 24px;background:${accent};color:${bg};border:none;border-radius:8px;cursor:pointer}`,
      body: `<div><div class="code">${40+n}</div><h1>${titleCase(desc)}</h1><p>Variant ${n} — something went wrong</p><button class="btn">Go home</button></div>`,
    };
    if (isAvatar) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.group{display:flex;gap:0}.av{width:${48+n*2}px;height:${48+n*2}px;border-radius:50%;border:3px solid ${bg};margin-left:-12px;object-fit:cover;background:${accent}}.av:first-child{margin-left:0}`,
      body: `<div class="group">${[1,2,3,4].map(()=>`<img class="av" src="${M.IMG45}" alt="">`).join('')}</div><p style="color:${muted};margin-top:1rem;font-size:.85rem">${titleCase(desc)} ${n}</p>`,
    };
    if (isBadge) return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg}}.row{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.badge{padding:6px 14px;border-radius:99px;font-size:.8rem;font-weight:600;border:1px solid ${accent};color:${accent};background:${accent}15}`,
      body: `<div class="row">${['New','Beta','Sale','Hot','Pro'].slice(0,3+(n%3)).map(t=>`<span class="badge">${t}</span>`).join('')}</div>`,
    };
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};padding:2rem;color:${text}}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;max-width:400px}.item{padding:1rem;background:${surface};border-radius:10px;border:1px solid ${muted}33;text-align:center;font-size:.9rem}.item span{font-size:1.5rem;display:block;margin-bottom:.5rem;color:${accent}}`,
      body: `<div class="grid">${['⚡','🔒','🎨','📊','✉','⚙'].slice(0,3+(n%3)).map(e=>`<div class="item"><span>${e}</span>${titleCase(desc)}</div>`).join('')}</div>`,
    };
  }

  if (cat === 'ease-in') {
    return {
      style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};gap:12px}.item{opacity:0;transform:translateY(24px);animation:up .6s forwards;padding:12px 24px;background:${surface};color:${text};border-radius:8px;border:1px solid ${accent}44}.item:nth-child(1){animation-delay:.1s}.item:nth-child(2){animation-delay:.2s}.item:nth-child(3){animation-delay:.3s}@keyframes up{to{opacity:1;transform:translateY(0)}}`,
      body: [1,2,3].map(x=>`<div class="item">${titleCase(desc)} ${x}</div>`).join(''),
    };
  }

  // Default fallback — still visually distinct per variant index
  return {
    style: `body{display:grid;place-items:center;min-height:100vh;background:${bg};color:${text};padding:2rem;text-align:center}.box{padding:2rem;border-radius:${8+n*2}px;background:${surface};border:2px solid ${accent};max-width:400px;box-shadow:0 ${4+n*2}px ${16+n*4}px ${accent}22}h2{font-size:1.8rem;font-weight:800;color:${accent};margin-bottom:.5rem}p{color:${muted};font-size:.95rem}`,
    body: `<div class="box"><h2>${titleCase(desc)} ${n}</h2><p>${titleCase(cat)} preset — variant ${n}</p></div>`,
  };

}

function buildMegaRecipes() {
  const recipes = [];
  let globalIdx = 0;
  for (const cat of CATEGORIES) {
    const count = VARIANTS_14.has(cat) ? 14 : 13;
    const descs = DESCRIPTORS[cat];
    for (let i = 0; i < count; i++) {
      const desc = descs[i];
      const series = i + 1;
      const titleBase = titleCase(desc);
      const idx = globalIdx;
      recipes.push({
        category: cat,
        slug: slug(cat, desc, series),
        title: titleBase + ' ' + pad2(series),
        tags: [cat, desc.split('-')[0] || 'ui'],
        build() {
          return buildVariant(cat, desc, idx + series);
        },
      });
      globalIdx++;
    }
  }
  return recipes;
}

module.exports = buildMegaRecipes;
