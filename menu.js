class Menu {
  static hasOpen = {};

  constructor(root, options) {
    this.root = root;
    if (this.root.hasAttribute('data-menu-name')) this.name = this.root.getAttribute('data-menu-name') || '';
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
    if (this.name) Menu.hasOpen[this.name] ||= false;
    this.initialize();
  }

  initialize() {
    document.addEventListener('mousedown', event => {
      if (!this.root.contains(event.target)) this.handleOutsideMouseDown();
    });
    this.root.addEventListener('focusout', event => this.handleRootFocusOut(event));
    if (this.button) {
      const id = Math.random().toString(36).slice(-8);
      this.button.setAttribute('id', this.button.getAttribute('id') || `menu-button-${id}`);
      this.list.setAttribute('id', this.list.getAttribute('id') || `menu-list-${id}`);
      this.button.setAttribute('aria-controls', this.list.getAttribute('id'));
      this.button.setAttribute('aria-expanded', 'false');
      this.button.setAttribute('aria-haspopup', 'true');
      this.button.setAttribute('tabindex', '0');
      this.button.addEventListener('pointerover', event => this.handleButtonPointerOver(event));
      this.button.addEventListener('click', event => this.handleButtonClick(event));
      this.button.addEventListener('keydown', event => this.handleButtonKeyDown(event));
      this.list.setAttribute('aria-labelledby', this.button.getAttribute('id'));
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
    if (this.name) Menu.hasOpen[this.name] = isOpen;
    this.button.setAttribute('aria-expanded', String(isOpen));
  }

  resetTabIndex() {
    this.items.forEach(item => item.removeAttribute('tabindex'));
    this.items.forEach(item => item.setAttribute('tabindex', this.isNonDisabled(item) && [...this.items].filter(this.isNonDisabled).findIndex(item => item.getAttribute('tabindex') === '0') === -1 ? '0' : '-1'));
  }

  isNonDisabled(element) {
    return element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled');
  }

  handleOutsideMouseDown() {
    if (!this.button) return;
    this.close();
  }

  handleRootFocusOut(event) {
    if (this.button && this.button.getAttribute('aria-expanded') !== 'true') return;
    if (!this.root.contains(event.relatedTarget)) {
      if (this.button) {
        this.close();
      } else {
        this.resetTabIndex();
      }
    }
  }

  handleButtonPointerOver(event) {
    if (event.pointerType !== 'mouse') return;
    if (this.name && Menu.hasOpen[this.name]) {
      this.button.focus();
      this.open();
    }
  }

  handleButtonClick(event) {
    event.preventDefault();
    const isOpen = this.button.getAttribute('aria-expanded') === 'true';
    this.toggle(!isOpen);
    const focusables = [...this.items].filter(this.isNonDisabled);
    if (!focusables.length) return;
    if (!isOpen) window.requestAnimationFrame(() => window.requestAnimationFrame(() => focusables[0].focus()));
  }

  handleButtonKeyDown(event) {
    const { key } = event;
    if (![' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(key)) return;
    event.preventDefault();
    if (!['Escape'].includes(key)) {
      this.open();
      const focusables = [...this.items].filter(this.isNonDisabled);
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
    if (!([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(key) || (shiftKey && key === 'Tab') || (isAlpha(key) && this.itemsByInitial[key.toLowerCase()]?.filter(this.isNonDisabled).length))) return;
    event.preventDefault();
    const active = document.activeElement;
    if ([' ', 'Enter'].includes(key)) {
      active.click();
      return;
    }
    const nonDisabledItems = [...this.items].filter(this.isNonDisabled);
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) {
      const currentIndex = nonDisabledItems.indexOf(active);
      const length = nonDisabledItems.length;
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
        nonDisabledItems[currentIndex].setAttribute('tabindex', '-1');
        nonDisabledItems[newIndex].setAttribute('tabindex', '0');
      }
      nonDisabledItems[newIndex].focus();
      return;
    }
    if (['Tab', 'Escape'].includes(key)) {
      this.close();
      return;
    }
    const nonDisabledItemsByInitial = this.itemsByInitial[key.toLowerCase()].filter(this.isNonDisabled);
    const index = nonDisabledItemsByInitial.findIndex(item => nonDisabledItems.indexOf(item) > nonDisabledItems.indexOf(active));
    nonDisabledItemsByInitial[index !== -1 ? index : 0].focus();
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
