export function $(selector) {
  return document.querySelector(selector);
}

export function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

export function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}
