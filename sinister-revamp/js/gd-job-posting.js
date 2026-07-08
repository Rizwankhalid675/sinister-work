/*

Glendale Designs Custom Programming
for Sinister Diesel
Ticket: 39441229
Allowed Domains: sinisterdiesel.com

GD Job Posting

Copyright Glendale Designs - Our optimizations are not freeware.
Do not use, copy or distribute without written permission. 
Ask us, we're nice! support@glendaledesigns.com

TERMS OF SERVICE
https://glendaledesigns.com/terms-of-service/
(Make sure to read and understand this section 'Non-Exclusive License to Customer')
  

GDPM - v01.00.00D Customized for Sinister Diesel

*/


const HARDCODED_BENEFITS_PERKS = [
  {
    "value": "Competitive salary based on experience"
  },
  {
    "value": "Comprehensive benefits package including medical, dental, and vision insurance"
  },
  {
    "value": "Paid time off and holiday pay"
  },
  {
    "value": "401(k) retirement plan"
  },
  {
    "value": "Employee discount program"
  },
  {
    "value": "Opportunities for advancement within a growing company"
  },
  {
    "value": "Supportive, team-focused work environment"
  }
];


class GD_JobPosting extends HTMLElement {
  #data = null;
  #jobs = [];
  #styles = null;

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Icons ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */
  #icons = {
    marker: `
      <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path fill="currentColor" d="M286 444 430 92q7-19-7-35-16-14-35-7L36 194q-23 11-19 36 6 24 30 26h176v176q2 25 27 31 25 4 36-19z" />
      </svg>
    `,
    dollar: `
      <svg aria-hidden="true" viewBox="0 0 320 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path fill="currentColor" d="M160 0v0q-14 0-23 9t-9 23v35q-22 2-42 10-25 9-44 28-18 19-24 48-6 32 6 59 14 26 36 40 20 12 43 20 24 9 46 14l3 1q48 12 73 27 10 7 13 13 3 5 1 21-2 18-27 28-27 12-76 6-16-3-37-9-22-6-39-13-12-5-24-1-11 5-17 17-5 13-1 25 5 12 17 18 21 9 47 16 25 7 45 10v0q0-1 1 0 0 0 0 0v35q0 14 9 23t23 9 23-9 9-23v-33q24-3 44-11 25-10 43-30 17-19 23-48 6-31-6-58-14-26-36-40-20-12-43-20-24-9-46-14l-3-1q-48-12-73-26-10-8-13-14-3-5-1-20 2-18 28-28 29-12 78-5 2 0 4 0 10 2 24 4t21 4q13 3 24-3 11-7 15-20 3-13-4-24t-19-15q-11-2-29-5-17-3-26-5-1 0-2 0t-3 0V32q0-14-9-23v0q-9-9-23-9z" />
      </svg>
    `,
    clock: `
      <svg aria-hidden="true" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path fill="currentColor" d="M256 0h-1q-53 0-99 20T75 75L41 41q-13-11-26-5Q1 41 0 58v110q2 22 24 24h110q17-1 22-15 6-14-5-26l-31-31q54-54 136-56 82 2 136 56t56 136q-2 82-56 136t-136 56q-62-1-110-34-11-8-24-6-12 3-20 14t-5 23q2 12 13 21 63 45 146 46 72-1 129-35 58-34 92-92 34-57 35-129-1-72-35-129v0q-34-58-92-92v0Q328 1 256 0zM256 128v0q-22 2-24 24v104q0 10 7 16l72 72q17 15 33 0 15-16 0-33l-64-65v-94q-2-22-24-24z" />
      </svg>
    `,
    person: `
      <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path fill="currentColor" d="M224 256q-54-1-91-37-36-37-37-91 1-54 37-91 37-36 91-37 54 1 91 37 36 37 37 91-1 54-37 91v0q-37 36-91 37zM275 304q73 2 122 51t51 122q0 15-10 25t-25 10H35q-15 0-25-10T0 477q2-73 51-122t122-51z" />
      </svg>
    `,
    calendar: `
      <svg aria-hidden="true" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <path fill="currentColor" d="M96 32v32H48q-20 1-34 14Q1 92 0 112v48h448v-48q-1-20-14-34-14-13-34-14h-48V32q0-14-9-23t-23-9-23 9-9 23v32H160V32q0-14-9-23t-23-9-23 9v0q-9 9-9 23zM448 464V192H0v272q1 20 14 34 14 13 34 14h352q20-1 34-14v0q13-14 14-34z" />
      </svg>
    `,
    check: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 13l4 4L19 7" />
      </svg>
    `
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    this.shadowRoot.innerHTML = this.#getStyles();

    this.#data = await this.#getData();
    this.#jobs = this.#data.jobs.children || [];
    this.#styles = this.#data.styles;

    this.shadowRoot.innerHTML += this.#render();

    this.#bindEvents();
  }

  #bindEvents() {
    const toggleDetails = this.shadowRoot.querySelectorAll('[data-hook="toggle-details"]');

    toggleDetails.forEach(element => element.addEventListener('click', (event) => this.#onToggleDetails(element, event)));
  }

  #onToggleDetails(element, event) {
    const button = element.querySelector('[data-hook="toggle-details-button"]');
    const details = element.querySelector('[data-hook="details"]');

    if (!details) return;

    if (details.classList.toggle('is-open')) {
      button.textContent = this.#styles?.toggle_details_button?.value?.split('/')[1] || 'Hide Details';
    } else {
      button.textContent = this.#styles?.toggle_details_button?.value?.split('/')[0] || 'Show Details';
    }
  }

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Renderers ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

  #render() {
    return /*html*/`
      <div class="gd-job-posting" part="wrapper" style="display: none;">
        ${this.#renderJobList()}
      </div>
    `;
  }

  #renderJobList() {
    return /*html*/`
      <ul class="gd-job-posting__job-list" part="job-list">
        ${this.#jobs.map(job => this.#renderJobItem(job)).join('')}
      </ul>
    `;
  }

  #renderJobItem(job) {
    const jobId = job.id;
    const title = job.title.value;
    const titleTheme = this.#styles?.title_typography?.classname || '';
    const tags = job.tags.children;
    const jobLink = job.url.value;
    const jobLinkNewTab = job.url.new_tab;
    const details = job.details.children;
    const detailCount = details.length;
    const applyButtonText = this.#styles?.apply_button?.value || 'Apply Now';
    const applyButtonTheme = this.#styles?.apply_button?.textsettings?.fields?.normal?.button_theme?.classname || '';
    const toggleDetailsButtonText = this.#styles?.toggle_details_button?.value?.split('/')[0] || 'Show Details';
    const toggleDetailsButtonTheme = this.#styles?.toggle_details_button?.textsettings?.fields?.normal?.button_theme?.classname || '';

    return /*html*/`
      <li class="gd-job-posting__job-item" data-hook="toggle-details" part="job-item">
        <div class="gd-job-posting__job-header">
          <div class="gd-job-posting__job-title-section">
            <h3 class="gd-job-posting__job-title ${titleTheme}" part="job-title">${title}</h3>
            <ul class="gd-job-posting__tags" part="tags">
              ${tags.map(tag => this.#renderTag(tag)).join('')}
            </ul>
          </div>
          <div class="gd-job-posting__job-cta">
            ${detailCount > 0 ? `<button type="button" class="gd-job-posting__job-cta-item ${toggleDetailsButtonTheme}" data-hook="toggle-details-button" part="toggle-details">${toggleDetailsButtonText}</button>` : ''}
            <a href="${jobLink}" target="${jobLinkNewTab ? '_blank' : '_self'}" class="gd-job-posting__job-cta-item ${applyButtonTheme}" part="apply-button">${applyButtonText}</a>
          </div>
        </div>
        ${detailCount > 0 ? this.#renderDetails(jobId, details) : ''}
      </li>
    `;
  }

  #renderTag(tag) {
    const icon = this.#icons[tag.icon.value];
    const value = tag.value.value;

    return /*html*/`
      <li class="gd-job-posting__tag" part="tag">
        ${icon ? `<span class="gd-job-posting__tag-icon" part="tag-icon">${icon}</span>` : ''}
        <span class="gd-job-posting__tag-value" part="tag-value">${value}</span>
      </li>
    `;
  }

  #renderDetails(jobId, details) {
    return /*html*/`
      <div class="gd-job-posting__details" data-hook="details" part="details">
        ${details.map(detail => this.#renderDetail(jobId, detail)).join('')}
      </div>
    `;
  }

  #renderDetail(jobId, detail) {
    const type = detail.type.value;
    const title = detail.title.value;
    const detailId = detail.id;
    const titleTypography = detail.title.textsettings?.fields?.normal?.typography_theme?.classname || '';
    const markdown = detail.markdown?.value || '';
    const markdownTypography = detail.markdown.textsettings?.fields?.normal?.typography_theme?.classname || '';
    const fragment = detail.fragment?.value || '';
    const image = detail.image;
    const imageFull = detail.image_full;
    const imagePosition = detail.image_position.value;

    return /*html*/`
      <div class="gd-job-posting__detail" part="detail">
        ${title ? `<h4 class="gd-job-posting__detail-title ${titleTypography}" part="title">${title}</h4>` : ''}
        ${type === 'markdown-section' ? `<div class="gd-job-posting__detail-markdown ${markdownTypography}" part="markdown">${markdown}</div>` : ''}
        ${type === 'rich-text-section' ? `<slot class="gd-job-posting__detail-richtext" name="job--${jobId}--detail--${detailId}" part="richtext"></slot>` : ''}
        ${type === 'fragment' ? `<div class="gd-job-posting__detail-fragment" part="fragment">${fragment}</div>` : ''}
        ${type === 'benefits-perks-section' ? `
          <h4 class="gd-job-posting__detail-title gd-job-posting__detail-title--benefits-perks" part="title">Benefits & Perks</h4>
          <ul class="gd-job-posting__detail-benefits-perks">
            ${HARDCODED_BENEFITS_PERKS.map(benefitPerk => `<li class="gd-job-posting__detail-benefits-perk" part="benefits-perk">
              ${this.#icons.check}
              ${benefitPerk.value}
            </li>`).join('')}
          </ul>
        ` : ''}
        ${type === 'image-section' ? `<div class="gd-job-posting__detail-image ${imageFull.value ? 'is-full-width' : ''} ${imagePosition}">
          <picture>
            ${image.responsive_images?.mobile ? `<source srcset="${image.responsive_images.mobile}" media="(max-width: 39.999em)">` : ''}
            ${image.responsive_images?.tablet ? `<source srcset="${image.responsive_images.tablet}" media="(max-width: 59.999em)">` : ''}
            <img src="${image.image || 'https://placehold.co/600x400'}" alt="${image.alt}" width="${image.width}" height="${image.height}" part="image">
          </picture>
          </div>` : ''}
      </div>
    `;
  }

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Helpers ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ */

  /*
  * This is a workaround to get the data from the custom element after it's been rendered
  * MutationObserver is used to reliably wait for the script tag to be appended to the DOM
  */
  async #getData() {
    const script = document.querySelector(`#${this.id}__instance-data`);

    return script ? JSON.parse(script.textContent) : null;
  }

  #getStyles() {
    const template = document.querySelector('template.gd-job-posting');
    const themeGlobalStylesheet = document.querySelector('[data-resource-code="mm-theme-styles"]');
    const instanceTemplate = document.querySelector(`#${this.id}__instance-styles`);

    return /*html*/`
      ${themeGlobalStylesheet?.outerHTML || `<link rel="stylesheet" href="json.mvc?Store_Code=${mivaJS.Store_Code}&Function=CSSResource_Output&CSSResource_Code=mm-theme-styles">`}
      ${template?.innerHTML || ''}
      ${instanceTemplate?.innerHTML || ''}
      <style>
        :host {}
      </style>
    `;
  }
}

if (!customElements.get('gd-job-posting')) {
  customElements.define('gd-job-posting', GD_JobPosting);
}