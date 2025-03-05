class Menu {
  constructor(root, options) {
    this.root = root;
    this.defaults = {
      selector: {
        trigger: '[data-menu-trigger]',
        list: '[role="menu"]',
        item: '[role="menuitem"]',
      },
    };
    this.settings = {
      selector: { ...this.defaults.selector, ...options?.selector },
    };
    const NOT_NESTED = `:not(:scope ${this.settings.selector.item} *)`;
    this.trigger = this.root.querySelector(`${this.settings.selector.trigger}${NOT_NESTED}`);
    this.list = this.root.querySelector(`${this.settings.selector.list}${NOT_NESTED}`);
    this.items = this.root.querySelectorAll(`${this.settings.selector.item}${NOT_NESTED}`);
    if (!this.trigger || !this.list || !this.items.length) return;
    this.itemsByInitial = {};
    this.initialize();
  }

  initialize() {
    document.addEventListener('mousedown', event => {
      if (!this.root.contains(event.target) && this.trigger.getAttribute('aria-expanded') === 'true') this.close();
    });
    this.root.addEventListener('focusout', event => this.handleFocusOut(event));
    const id = Math.random().toString(36).slice(-8);
    this.trigger.setAttribute('id', this.trigger.getAttribute('id') || `menu-trigger-${id}`);
    this.list.setAttribute('id', this.list.getAttribute('id') || `menu-list-${id}`);
    this.trigger.setAttribute('aria-controls', this.list.getAttribute('id'));
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'true');
    this.trigger.setAttribute('tabindex', '0');
    this.trigger.addEventListener('click', event => this.handleClick(event));
    this.trigger.addEventListener('keydown', event => this.handleTriggerKeyDown(event));
    this.list.setAttribute('aria-labelledby', this.trigger.getAttribute('id'));
    this.list.addEventListener('keydown', event => this.handleListKeyDown(event));
    this.items.forEach(item => {
      const initial = item.textContent.trim().charAt(0).toLowerCase();
      if (/[a-z]/.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemsByInitial[initial] ||= []).push(item);
      }
      item.setAttribute('tabindex', '-1');
    });
  }

  toggle(isOpen) {
    if ((this.trigger.getAttribute('aria-expanded') === 'true') === isOpen) return;
    this.trigger.setAttribute('aria-expanded', String(isOpen));
  }

  handleFocusOut(event) {
    if (this.trigger.getAttribute('aria-expanded') !== 'true') return;
    const target = event.relatedTarget;
    if (target && !this.root.contains(target)) {
      this.close();
      return;
    }
  }

  handleClick(event) {
    event.preventDefault();
    const isOpen = this.trigger.getAttribute('aria-expanded') === 'true';
    this.toggle(!isOpen);
    if (!isOpen) window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.items[0].focus()));
  }

  handleTriggerKeyDown(event) {
    const { key } = event;
    if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (!['Escape'].includes(key)) {
      this.open();
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.items[key !== 'ArrowUp' ? 0 : this.items.length - 1].focus()));
      return;
    }
    this.close();
  }

  handleListKeyDown(event) {
    const { key, shiftKey } = event;
    const isAlpha = value => /^[a-z]$/i.test(value);
    const isFocusable = element => element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]?.filter(isFocusable).length))) return;
    event.preventDefault();
    const active = document.activeElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    const focusables = [...this.items].filter(isFocusable);
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      const currentIndex = focusables.indexOf(active);
      const length = focusables.length;
      let newIndex = currentIndex;
      switch (key) {
        case 'ArrowUp':
          newIndex = (currentIndex - 1 + length) % length;
          break;
        case 'ArrowDown':
          newIndex = (currentIndex + 1) % length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = length - 1;
          break;
      }
      focusables[newIndex].focus();
      return;
    }
    if (isAlpha(key)) {
      const focusablesByInitial = this.itemsByInitial[key.toLowerCase()].filter(isFocusable);
      const index = focusablesByInitial.findIndex(item => focusables.indexOf(item) > focusables.indexOf(active));
      focusablesByInitial[index !== -1 ? index : 0].focus();
      return;
    }
    this.close();
  }

  open() {
    this.toggle(true);
  }

  close() {
    this.toggle(false);
    if (this.root.contains(document.activeElement)) this.trigger.focus();
  }
}

export default Menu;
