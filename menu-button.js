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
    if (!this.trigger || !this.menu || !this.items.length) return;
    this.itemsByInitial = {};
    this.animation = Promise.resolve();
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
    this.items.forEach(item => {
      const initial = item.textContent.trim().charAt(0).toLowerCase();
      if (/[a-z]/.test(initial)) {
        item.setAttribute('aria-keyshortcuts', initial);
        (this.itemsByInitial[initial] ||= []).push(item);
      }
      item.setAttribute('tabindex', '-1');
    });
  }

  handleFocusOut(event) {
    const target = event.relatedTarget;
    if (target && !this.root.contains(target)) {
      this.toggle(false);
      return;
    }

    // Fix for WebKit
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active && !this.root.contains(active)) this.toggle(false);
    }, 100);
  }

  handleClick(event) {
    event.preventDefault();
    const isOpen = this.trigger.getAttribute('aria-expanded') !== 'true';
    this.toggle(isOpen);
    if (isOpen) {
      this.animation = this.animation.then(async () => {
        const animations = this.menu.getAnimations();
        if (animations.length) {
          try {
            await Promise.all(animations.map(animation => animation.finished));
          } catch (error) {}
        }
        this.items[0].focus();
      });
    }
  }

  handleTriggerKeyDown(event) {
    const { key } = event;
    if (!['ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (['ArrowUp', 'ArrowDown'].includes(key)) {
      this.animation = this.animation.then(async () => {
        this.toggle(true);
        const animations = this.menu.getAnimations();
        if (animations.length) {
          try {
            await Promise.all(animations.map(animation => animation.finished));
          } catch (error) {}
        }
        this.items[key === 'ArrowUp' ? this.items.length - 1 : 0].focus();
      });
      return;
    }
    this.toggle(false);
  }

  handleMenuKeyDown(event) {
    const { key } = event;
    const isAlpha = value => /^[a-z]$/i.test(value);
    const isFocusable = element => element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (event.shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]?.filter(isFocusable).length))) return;
    event.preventDefault();
    const active = document.activeElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      const focusables = [...this.items].filter(isFocusable);
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
      const focusables = [...this.items].filter(isFocusable);
      const index = focusablesByInitial.findIndex(item => focusables.indexOf(item) > focusables.indexOf(active));
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
