(() => {
  const selector = 'html[data-style-screen="store-product"] .store-product-copy .store-field > select';

  function enhance(select) {
    if (!(select instanceof HTMLSelectElement) || select.dataset.customOptions === 'true') return;
    select.dataset.customOptions = 'true';
    select.classList.add('product-option-native');

    const list = document.createElement('div');
    list.className = 'product-option-list';
    list.setAttribute('role', 'radiogroup');
    list.setAttribute('aria-label', 'Product option');

    const sync = () => {
      [...list.querySelectorAll('button')].forEach(button => {
        const active = button.dataset.value === select.value;
        button.classList.toggle('active', active);
        button.setAttribute('aria-checked', String(active));
      });
    };

    [...select.options].filter(option => option.value).forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'product-option-choice';
      button.dataset.value = option.value;
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');

      const parts = option.textContent.split(' – ');
      const inventory = document.createElement('span');
      inventory.className = 'product-option-inventory';
      inventory.textContent = parts[0] || option.textContent;
      button.appendChild(inventory);

      if (parts.length > 1) {
        const color = document.createElement('span');
        color.className = 'product-option-color';
        color.textContent = parts.slice(1).join(' – ');
        button.appendChild(color);
      }

      button.addEventListener('click', () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        setter?.call(select, option.value);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      });
      list.appendChild(button);
    });

    select.insertAdjacentElement('afterend', list);
    select.addEventListener('change', sync);
    sync();
  }

  function scan() {
    document.querySelectorAll(selector).forEach(enhance);
  }

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();