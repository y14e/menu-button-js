class MenuButton {
  constructor(root, options) {
    this.root = root;
    this.defaults = {
      selector: {
        trigger: '[data-menu-button-trigger]',
        menu: '[role="menu"]',
        item: '[role="menuitem"]',
      },
    };
    this.settings = {
      selector: { ...this.defaults.selector, ...options?.selector },
    };
    const NOT_NESTED = `:not(:scope ${this.settings.selector.item} *)`;
    this.trigger = this.root.querySelector(`${this.settings.selector.trigger}${NOT_NESTED}`);
    this.menu = this.root.querySelector(`${this.settings.selector.menu}${NOT_NESTED}`);
    this.items = this.root.querySelectorAll(`${this.settings.selector.item}${NOT_NESTED}`);
    this.itemsByInitial = {};
    [...this.items].forEach(item => {
      const initial = item.textContent.trim().charAt(0).toLowerCase();
      if (/[a-z]/i.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemsByInitial[initial] ||= []).push(item);
      }
    });
    this.initialize();
  }

  initialize() {
    this.root.addEventListener('focusout', event => this.handleFocusOut(event));
    const id = Math.random().toString(16).slice(2, 8).padEnd(6, '0');
    this.trigger.setAttribute('id', this.trigger.getAttribute('id') || `menu-button-trigger-${id}`);
    this.menu.setAttribute('id', this.menu.getAttribute('id') || `menu-button-menu-${id}`);
    this.trigger.setAttribute('aria-controls', this.menu.getAttribute('id'));
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-haspopup', 'true');
    this.trigger.addEventListener('click', event => this.handleClick(event));
    this.trigger.addEventListener('keydown', event => this.handleTriggerKeyDown(event));
    this.menu.setAttribute('aria-labelledby', this.trigger.getAttribute('id'));
    this.menu.addEventListener('keydown', event => this.handleMenuKeyDown(event));
    this.items.forEach(item => item.setAttribute('tabindex', '-1'));
  }

  handleFocusOut(event) {
    if (!this.root.contains(event.relatedTarget)) this.toggle(false);
  }

  handleClick(event) {
    event.preventDefault();
    this.toggle(this.trigger.getAttribute('aria-expanded') !== 'true');
    if (this.trigger.getAttribute('aria-expanded') === 'true') this.items[0].focus();
  }

  handleTriggerKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (['ArrowUp', 'ArrowDown'].includes(key)) {
      this.toggle(true);
      this.items[key === 'ArrowUp' ? this.items.length - 1 : 0].focus();
      return;
    }
    this.toggle(false);
  }

  handleMenuKeyDown(event) {
    const { key } = event;
    const isAlpha = value => /^[a-z]$/i.test(value);
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (event.shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]))) return;
    event.preventDefault();
    const active = document.activeElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      const focusables = [...this.items].filter(items => items.getAttribute('aria-disabled') !== 'true' && !items.hasAttribute('disabled'));
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
      const focusablesByInitial = this.itemsByInitial[key.toLowerCase()].filter(items => items.getAttribute('aria-disabled') !== 'true' && !items.hasAttribute('disabled'));
      const focusables = [...this.items].filter(items => items.getAttribute('aria-disabled') !== 'true' && !items.hasAttribute('disabled'));
      const index = focusablesByInitial.findIndex(item => focusables.indexOf(item) > focusables.indexOf(document.activeElement));
      focusablesByInitial[index !== -1 ? index : 0].focus();
      return;
    }
    this.toggle(false);
    this.trigger.focus();
  }

  toggle(isOpen) {
    this.trigger.setAttribute('aria-expanded', String(isOpen));
  }
}

export default MenuButton;
