const button = document.querySelector('.menu-button');
const nav = document.querySelector('.site-nav');

if (button && nav) {
  const closeMenu = () => {
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
  };
  button.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      button.focus();
    }
  });
}

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const copyEmail = document.querySelector('[data-copy-email]');
const copyStatus = document.querySelector('.copy-status');
if (copyEmail && copyStatus) {
  copyEmail.hidden = false;
  copyEmail.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('support@bytesandbricks.co.uk');
      copyStatus.textContent = 'Email address copied.';
    } catch {
      copyStatus.textContent = 'Automatic copying is unavailable. Select and copy the address below.';
      let field = document.querySelector('[data-email-manual]');
      if (!field) {
        field = document.createElement('input');
        field.type = 'text';
        field.readOnly = true;
        field.value = 'support@bytesandbricks.co.uk';
        field.setAttribute('aria-label', 'Email address to copy manually');
        field.setAttribute('data-email-manual', '');
        copyStatus.after(field);
      }
      field.focus();
      field.select();
    }
  });
}
