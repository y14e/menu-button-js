class Menu {
  constructor(root, options) {
    this.root = root;
    this.defaults = {
      selector: {
        button: '[data-menu-button]',
        list: '[role="menu"]',
        item: '[role="menuitem"]',
      },
    };
    this.settings = {
      selector: { ...this.defaults.selector, ...options?.selector },
    };
    const NOT_NESTED = `:not(:scope ${this.settings.selector.item} *)`;
    this.button = this.root.querySelector(`${this.settings.selector.button}${NOT_NESTED}`);
    this.list = this.root.querySelector(`${this.settings.selector.list}${NOT_NESTED}`);
    this.items = this.root.querySelectorAll(`${this.settings.selector.item}${NOT_NESTED}`);
    if (!this.list || !this.items.length) return;
    this.itemsByInitial = {};
    this.initialize();
  }

  initialize() {
    if (this.button) {
      document.addEventListener('mousedown', event => {
        if (!this.root.contains(event.target)) this.close();
      });
      this.root.addEventListener('focusout', event => this.handleFocusOut(event));
      const id = Math.random().toString(36).slice(-8);
      this.button.setAttribute('id', this.button.getAttribute('id') || `menu-button-${id}`);
      this.list.setAttribute('id', this.list.getAttribute('id') || `menu-list-${id}`);
      this.button.setAttribute('aria-controls', this.list.getAttribute('id'));
      this.button.setAttribute('aria-expanded', 'false');
      this.button.setAttribute('aria-haspopup', 'true');
      this.button.setAttribute('tabindex', '0');
      this.button.addEventListener('click', event => this.handleClick(event));
      this.button.addEventListener('keydown', event => this.handleButtonKeyDown(event));
      this.list.setAttribute('aria-labelledby', this.button.getAttribute('id'));
    } else {
      this.root.addEventListener('focusout', event => {
        if (!this.root.contains(event.relatedTarget)) this.resetTabIndex();
      });
    }
    this.list.addEventListener('keydown', event => this.handleListKeyDown(event));
    this.items.forEach(item => {
      const initial = item.textContent.trim().charAt(0).toLowerCase();
      if (/[a-z]/.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemsByInitial[initial] ||= []).push(item);
      }
    });
    this.resetTabIndex();
  }

  toggle(isOpen) {
    if (!this.button || (this.button.getAttribute('aria-expanded') === 'true') === isOpen) return;
    this.button.setAttribute('aria-expanded', String(isOpen));
  }

  resetTabIndex() {
    this.items.forEach(item => item.removeAttribute('tabindex'));
    this.items.forEach(item => item.setAttribute('tabindex', this.isFocusable(item) && [...this.items].filter(this.isFocusable).findIndex(item => item.getAttribute('tabindex') === '0') === -1 ? '0' : '-1'));
  }

  isFocusable(element) {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  handleFocusOut(event) {
    if (!this.button || this.button.getAttribute('aria-expanded') !== 'true') return;
    const focused = event.relatedTarget;
    if (focused && !this.root.contains(focused)) this.close();
  }

  handleClick(event) {
    event.preventDefault();
    const isOpen = this.button.getAttribute('aria-expanded') === 'true';
    this.toggle(!isOpen);
    const focusables = [...this.items].filter(this.isFocusable);
    if (!focusables.length) return;
    if (!isOpen) window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[0].focus()));
  }

  handleButtonKeyDown(event) {
    const { key } = event;
    if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (!['Escape'].includes(key)) {
      this.open();
      const focusables = [...this.items].filter(this.isFocusable);
      if (!focusables.length) return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[key !== 'ArrowUp' ? 0 : focusables.length - 1].focus()));
      return;
    }
    this.close();
  }

  handleListKeyDown(event) {
    const { key, shiftKey } = event;
    if (!this.button && shiftKey && key === 'Tab') return;
    const isAlpha = value => /^[a-z]$/i.test(value);
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]?.filter(this.isFocusable).length))) return;
    event.preventDefault();
    const active = document.activeElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    const focusables = [...this.items].filter(this.isFocusable);
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
      if (!this.button) {
        focusables[currentIndex].setAttribute('tabindex', '-1');
        focusables[newIndex].setAttribute('tabindex', '0');
      }
      focusables[newIndex].focus();
      return;
    }
    if (['Tab', 'Escape'].includes(key)) {
      this.close();
      return;
    }
    const focusablesByInitial = this.itemsByInitial[key.toLowerCase()].filter(this.isFocusable);
    const index = focusablesByInitial.findIndex(item => focusables.indexOf(item) > focusables.indexOf(active));
    focusablesByInitial[index !== -1 ? index : 0].focus();
  }

  open() {
    this.toggle(true);
  }

  close() {
    this.toggle(false);
    if (this.button && this.root.contains(document.activeElement)) this.button.focus();
  }
}

export default Menu;
